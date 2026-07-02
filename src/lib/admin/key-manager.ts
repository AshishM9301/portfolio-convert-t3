import { db } from "@/server/db";
import { env } from "@/env";
import {
  generateSecureKey,
  hashKey,
  isAuthorizedAdminEmail,
  verifyKeyHash,
} from "./auth";
import { sendVerificationKeyEmail } from "./email";
import bcrypt from "bcryptjs";

export interface KeyRequestResult {
  success: boolean;
  message: string;
  /** Plain text key. Only populated in development when email delivery
   *  fails or no provider is configured — never in production. */
  devKey?: string;
  /** Whether the email was actually delivered. */
  emailSent: boolean;
  expiresAt?: Date;
}

export interface KeyVerifyResult {
  success: boolean;
  message: string;
  token?: string;
  expiresAt?: Date;
  remainingAttempts?: number;
}

export async function createOneTimeKey(
  email: string,
  ipAddress: string
): Promise<KeyRequestResult> {
  // Validate email is authorized
  if (!isAuthorizedAdminEmail(email)) {
    return {
      success: false,
      message: "This email is not authorized for admin access",
      emailSent: false,
    };
  }

  // Check for existing unused keys
  const existingKey = await db.adminKey.findFirst({
    where: {
      email: email.toLowerCase(),
      isUsed: false,
      isBlocked: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingKey) {
    return {
      success: false,
      message: "A verification key is already active. Check your email or wait for it to expire.",
      emailSent: false,
    };
  }

  // Generate and hash key (uppercase for case-insensitive verification)
  const plainKey = generateSecureKey(8).toUpperCase();
  const hashedKey = await hashKey(plainKey);
  const expiryMinutes = 15;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Save the key to database
  await db.adminKey.create({
    data: {
      email: email.toLowerCase(),
      keyHash: hashedKey,
      expiresAt,
      maxAttempts: 3,
      attemptsUsed: 0,
      isUsed: false,
      isBlocked: false,
    },
  });

  // Send verification email — await so the caller knows the actual outcome.
  const sendResult = await sendVerificationKeyEmail(
    email,
    plainKey,
    expiryMinutes,
  );

  const isDev = env.NODE_ENV !== "production";
  const hasProvider = !!env.SMTP_HOST;

  // Structured log regardless of branch — single source of truth for ops.
  console.log("[Key] request outcome", {
    email: email.toLowerCase(),
    emailSent: sendResult.ok,
    reason: sendResult.ok ? undefined : sendResult.reason,
    detail: sendResult.ok ? undefined : sendResult.detail,
    nodeEnv: env.NODE_ENV,
    hasProvider,
  });

  if (sendResult.ok) {
    return {
      success: true,
      message: `Verification key sent to ${email}`,
      emailSent: true,
      expiresAt,
    };
  }

  // Send failed. In development, always return the key so the developer
  // can complete the flow locally without a working email provider.
  if (isDev) {
    return {
      success: true,
      message: hasProvider
        ? "Email send failed (dev mode — see server logs)"
        : "Verification key ready (dev mode — no email provider configured)",
      devKey: plainKey,
      emailSent: false,
      expiresAt,
    };
  }

  // Production: never leak the key. Tell the user the truth.
  const message = hasProvider
    ? "We couldn't send the email right now. Please try again in a moment."
    : "Email service is not configured. Please contact the site administrator.";
  return {
    success: false,
    message,
    emailSent: false,
    expiresAt,
  };
}

export async function verifyOneTimeKey(
  email: string,
  key: string,
  ipAddress: string,
  userAgent: string
): Promise<KeyVerifyResult> {
  // Find pending key
  const pendingKey = await db.adminKey.findFirst({
    where: {
      email: email.toLowerCase(),
      isUsed: false,
      isBlocked: false,

    },
    orderBy: { createdAt: "desc" },
  });



  if (!pendingKey) {
    return {
      success: false,
      message: "No active verification key found. Please request a new key.",
    };
  }

  // Increment attempts
  const attemptsUsed = pendingKey.attemptsUsed + 1;
  const isMaxAttemptsReached = attemptsUsed >= pendingKey.maxAttempts;

  await db.adminKey.update({
    where: { id: pendingKey.id },
    data: { attemptsUsed },
  });

  // Check max attempts
  if (isMaxAttemptsReached) {
    await db.adminKey.update({
      where: { id: pendingKey.id },
      data: { isBlocked: true },
    });

    return {
      success: false,
      message: "Maximum attempts exceeded. Please request a new key.",
      remainingAttempts: 0,
    };
  }


  // In verifyOneTimeKey, around line 143
  console.log("Submitted key:", JSON.stringify(key));
  console.log("Stored hash:", pendingKey.keyHash);
  // In verifyOneTimeKey, line 143
  const isValid = await verifyKeyHash(key.toUpperCase(), pendingKey.keyHash);

  console.log("isValid", isValid);

  if (!isValid) {
    return {
      success: false,
      message: "Invalid verification key",
      remainingAttempts: pendingKey.maxAttempts - attemptsUsed,
    };
  }

  // Mark key as used
  await db.adminKey.update({
    where: { id: pendingKey.id },
    data: { isUsed: true, usedAt: new Date() },
  });

  // Create session
  const { createAdminSession } = await import("./auth");
  const { token, expiresAt } = await createAdminSession(
    email.toLowerCase(),
    ipAddress,
    userAgent
  );

  return {
    success: true,
    message: "Verification successful",
    token,
    expiresAt,
  };
}

// ============================================================================
// KEY MANAGEMENT UTILITIES
// ============================================================================

export async function cleanupExpiredKeys(): Promise<number> {
  const result = await db.adminKey.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

export async function getPendingKeyCount(email: string): Promise<number> {
  const count = await db.adminKey.count({
    where: {
      email: email.toLowerCase(),
      isUsed: false,
      isBlocked: false,
      expiresAt: { gt: new Date() },
    },
  });
  return count;
}

