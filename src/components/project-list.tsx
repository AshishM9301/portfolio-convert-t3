"use client";

import { api } from "@/trpc/react";
import ProjectCard from "@/components/project-card";
import { Loader2 } from "lucide-react";

interface Project {
    id: string;
    title: string;
    slug: string;
    description: string;
    techStack: string[];
    repoUrl: string | null;
    liveUrl: string | null;
    thumbnail: string | null;
    featured: boolean;
    createdAt: Date;
    image?: {
        id: string;
        url: string;
        type: string;
        mimeType: string;
        size: number;
    } | null;
}

interface ProjectListProps {
    initialProjects?: Project[];
}

export default function ProjectList({ initialProjects }: ProjectListProps) {
    // Fetch projects from database using tRPC
    const { data: dbProjects, isLoading } = api.admin.publicProjectList.useQuery(
        { featuredOnly: false },
        {
            enabled: !initialProjects,
        }
    );

    const projects = initialProjects ?? dbProjects?.projects ?? [];

    if (projects.length === 0 && isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <p className="text-center text-muted-foreground py-8">
                No projects found. Add projects via the admin panel.
            </p>
        );
    }

    return (
        <>
            {projects.map((project) => (
                <ProjectCard
                    key={project.id}
                    projectId={project.id}
                    title={project.title}
                    imageUrl={project.image?.url ?? ""}
                    description={project.description}
                    technologies={project.techStack}
                    demoUrl={project.liveUrl ?? "#"}
                    repoUrl={project.repoUrl ?? undefined}
                />
            ))}
        </>
    );
}

