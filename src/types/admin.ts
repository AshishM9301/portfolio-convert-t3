import { z } from "zod";

// ============================================================================
// PROJECT TYPES
// ============================================================================

export const projectSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(2000),
    techStack: z.array(z.string()).optional(),
    repoUrl: z.string().url().nullable().optional(),
    liveUrl: z.string().url().nullable().optional(),
    thumbnail: z.string().nullable().optional(), // base64 string
    featured: z.boolean(),
    sortOrder: z.number().int(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export interface Project {
    id: string;
    title: string;
    slug: string;
    description: string;
    techStack: string[];
    repoUrl: string | null;
    liveUrl: string | null;
    thumbnail: string | null;
    featured: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface ProjectListResponse {
    projects: Project[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================================================
// ADMIN AUTH TYPES
// ============================================================================

export interface AdminSessionPayload {
    email: string;
    ipAddress: string;
    userAgent: string;
    iat: number;
    exp: number;
}

export interface SessionToken {
    token: string;
    expiresAt: Date;
    email: string;
}

export interface KeyRequestResponse {
    success: boolean;
    message: string;
    expiresIn: string;
    remainingRequests: number;
}

export interface KeyVerificationResponse {
    success: boolean;
    token?: string;
    expiresIn?: string;
    error?: string;
    remainingAttempts?: number;
}

// ============================================================================
// RATE LIMIT TYPES
// ============================================================================

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedRequest {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface AdminActionResponse {
    success: boolean;
    message: string;
    action: string;
    resourceId?: string;
    timestamp: Date;
}

// ============================================================================
// EXPERIENCE TYPES
// ============================================================================

export const experienceSchema = z.object({
    jobTitle: z.string().min(1).max(100),
    company: z.string().min(1).max(100),
    location: z.string().min(1).max(100),
    startDate: z.string().min(1).max(20),
    endDate: z.string().min(1).max(20),
    achievements: z.array(z.string()).default([]),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;

export interface Experience {
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    achievements: string[];
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// BLOG TYPES
// ============================================================================

export const blogSchema = z.object({
    title: z.string().min(1).max(200),
    date: z.string().min(1).max(50),
    description: z.string().min(1).max(2000),
    technologies: z.array(z.string()).default([]),
});

export type BlogInput = z.infer<typeof blogSchema>;

export interface Blog {
    id: string;
    title: string;
    date: string;
    description: string;
    technologies: string[];
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// SKILL TYPES
// ============================================================================

export const skillSchema = z.object({
    name: z.string().min(1).max(50),
    category: z.string().min(1).max(50),
});

export type SkillInput = z.infer<typeof skillSchema>;

export interface Skill {
    id: string;
    name: string;
    category: string;
    createdAt: Date;
}

