import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "@/env";
import { db } from "@/server/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "sqlite", // or "sqlite" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    facebook: {
      clientId: env.BETTER_AUTH_FACEBOOK_CLIENT_ID as string,
      clientSecret: env.BETTER_AUTH_FACEBOOK_CLIENT_SECRET as string,
      redirectURI: "http://localhost:3000/api/auth/callback/facebook",
    },
  },
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session;
