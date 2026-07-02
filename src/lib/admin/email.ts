import "server-only";
import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";

import { env } from "@/env";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export type EmailSendResult =
  | { ok: true; id: string }
  | {
      ok: false;
      reason: "no_provider" | "api_error" | "network_error";
      detail?: string;
    };

/**
 * Build a Nodemailer transport from the generic SMTP_* env vars.
 *
 * Two auth modes are supported:
 *   - Username/password: SMTP_USER + SMTP_PASSWORD
 *   - OAuth2 (Gmail SMTP with a Workspace mailbox):
 *       SMTP_OAUTH_CLIENT_ID + SMTP_OAUTH_CLIENT_SECRET +
 *       SMTP_OAUTH_REFRESH_TOKEN + SMTP_OAUTH_USER
 *
 * If both are set, OAuth2 wins. If neither is set, the transport is created
 * without auth (useful for anonymous local relays).
 *
 * Transport is memoized at module scope so we don't re-handshake on every
 * send. SMTP_HOST is required to create the transport — callers without it
 * short-circuit before reaching this function.
 */
function createTransport(): Transporter {
  const host = env.SMTP_HOST;
  if (!host) {
    throw new Error("SMTP_HOST is required to create a transport");
  }

  const port = env.SMTP_PORT ?? 587;
  const secure = env.SMTP_SECURE ?? port === 465;

  const useOAuth2 = Boolean(
    env.SMTP_OAUTH_CLIENT_ID &&
      env.SMTP_OAUTH_CLIENT_SECRET &&
      env.SMTP_OAUTH_REFRESH_TOKEN &&
      env.SMTP_OAUTH_USER,
  );

  const auth = useOAuth2
    ? {
        type: "OAuth2" as const,
        user: env.SMTP_OAUTH_USER!,
        clientId: env.SMTP_OAUTH_CLIENT_ID!,
        clientSecret: env.SMTP_OAUTH_CLIENT_SECRET!,
        refreshToken: env.SMTP_OAUTH_REFRESH_TOKEN!,
      }
    : env.SMTP_USER && env.SMTP_PASSWORD
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
  });
}

let cachedTransport: Transporter | null = null;
function getTransport(): Transporter {
  cachedTransport ??= createTransport();
  return cachedTransport;
}

/**
 * Send email via SMTP using Nodemailer.
 *
 * Returns:
 *   { ok: true, id }                       — sent, messageId from the SMTP server
 *   { ok: false, reason: "no_provider" }   — SMTP_HOST (or SMTP_FROM) not configured
 *   { ok: false, reason: "api_error" }     — provider rejected the message
 *   { ok: false, reason: "network_error" } — socket/TLS/connection failure
 *
 * Note: SMTP_FROM must be on a domain the provider has verified you to send
 * from. Without verification, providers will reject with a 5xx error that
 * surfaces here as `api_error`.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailSendResult> {
  console.log("[Email] SMTP_HOST present:", !!env.SMTP_HOST);
  console.log("[Email] Sending to:", options.to);

  if (!env.SMTP_HOST) {
    console.log("[Email] SMTP_HOST not configured");
    return { ok: false, reason: "no_provider" };
  }

  if (!env.SMTP_FROM) {
    console.error("[Email] SMTP_FROM is required");
    return {
      ok: false,
      reason: "no_provider",
      detail: "SMTP_FROM is not configured",
    };
  }

  const mailOptions: SendMailOptions = {
    from: env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    console.log("[Email] Sending via SMTP...");
    const info = await getTransport().sendMail(mailOptions);
    console.log("[Email] Sent successfully:", info.messageId);
    return { ok: true, id: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Nodemailer populates `responseCode` for SMTP-level errors (4xx/5xx
    // replies from the server). Anything else is a transport-level failure
    // (DNS, TCP, TLS, timeout).
    const isServerReply =
      typeof (error as { responseCode?: unknown }).responseCode === "number";

    console.error(
      "[Email] Failed to send:",
      isServerReply ? "api_error" : "network_error",
      message,
    );

    return {
      ok: false,
      reason: isServerReply ? "api_error" : "network_error",
      detail: message,
    };
  }
}

/**
 * Send verification key email
 */
export async function sendVerificationKeyEmail(
  email: string,
  key: string,
  expiresIn = 10,
): Promise<EmailSendResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .key-box { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-family: monospace; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Admin Access</h1>
        </div>
        <div class="content">
          <p>Your verification key for portfolio admin access:</p>

          <div class="key-box">${key}</div>

          <p><strong>Valid for:</strong> ${expiresIn} minutes</p>

          <div class="warning">
            ⚠️ This key expires at ${new Date(Date.now() + expiresIn * 60 * 1000).toLocaleTimeString()}
          </div>

          <p>If you didn't request this key, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>Portfolio Admin System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Your Admin Verification Key - ${key}`,
    html,
  });
}