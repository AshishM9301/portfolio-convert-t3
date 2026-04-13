import { getRedis } from "@/server/db/redis";
import { env } from "@/env";

const SESSION_PREFIX = "session:";
const SESSION_TTL_SECONDS = 3600; // 1 hour

export interface SessionData {
  email: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastUsedAt: number;
}

export async function storeSession(
  token: string,
  session: SessionData
): Promise<void> {
  const redis = getRedis();
  await redis.set(
    `${SESSION_PREFIX}${token}`,
    JSON.stringify(session),
    { ex: SESSION_TTL_SECONDS }
  );
}

function parseSessionData(raw: unknown): SessionData | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as SessionData).email !== "string" ||
    typeof (value as SessionData).ipAddress !== "string" ||
    typeof (value as SessionData).userAgent !== "string"
  ) {
    return null;
  }
  return value as SessionData;
}

export async function getSession(token: string): Promise<SessionData | null> {
  const redis = getRedis();
  const raw = await redis.get(`${SESSION_PREFIX}${token}`);
  if (raw == null) return null;
  return parseSessionData(raw);
}

export async function deleteSession(token: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${SESSION_PREFIX}${token}`);
}

export async function refreshSession(token: string): Promise<boolean> {
  const session = await getSession(token);
  
  if (!session) return false;
  
  session.lastUsedAt = Date.now();
  await storeSession(token, session);
  return true;
}

export async function validateSession(
  token: string,
  ipAddress: string,
  userAgent: string
): Promise<SessionData | null> {
  const session = await getSession(token);

  if (!session) return null;
  
  // Normalize IP addresses for comparison (handles localhost variants)
  const normalizeIp = (ip: string): string => {
    if (!ip) return "unknown";
    if (ip === "::1" || ip === "127.0.0.1") return "localhost";
    if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
    return ip;
  };
  
  const storedIpNormalized = normalizeIp(session.ipAddress);
  const currentIpNormalized = normalizeIp(ipAddress);
  const ipMatch = storedIpNormalized === currentIpNormalized;
  const uaMatch = session.userAgent === userAgent;
  
  if (!ipMatch || !uaMatch) {
    // Log potential session hijacking attempt
    console.warn("Session validation failed - IP or User-Agent mismatch", {
      storedIP: session.ipAddress,
      currentIP: ipAddress,
      storedUA: session.userAgent,
      currentUA: userAgent,
    });
    
    // In production, block on mismatch; in development, allow with warning
    const isProduction = env.NODE_ENV === "production";
    if (isProduction) {
      await deleteSession(token);
      return null;
    }
  }
  
  return session;
}

