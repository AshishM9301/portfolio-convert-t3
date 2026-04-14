/**
 * Seed script to populate the database with sample projects
 * Run with: bun run prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

class ProjectsTableMissingError extends Error {
    constructor() {
        super("The projects table is not in the database.");
        this.name = "ProjectsTableMissingError";
    }
}

interface SeedProject {
    title: string;
    imageFile: string;
    description: string;
    technologies: string[];
    demoUrl: string;
}

const projects: SeedProject[] = [
    {
        title: "Task List",
        imageFile: "status-monitor.png",
        description:
            "The 'Status Monitor' page is a task dashboard with filters for clients, services, and tasks. It shows task cards with status categories (Not Started, In Progress, Completed) and their counts for easy tracking.",
        technologies: ["ReactJS"],
        demoUrl: "https://zingy-cucurucho-0b52b8.netlify.app/",
    },
    {
        title: "User Management System",
        imageFile: "user-management.png",
        description:
            "This User Management System app streamlines user login and data management. It features: Login Page with secure user authentication and password recovery, User Dashboard with grid view of all registered users, and Employee Dashboard with directory of employees including names and roles. Ideal for efficient user and employee data management in organizations.",
        technologies: ["ReactJS"],
        demoUrl: "https://delightful-sable-f99429.netlify.app/",
    },
    {
        title: "GitHub Profile Comparer",
        imageFile: "github-profile-comparer.png",
        description:
            "A web app for exploring GitHub profiles. Simply enter a username to retrieve details such as repositories, contributions, and other profile information. Includes a feature to view all stored profiles in the database.",
        technologies: ["ReactJS"],
        demoUrl: "https://elegant-brattain-b9c01a.netlify.app/",
    },
    {
        title: "GRC - Conference",
        imageFile: "grc-conference.png",
        description:
            "Guha Research Conference Website: Designed for the 2024 session in Kaziranga, Assam, this website provides conference details, program schedules, and registration via Google Forms. It highlights Kaziranga National Park and its wildlife conservation with an engaging visual design.",
        technologies: ["ReactJS"],
        demoUrl: "https://grc-web-gamma.vercel.app/",
    },
    {
        title: "Gainwell Vanijya App",
        imageFile: "gainwell-vanijya.png",
        description:
            "A multilingual e-commerce app designed for easy purchasing. Migrated from Expo to CLI and implemented a discount feature to enhance user engagement and functionality.",
        technologies: ["React Native"],
        demoUrl: "#",
    },
    {
        title: "OUI AE",
        imageFile: "oui-ae.png",
        description:
            "A blog-style e-commerce website connecting sellers with customers globally. Developed functionality to post products, aiding sellers in reaching buyers. Additionally, created a specialized app for clothing e-commerce tailored to a specific region.",
        technologies: ["React Native"],
        demoUrl: "#",
    },
];

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 60);
}

function generateId(): string {
    return crypto.randomUUID();
}

function getImageMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".gif":
            return "image/gif";
        case ".webp":
            return "image/webp";
        default:
            return "image/png";
    }
}

async function imageToBase64(imagePath: string): Promise<{ base64: string; mimeType: string; size: number }> {
    const fullPath = path.join(process.cwd(), "public", "images", imagePath);
    const buffer = fs.readFileSync(fullPath);
    const base64 = buffer.toString("base64");
    const mimeType = getImageMimeType(imagePath);
    const size = buffer.length;
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return { base64: dataUrl, mimeType, size };
}

async function seedProjects() {
    console.log("Starting database seed...\n");

    let createdCount = 0;
    let skippedCount = 0;

    for (const project of projects) {
        const slug = generateSlug(project.title);

        // Check if project with this slug already exists
        const existing = await prisma.project.findUnique({
            where: { slug },
        });

        if (existing) {
            console.log(`⏭️  Skipped: "${project.title}" (already exists)`);
            skippedCount++;
            continue;
        }

        // Convert image to base64
        const { base64, mimeType, size } = await imageToBase64(project.imageFile);

        // Create project with image
        await prisma.project.create({
            data: {
                id: generateId(),
                title: project.title,
                slug,
                description: project.description,
                techStack: project.technologies,
                repoUrl: null,
                liveUrl: project.demoUrl === "#" ? null : project.demoUrl,
                featured: false,
                sortOrder: createdCount,
                image: {
                    create: {
                        url: base64,
                        type: "project_thumbnail",
                        mimeType,
                        size,
                    },
                },
            },
        });

        console.log(`✅ Created: "${project.title}" with image`);
        createdCount++;
    }

    console.log(`\n📊 Seed complete!`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total:   ${projects.length}`);
}

async function main() {
    try {
        await seedProjects();
    } catch (e) {
        if (e instanceof ProjectsTableMissingError) {
            console.error("❌ Projects table is missing.");
            console.error(
                "   Apply the schema first, then seed again, for example:",
            );
            console.error("   bun run db:push");
            console.error("   or: bun run db:migrate");
        } else {
            console.error("❌ Seed failed:", e);
        }
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

void main().then(() => {
    if (process.exitCode === 1) {
        process.exit(1);
    }
});
