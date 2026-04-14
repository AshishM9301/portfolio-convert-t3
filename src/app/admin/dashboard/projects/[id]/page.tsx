"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Plus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAdminAuthHeader } from "@/hooks/use-admin-session";
import { projectSchema } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProjectFormData = z.infer<typeof projectSchema>;

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = params?.id;
  const projectId =
    typeof rawParam === "string"
      ? rawParam
      : Array.isArray(rawParam)
        ? (rawParam[0] ?? "")
        : "";
  const [techInput, setTechInput] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const authHeader = useAdminAuthHeader();

  const { data: projectData, isLoading } = api.admin.projectGet.useQuery(
    { id: projectId },
    { enabled: projectId.length > 0 }
  );

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      techStack: [],
      repoUrl: "",
      liveUrl: "",
      featured: false,
      sortOrder: 0,
    },
  });

  // Populate form when project data is loaded
  useEffect(() => {
    if (projectData?.project) {
      form.reset({
        title: projectData.project.title,
        description: projectData.project.description,
        techStack: projectData.project.techStack,
        repoUrl: projectData.project.repoUrl || "",
        liveUrl: projectData.project.liveUrl || "",
        featured: projectData.project.featured,
        sortOrder: projectData.project.sortOrder,
      });
    }
  }, [projectData, form]);

  const updateMutation = api.admin.projectUpdate.useMutation(
    {
      onSuccess: () => {
        toast.success("Project updated successfully!");
        router.push("/admin/dashboard");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const deleteMutation = api.admin.projectDelete.useMutation(
    {
      onSuccess: () => {
        toast.success("Project deleted successfully");
        router.push("/admin/dashboard");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleSubmit = form.handleSubmit((data) => {
    updateMutation.mutate({
      id: projectId,
      ...data,
      repoUrl: data.repoUrl || undefined,
      liveUrl: data.liveUrl || undefined,
    });
  });

  const handleDelete = () => {
    deleteMutation.mutate({ id: projectId });
  };

  const addTech = () => {
    const currentTechStack = form.getValues("techStack") ?? [];
    if (techInput.trim() && !currentTechStack.includes(techInput.trim())) {
      form.setValue("techStack", [...currentTechStack, techInput.trim()]);
      setTechInput("");
    }
  };

  const removeTech = (tech: string) => {
    const currentTechStack = form.getValues("techStack") ?? [];
    form.setValue(
      "techStack",
      currentTechStack.filter((t) => t !== tech)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!projectData?.project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
        <Link href="/admin/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Project</CardTitle>
          <CardDescription>
            Update project details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                placeholder="My Awesome Project"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your project..."
                rows={4}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tech Stack</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add technology..."
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTech())}
                />
                <Button type="button" variant="outline" onClick={addTech}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(form.getValues("techStack") ?? []).map((tech) => (
                  <Badge key={tech} variant="secondary" className="gap-1">
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="repoUrl">Repository URL</Label>
                <Input
                  id="repoUrl"
                  placeholder="https://github.com/..."
                  {...form.register("repoUrl")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="liveUrl">Live Demo URL</Label>
                <Input
                  id="liveUrl"
                  placeholder="https://..."
                  {...form.register("liveUrl")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail URL</Label>
              <Input
                id="thumbnail"
                placeholder="/images/project.png"
                {...form.register("thumbnail")}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  {...form.register("featured")}
                />
                <Label htmlFor="featured">Featured Project</Label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/dashboard")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

