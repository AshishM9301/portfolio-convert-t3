/**
 * Script to update existing projects with images from public/images folder
 * Run with: bun run scripts/seed-images.ts
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const imageMap: Record<string, string> = {
    "task-list": "status-monitor.png",
    "user-management-system": "user-management.png",
    "github-profile-comparer": "github-profile-comparer.png",
    "grc-conference": "grc-conference.png",
    "gainwell-vanijya-app": "gainwell-vanijya.png",
    "oui-ae": "oui-ae.png",
};

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

async function seedImages() {
    console.log("Starting image seed...\n");

    let updatedCount = 0;
    let skippedCount = 0;

    const projects = await prisma.project.findMany({
        where: { deletedAt: null },
    });

    for (const project of projects) {
        const imageFile = imageMap[project.slug];

        if (!imageFile) {
            console.log(`⏭️  Skipped: "${project.title}" (no image mapping)`);
            skippedCount++;
            continue;
        }

        // Check if project already has an image
        const existingImage = await prisma.image.findFirst({
            where: { projectId: project.id },
        });

        if (existingImage) {
            console.log(`⏭️  Skipped: "${project.title}" (already has image)`);
            skippedCount++;
            continue;
        }

        // Convert image to base64
        const { base64, mimeType, size } = await imageToBase64(imageFile);

        // Create image for project
        await prisma.image.create({
            data: {
                url: base64,
                type: "project_thumbnail",
                mimeType,
                size,
                projectId: project.id,
            },
        });

        console.log(`✅ Updated: "${project.title}" with ${imageFile}`);
        updatedCount++;
    }

    console.log(`\n📊 Image seed complete!`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
}

async function main() {
    try {
        await seedImages();
    } catch (e) {
        console.error("❌ Image seed failed:", e);
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
