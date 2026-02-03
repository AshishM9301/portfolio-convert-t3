import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { db } from "@/server/db";

// Ensure base URL ends without trailing slash
const baseURL = (process.env.BETTER_AUTH_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "sqlite", // or "sqlite" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    facebook: {
      clientId: env.BETTER_AUTH_FACEBOOK_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_FACEBOOK_CLIENT_SECRET,
      redirectURI: `${baseURL}/api/auth/callback/facebook`,
    },
  },
  baseURL: baseURL,
  advanced: {
    cookiePrefix: "better-auth",
    // Allow state cookie to work across redirects
    cookieOptions: {
      sameSite: "lax",
    },
    // Disable automatic verification cleanup to prevent state deletion
    deleteExpiredVerification: false,
  },
});

export type Session = typeof auth.$Infer.Session;

