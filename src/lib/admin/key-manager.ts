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
  key?: string; // Plain text key (only returned for immediate display)
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

  // Send verification email (async, non-blocking)
  sendVerificationKeyEmail(email, plainKey, expiryMinutes).then((sent) => {
    if (!sent) {
      console.log("[Key] Email not sent - key displayed for development");
    }
  });

  console.log("Key generated and sent to email");

  return {
    success: true,
    message: `Verification key sent to ${email}`,
    key: plainKey, // Returned for development/testing
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

