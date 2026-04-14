"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import { useAdminSession } from "@/hooks/use-admin-session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ProjectCardProps {
  projectId?: string;
  title: string;
  imageUrl: string;
  description: string;
  technologies: string[];
  demoUrl?: string;
  repoUrl?: string;
}

export default function ProjectCard({
  projectId,
  title,
  imageUrl,
  description,
  technologies,
  demoUrl,
  repoUrl,
}: ProjectCardProps) {
  const { token } = useAdminSession();
  const [confirmTrashOpen, setConfirmTrashOpen] = useState(false);
  const utils = api.useUtils();

  const deleteMutation = api.admin.projectDelete.useMutation({
    onSuccess: () => {
      toast.success("Project moved to trash. It is hidden from the site.");
      void utils.admin.publicProjectList.invalidate();
      void utils.admin.projectList.invalidate();
      void utils.admin.projectListDeleted.invalidate();
      setConfirmTrashOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const showAdminActions = Boolean(token && projectId);
  const editHref =
    projectId != null
      ? `/admin/edit/${projectId}?returnTo=${encodeURIComponent("/")}`
      : "#";

  return (
    <div className="mb-12">
      <div className="mb-4">
        <div className="relative w-full h-96">
          {showAdminActions && (
            <div className="absolute top-2 right-2 z-10 flex gap-1.5">
              <Link href={editHref} aria-label={`Edit ${title}`}>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 shrink-0 shadow-md bg-blue-300 hover:bg-blue-500"
                >
                  <Pencil className="h-4 w-4 text-white" />
                </Button>
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9 shrink-0 shadow-md bg-red-500 hover:bg-red-600"
                aria-label={`Move ${title} to trash`}
                onClick={() => setConfirmTrashOpen(true)}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          )}
          <Link href={demoUrl ?? "#"} target="_blank" rel="noopener noreferrer">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${title} screenshot`}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-md object-contain max-w-full max-h-full"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
          </Link>
        </div>
      </div>

      <div className="mb-2">
        <h3 className="font-medium text-black dark:text-white">{title}</h3>
      </div>

      <div className="mb-3">
        {technologies.map((tech, index) => (
          <span
            key={index}
            className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm px-3 py-1 rounded mr-2 ring ring-gray-200 dark:ring-gray-700"
          >
            {tech}
          </span>
        ))}
      </div>

      <p className="text-gray-700 dark:text-gray-300 mb-2">{description}</p>

      {(demoUrl || repoUrl) && (
        <div className="flex flex-col gap-4">
          {demoUrl && demoUrl !== "#" && (
            <Link
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 dark:text-gray-300 hover:underline"
            >
              {demoUrl}
            </Link>
          )}
          {repoUrl && (
            
            <Link
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 dark:text-gray-300 hover:underline"
            >
              GitHub Repo - {repoUrl}
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 mb-2 flex justify-center">
        <div className="h-[1px] w-[80%] mx-auto bg-gray-200 dark:bg-gray-700 shadow-md"></div>
      </div>

      <Dialog open={confirmTrashOpen} onOpenChange={setConfirmTrashOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to trash?</DialogTitle>
            <DialogDescription>
              &quot;{title}&quot; will disappear from the public portfolio. You can permanently delete
              it later from Admin → Trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmTrashOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || !projectId}
              onClick={() => projectId && deleteMutation.mutate({ id: projectId })}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Moving…
                </>
              ) : (
                "Move to trash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
