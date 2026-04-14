import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/env";
import { storeSession, deleteSession, type SessionData } from "./session-store";

// ============================================================================
// KEY GENERATION AND HASHING
// ============================================================================

export function generateSecureKey(length = 8): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  
  // Use crypto.randomBytes for cryptographically secure random
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const byte = randomBytes[i]!;
    const charIndex = byte % charset.length;
    result += charset[charIndex] ?? "";
  }
  
  return result;
}

export async function hashKey(key: string): Promise<string> {
  return bcrypt.hash(key, 12); // Cost factor of 12
}

export async function verifyKeyHash(
  key: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

// ============================================================================
// JWT TOKEN MANAGEMENT
// ============================================================================

export interface JwtPayload {
  email: string;
  ipAddress: string;
  userAgent: string;
  iat: number;
  exp: number;
}

export function generateJwtToken(
  email: string,
  ipAddress: string,
  userAgent: string
): { token: string; expiresAt: Date } {
  const expiresInSeconds = (env.SESSION_EXPIRY_HOURS || 1) * 3600;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const token = jwt.sign(
    {
      email,
      ipAddress,
      userAgent,
    },
    env.JWT_SECRET,
    {
      expiresIn: expiresInSeconds,
      issuer: "portfolio-admin",
      audience: "portfolio-admin",
    }
  );

  return { token, expiresAt };
}

export function verifyJwtToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: "portfolio-admin",
      audience: "portfolio-admin",
    }) as JwtPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

// ============================================================================
// ADMIN SESSION MANAGEMENT
// ============================================================================

export async function createAdminSession(
  email: string,
  ipAddress: string,
  userAgent: string
): Promise<{ token: string; expiresAt: Date }> {
  const { token, expiresAt } = generateJwtToken(email, ipAddress, userAgent);

  await storeSession(token, {
    email,
    ipAddress,
    userAgent,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  });

  return { token, expiresAt };
}

export async function destroyAdminSession(token: string): Promise<void> {
  await deleteSession(token);
}

// ============================================================================
// EMAIL AUTHORIZATION CHECK
// ============================================================================

export function isAuthorizedAdminEmail(email: string): boolean {
  const adminEmails = (env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());

  return adminEmails.includes(email.trim().toLowerCase());
}

