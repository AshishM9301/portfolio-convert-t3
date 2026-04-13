import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    // Better Auth (optional - only needed if using OAuth)
    BETTER_AUTH_SECRET: z.string().optional(),
    BETTER_AUTH_FACEBOOK_CLIENT_ID: z.string().optional(),
    BETTER_AUTH_FACEBOOK_CLIENT_SECRET: z.string().optional(),
    BETTER_AUTH_BASE_URL: z.string().optional(),

    // Database
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Admin Authentication (required for passwordless admin)
    ADMIN_EMAILS: z.string(), // e.g., "email1@example.com,email2@example.com"
    JWT_SECRET: z.string().min(32), // 32+ character secret for JWT signing
    KEY_EXPIRY_MINUTES: z.coerce.number().min(1).max(60).default(10),
    MAX_ATTEMPTS_PER_KEY: z.coerce.number().min(1).max(10).default(3),
    SESSION_EXPIRY_HOURS: z.coerce.number().min(1).max(24).default(1),

    // Rate Limiting (Upstash Redis)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Email Service (optional - for sending verification keys)
    RESEND_API_KEY: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    // Better Auth
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_FACEBOOK_CLIENT_ID: process.env.BETTER_AUTH_FACEBOOK_CLIENT_ID,
    BETTER_AUTH_FACEBOOK_CLIENT_SECRET: process.env.BETTER_AUTH_FACEBOOK_CLIENT_SECRET,
    BETTER_AUTH_BASE_URL: process.env.BETTER_AUTH_BASE_URL,

    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,

    // Admin Authentication
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    JWT_SECRET: process.env.JWT_SECRET,
    KEY_EXPIRY_MINUTES: process.env.KEY_EXPIRY_MINUTES,
    MAX_ATTEMPTS_PER_KEY: process.env.MAX_ATTEMPTS_PER_KEY,
    SESSION_EXPIRY_HOURS: process.env.SESSION_EXPIRY_HOURS,

    // Rate Limiting
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // Email Service
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,

    // Client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
