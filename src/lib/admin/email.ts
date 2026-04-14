import { env } from "@/env";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using Resend API
 * Docs: https://resend.com/docs
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;

  console.log("[Email] API Key present:", !!apiKey);
  console.log("[Email] Sending to:", options.to);

  if (!apiKey) {
    console.log("[Email] RESEND_API_KEY not configured");
    return false;
  }

  try {
    console.log("[Email] Making request to Resend API...");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    console.log("[Email] Response status:", response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error("[Email] Resend API error:", error);
      return false;
    }

    const data = await response.json();
    console.log("[Email] Sent successfully:", data.id);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

/**
 * Send verification key email
 */
export async function sendVerificationKeyEmail(
  email: string,
  key: string,
  expiresIn = 10
): Promise<boolean> {
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

