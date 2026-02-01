import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { auth } from "@/server/better-auth";
import { headers } from "next/headers";

export const authRouter = createTRPCRouter({
  // Get current user session
  me: publicProcedure.query(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  }),

  // Login with email and password
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await auth.api.signInEmailPassword({
          body: {
            email: input.email,
            password: input.password,
          },
          headers: await headers(),
        });

        if (result.url) {
          return { success: true, message: "Login successful" };
        }

        return { success: true, message: "Login successful" };
      } catch (error) {
        console.error("Login error:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }
    }),

  // Register new user
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Check if user already exists
        const existingUser = await auth.api.getUserByEmail({
          body: { email: input.email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User with this email already exists",
          });
        }

        // Create new user
        await auth.api.signUpEmailPassword({
          body: {
            email: input.email,
            password: input.password,
            name: input.name,
          },
          headers: await headers(),
        });

        return { success: true, message: "Registration successful" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Registration error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Registration failed. Please try again.",
        });
      }
    }),

  // Logout
  logout: publicProcedure.mutation(async () => {
    try {
      await auth.api.signOut({
        headers: await headers(),
      });
      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error("Logout error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Logout failed",
      });
    }
  }),
});

