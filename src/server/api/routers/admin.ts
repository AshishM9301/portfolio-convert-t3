import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import { rateLimiters } from "@/lib/rate-limit";
import {
  createOneTimeKey,
  verifyOneTimeKey,
} from "@/lib/admin/key-manager";
import { refreshSession, validateSession } from "@/lib/admin/session-store";
import { createAuditLog, getAuditLogs } from "@/lib/admin/audit";
import { projectSchema } from "@/types/admin";
import { db } from "@/server/db";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);
}

function getClientInfo(ctx: { headers: Headers }) {
  const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
  return {
    ipAddress:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "unknown",
    userAgent: headers.get("user-agent") || "unknown",
  };
}

// ============================================================================
// ADMIN ROUTER
// ============================================================================

export const adminRouter = createTRPCRouter({
  // ========================================================================
  // PUBLIC PROCEDURES (No Authentication Required)
  // ========================================================================

  requestKey: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = getClientInfo(ctx);

      // Rate limiting
      const rateLimit = await rateLimiters.keyRequest(ipAddress);
      if (!rateLimit.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`,
        });
      }

      const result = await createOneTimeKey(input.email, ipAddress);

      console.log("result", result);

      if (!result.success) {
        await createAuditLog({
          action: "key.request",
          ipAddress,
          userAgent,
          newValue: { email: input.email, success: false, reason: result.message },
        });
      }

      return {
        success: result.success,
        message: result.message,
        expiresIn: result.expiresAt
          ? `${Math.ceil((result.expiresAt.getTime() - Date.now()) / 60000)} minutes`
          : undefined,
        remainingRequests: rateLimit.remaining,
      };
    }),

  verifyKey: publicProcedure
    .input(z.object({ email: z.string().email(), key: z.string().length(8) }))
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = getClientInfo(ctx);

      // Rate limiting
      const rateLimit = await rateLimiters.keyVerification(ipAddress);
      if (!rateLimit.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many attempts. Retry after ${rateLimit.retryAfter} seconds.`,
        });
      }

      const result = await verifyOneTimeKey(
        input.email,
        input.key,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        await createAuditLog({
          action: "key.verify",
          ipAddress,
          userAgent,
          newValue: { email: input.email, success: false, reason: result.message },
        });
      } else {
        await createAuditLog({
          action: "session.create",
          resourceId: result.token?.substring(0, 8),
          ipAddress,
          userAgent,
          newValue: { email: input.email },
        });
      }

      return {
        success: result.success,
        token: result.token,
        expiresIn: result.expiresAt
          ? `${Math.ceil((result.expiresAt.getTime() - Date.now()) / 60000)} minutes`
          : undefined,
        remainingAttempts: result.remainingAttempts,
        message: result.message,
      };
    }),

  // ========================================================================
  // ADMIN PROCEDURES (Authentication Required)
  // ========================================================================

  refreshSession: adminProcedure.mutation(async ({ ctx }) => {
    const { adminSession, adminToken } = ctx as {
      adminSession: { email: string };
      adminToken: string;
    };

    const refreshed = await refreshSession(adminToken);

    if (!refreshed) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Session expired",
      });
    }

    return {
      success: true,
      message: "Session refreshed",
    };
  }),

  /** Validates Bearer token (middleware). `path` is for client cache keys only. */
  sessionCheck: adminProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ ctx }) => {
      const { adminSession } = ctx as { adminSession: { email: string } };
      return { ok: true as const, email: adminSession.email };
    }),

  // -------------------------------------------------------------------------
  // PROJECT MANAGEMENT
  // -------------------------------------------------------------------------

  projectCreate: adminProcedure
    .input(projectSchema)
    .mutation(async ({ input, ctx }) => {
      const { adminSession, adminToken } = ctx as {
        adminSession: { email: string; ipAddress: string };
        adminToken: string;
      };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const slug = generateSlug(input.title);

      // Check for duplicate slug
      const existing = await db.project.findUnique({ where: { slug } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A project with this title already exists",
        });
      }

      const { thumbnail, ...rest } = input;

      const project = await db.project.create({
        data: {
          ...rest,
          slug,
          repoUrl: input.repoUrl || null,
          liveUrl: input.liveUrl || null,
          ...(thumbnail && {
            image: {
              create: {
                url: thumbnail,
                type: "project_thumbnail",
                mimeType: "image/png", // Will be set properly on client
                size: thumbnail.length,
              },
            },
          }),
        },
        include: { image: true },
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "project.create",
        resourceId: project.id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        newValue: { title: project.title, slug: project.slug },
      });

      return {
        success: true,
        project: {
          id: project.id,
          title: project.title,
          slug: project.slug,
          createdAt: project.createdAt,
        },
      };
    }),

  projectUpdate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: projectSchema.shape.title.optional(),
        description: projectSchema.shape.description.optional(),
        techStack: projectSchema.shape.techStack.optional(),
        repoUrl: projectSchema.shape.repoUrl.optional(),
        liveUrl: projectSchema.shape.liveUrl.optional(),
        thumbnail: projectSchema.shape.thumbnail.optional(),
        featured: projectSchema.shape.featured.optional(),
        sortOrder: projectSchema.shape.sortOrder.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, thumbnail, ...data } = input;
      const { adminSession, adminToken } = ctx as {
        adminSession: { email: string };
        adminToken: string;
      };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      // Get existing project
      const existing = await db.project.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Update slug if title changes
      let slug = existing.slug;
      if (data.title && data.title !== existing.title) {
        slug = generateSlug(data.title);
        const duplicate = await db.project.findUnique({ where: { slug } });
        if (duplicate && duplicate.id !== id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A project with this title already exists",
          });
        }
      }

      // Handle image update
      if (thumbnail !== undefined) {
        // Delete existing image
        await db.image.deleteMany({ where: { projectId: id } });
        
        // Create new image if thumbnail provided
        if (thumbnail) {
          await db.image.create({
            data: {
              url: thumbnail,
              type: "project_thumbnail",
              mimeType: "image/png",
              size: thumbnail.length,
              projectId: id,
            },
          });
        }
      }

      const project = await db.project.update({
        where: { id },
        data: {
          ...data,
          slug,
          repoUrl: data.repoUrl ?? null,
          liveUrl: data.liveUrl ?? null,
        },
        include: { image: true },
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "project.update",
        resourceId: project.id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { title: existing.title },
        newValue: { title: project.title },
      });

      return {
        success: true,
        project: {
          id: project.id,
          title: project.title,
          slug: project.slug,
          updatedAt: project.updatedAt,
        },
      };
    }),

  projectDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { adminSession, adminToken } = ctx as {
        adminSession: { email: string };
        adminToken: string;
      };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const existing = await db.project.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Soft delete
      await db.project.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "project.delete",
        resourceId: id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { title: existing.title },
      });

      return { success: true, message: "Project deleted successfully" };
    }),

  projectListDeleted: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(50),
      })
    )
    .query(async ({ input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const where = { deletedAt: { not: null } };

      const [projects, total] = await Promise.all([
        db.project.findMany({
          where,
          orderBy: { deletedAt: "desc" },
          skip,
          take: limit,
          include: { image: true },
        }),
        db.project.count({ where }),
      ]);

      return {
        projects,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  projectPermanentDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { adminToken } = ctx as {
        adminSession: { email: string };
        adminToken: string;
      };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const existing = await db.project.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      if (!existing.deletedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Move the project to trash before permanently deleting it",
        });
      }

      await db.project.delete({ where: { id } });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "project.permanent_delete",
        resourceId: id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { title: existing.title },
      });

      return { success: true, message: "Project permanently removed" };
    }),

  projectList: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10),
        featuredOnly: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, featuredOnly } = input;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        deletedAt: null,
      };

      if (featuredOnly) {
        where.featured = true;
      }

      const [projects, total] = await Promise.all([
        db.project.findMany({
          where,
          orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
          skip,
          take: limit,
          include: { image: true },
        }),
        db.project.count({ where }),
      ]);

      return {
        projects,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  projectGet: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const project = await db.project.findUnique({
        where: { id: input.id },
        include: { image: true },
      });

      if (!project || project.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return { project };
    }),

  // -------------------------------------------------------------------------
  // PUBLIC PROJECT endpoints
  // -------------------------------------------------------------------------

  publicProjectList: publicProcedure
    .input(
      z.object({
        featuredOnly: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {
        deletedAt: null,
      };

      if (input.featuredOnly) {
        where.featured = true;
      }

      const projects = await db.project.findMany({
        where,
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        include: { image: true },
      });

      return { projects };
    }),

  publicProjectGet: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const project = await db.project.findUnique({
        where: { slug: input.slug },
        include: { image: true },
      });

      if (!project || project.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return { project };
    }),

  // -------------------------------------------------------------------------
  // EXPERIENCE MANAGEMENT
  // -------------------------------------------------------------------------

  experienceCreate: adminProcedure
    .input(
      z.object({
        jobTitle: z.string().min(1).max(100),
        company: z.string().min(1).max(100),
        location: z.string().min(1).max(100),
        startDate: z.string().min(1).max(20),
        endDate: z.string().min(1).max(20),
        achievements: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const experience = await db.experience.create({
        data: input,
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "experience.create",
        resourceId: experience.id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        newValue: { jobTitle: experience.jobTitle, company: experience.company },
      });

      return { success: true, experience };
    }),

  experienceUpdate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        jobTitle: z.string().optional(),
        company: z.string().optional(),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        achievements: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const existing = await db.experience.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experience not found",
        });
      }

      const experience = await db.experience.update({
        where: { id },
        data,
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "experience.update",
        resourceId: id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { jobTitle: existing.jobTitle },
        newValue: { jobTitle: experience.jobTitle },
      });

      return { success: true, experience };
    }),

  experienceDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const existing = await db.experience.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experience not found",
        });
      }

      await db.experience.delete({ where: { id } });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "experience.delete",
        resourceId: id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { jobTitle: existing.jobTitle },
      });

      return { success: true, message: "Experience deleted successfully" };
    }),

  experienceList: adminProcedure.query(async () => {
    const experiences = await db.experience.findMany({
      orderBy: { startDate: "desc" },
    });
    return { experiences };
  }),

  // -------------------------------------------------------------------------
  // BLOG MANAGEMENT
  // -------------------------------------------------------------------------

  blogCreate: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        date: z.string().min(1).max(50),
        description: z.string().min(1).max(2000),
        technologies: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const blog = await db.blog.create({
        data: input,
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "blog.create",
        resourceId: blog.id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        newValue: { title: blog.title },
      });

      return { success: true, blog };
    }),

  blogUpdate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        date: z.string().optional(),
        description: z.string().optional(),
        technologies: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const existing = await db.blog.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blog not found",
        });
      }

      const blog = await db.blog.update({
        where: { id },
        data,
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "blog.update",
        resourceId: id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { title: existing.title },
        newValue: { title: blog.title },
      });

      return { success: true, blog };
    }),

  blogDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const existing = await db.blog.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blog not found",
        });
      }

      await db.blog.delete({ where: { id } });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "blog.delete",
        resourceId: id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { title: existing.title },
      });

      return { success: true, message: "Blog deleted successfully" };
    }),

  blogList: adminProcedure.query(async () => {
    const blogs = await db.blog.findMany({
      orderBy: { date: "desc" },
    });
    return { blogs };
  }),

  // -------------------------------------------------------------------------
  // SKILL MANAGEMENT
  // -------------------------------------------------------------------------

  skillCreate: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        category: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const skill = await db.skill.create({
        data: input,
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "skill.create",
        resourceId: skill.id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        newValue: { name: skill.name, category: skill.category },
      });

      return { success: true, skill };
    }),

  skillUpdate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const existing = await db.skill.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill not found",
        });
      }

      const skill = await db.skill.update({
        where: { id },
        data,
      });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "skill.update",
        resourceId: id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { name: existing.name },
        newValue: { name: skill.name },
      });

      return { success: true, skill };
    }),

  skillDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { adminToken } = ctx as { adminToken: string };
      const headers = ctx.headers instanceof Headers ? ctx.headers : new Headers();
      const ipAddress = headers.get("x-forwarded-for") || "unknown";

      const existing = await db.skill.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Skill not found",
        });
      }

      await db.skill.delete({ where: { id } });

      await createAuditLog({
        sessionId: adminToken.substring(0, 8),
        action: "skill.delete",
        resourceId: id,
        ipAddress,
        userAgent: headers.get("user-agent") || undefined,
        oldValue: { name: existing.name },
      });

      return { success: true, message: "Skill deleted successfully" };
    }),

  skillList: adminProcedure.query(async () => {
    const skills = await db.skill.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return { skills };
  }),

  // -------------------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------------------

  verifyAndSubmit: publicProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        key: z.string().length(8).optional(),
        sessionToken: z.string().optional(),
        projectData: projectSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = getClientInfo(ctx);
      const { projectData, ...auth } = input;

      // Determine authentication method
      let sessionToken = auth.sessionToken;
      let email = auth.email;

      // If no session but has key, verify key and create session
      if (!sessionToken && auth.key && email) {
        const verifyResult = await verifyOneTimeKey(
          email,
          auth.key,
          ipAddress,
          userAgent
        );

        if (!verifyResult.success) {
          await createAuditLog({
            action: "verify_and_submit.key_failed",
            ipAddress,
            userAgent,
            newValue: { email, reason: verifyResult.message },
          });

          return {
            success: false,
            error: verifyResult.message,
            remainingAttempts: verifyResult.remainingAttempts,
          };
        }

        sessionToken = verifyResult.token!;
        email = email.toLowerCase();

        await createAuditLog({
          action: "verify_and_submit.session_created",
          resourceId: sessionToken.substring(0, 8),
          ipAddress,
          userAgent,
          newValue: { email },
        });
      }

      // If we still don't have a session token, user needs to authenticate
      if (!sessionToken) {
        return {
          success: false,
          error: "Authentication required. Please verify your key first.",
          needsAuthentication: true,
        };
      }

      // Validate session
      const session = await validateSession(sessionToken, ipAddress, userAgent);

      if (!session) {
        return {
          success: false,
          error: "Session expired or invalid. Please verify your key again.",
          needsAuthentication: true,
        };
      }

      // Generate slug and check for duplicates
      const slug = generateSlug(projectData.title);
      const existing = await db.project.findUnique({ where: { slug } });

      if (existing) {
        return {
          success: false,
          error: "A project with this title already exists",
        };
      }

      // Create the project
      const { thumbnail, ...rest } = projectData;
      const project = await db.project.create({
        data: {
          ...rest,
          slug,
          repoUrl: projectData.repoUrl || null,
          liveUrl: projectData.liveUrl || null,
          ...(thumbnail && {
            image: {
              create: {
                url: thumbnail,
                type: "project_thumbnail",
                mimeType: "image/png",
                size: thumbnail.length,
              },
            },
          }),
        },
        include: { image: true },
      });

      await createAuditLog({
        sessionId: sessionToken.substring(0, 8),
        action: "project.create",
        resourceId: project.id,
        ipAddress,
        userAgent,
        newValue: { title: project.title, slug: project.slug },
      });

      return {
        success: true,
        sessionToken,
        project: {
          id: project.id,
          title: project.title,
          slug: project.slug,
          createdAt: project.createdAt,
        },
      };
    }),


  getAuditLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().int().positive().max(100).default(50),
        offset: z.number().int().positive().default(0),
        action: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { logs, total } = await getAuditLogs({
        limit: input.limit,
        offset: input.offset,
        action: input.action,
      });
      return { logs, total };
    }),
});

