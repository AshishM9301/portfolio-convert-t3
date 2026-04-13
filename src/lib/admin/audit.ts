import { db } from "@/server/db";

export type AdminAction =
  | "project.create"
  | "project.update"
  | "project.delete"
  | "project.permanent_delete"
  | "session.create"
  | "session.destroy"
  | "key.request"
  | "key.verify"
  | "verify_and_submit.key_failed"
  | "verify_and_submit.session_created"
  | "experience.create"
  | "experience.update"
  | "experience.delete"
  | "blog.create"
  | "blog.update"
  | "blog.delete"
  | "skill.create"
  | "skill.update"
  | "skill.delete";

export interface AuditLogEntry {
  sessionId?: string;
  action: AdminAction;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        sessionId: entry.sessionId,
        action: entry.action,
        resourceId: entry.resourceId,
        oldValue: entry.oldValue as any,
        newValue: entry.newValue as any,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Log to console but don't fail the operation
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(options: {
  sessionId?: string;
  action?: string;
  resourceId?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  logs: Array<{
    id: string;
    action: string;
    resourceId: string | null;
    createdAt: Date;
  }>;
  total: number;
}> {
  const where: Record<string, unknown> = {};

  if (options.sessionId) where.sessionId = options.sessionId;
  if (options.action) where.action = options.action;
  if (options.resourceId) where.resourceId = options.resourceId;

  const [logs, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit || 50,
      skip: options.offset || 0,
      select: {
        id: true,
        action: true,
        resourceId: true,
        createdAt: true,
        ipAddress: true,
      },
    }),
    db.adminAuditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getRecentAuditLogs(limit: number = 10): Promise<Array<{
  id: string;
  action: string;
  resourceId: string | null;
  ipAddress: string;
  createdAt: Date;
}>> {
  return db.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      resourceId: true,
      ipAddress: true,
      createdAt: true,
    },
  });
}

