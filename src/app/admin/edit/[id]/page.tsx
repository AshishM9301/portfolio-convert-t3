"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type z } from "zod";
import { projectSchema } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, ArrowLeft, CheckCircle2 } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";
import Link from "next/link";
import { useAdminSession } from "@/hooks/use-admin-session";

type ProjectFormData = z.infer<typeof projectSchema>;

export default function EditProjectPage() {
  const [techInput, setTechInput] = useState("");
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isAuthenticated } = useAdminSession();
  const rawParam = params?.id;
  const projectId =
    typeof rawParam === "string"
      ? rawParam
      : Array.isArray(rawParam)
        ? (rawParam[0] ?? "")
        : "";
  const canFetchProject = Boolean(token && projectId.length > 0);

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

  // Fetch project data
  const { data: projectData, isLoading } = api.admin.projectGet.useQuery(
    { id: projectId },
    {
      enabled: canFetchProject,
    }
  );

  // Update form when data loads
  useEffect(() => {
    if (projectData?.project) {
      const p = projectData.project;
      form.reset({
        title: p.title,
        description: p.description,
        techStack: p.techStack,
        repoUrl: p.repoUrl ?? "",
        liveUrl: p.liveUrl ?? "",
        thumbnail: p.image?.url ?? "",
        featured: p.featured,
        sortOrder: p.sortOrder,
      });
    }
  }, [projectData, form]);

  // Update mutation
  const updateMutation = api.admin.projectUpdate.useMutation({
    onSuccess: () => {
      toast.success("Project updated successfully!");
      const returnTo = searchParams.get("returnTo");
      const safeReturn =
        returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/admin/edit";
      router.push(safeReturn);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    if (!token) {
      toast.error("Please log in first");
      return;
    }

    updateMutation.mutate({
      id: projectId,
      ...data,
      repoUrl: data.repoUrl?.trim() ? data.repoUrl : null,
      liveUrl: data.liveUrl?.trim() ? data.liveUrl : null,
      thumbnail: data.thumbnail?.trim() ? data.thumbnail : null,
    });
  });

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

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to edit this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/add">
              <Button className="w-full">Go to Add Page to Authenticate</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid project</CardTitle>
            <CardDescription>This edit link is missing a project id.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/edit">
              <Button className="w-full">Back to projects</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold">Edit Project</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Edit Project</h1>
          </div>
          {isAuthenticated && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Authenticated
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Edit Project</CardTitle>
            <CardDescription>
              Update the details of your project below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
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

              {/* Description */}
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

              {/* Tech Stack */}
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

              {/* URLs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl">Repository URL</Label>
                  <Input
                    id="repoUrl"
                    placeholder="https://github.com/..."
                    {...form.register("repoUrl")}
                  />
                  {form.formState.errors.repoUrl && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.repoUrl.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="liveUrl">Live Demo URL</Label>
                  <Input
                    id="liveUrl"
                    placeholder="https://..."
                    {...form.register("liveUrl")}
                  />
                  {form.formState.errors.liveUrl && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.liveUrl.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Thumbnail */}
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <FileUpload
                  value={form.watch("thumbnail")}
                  onChange={(url) => form.setValue("thumbnail", url ?? "")}
                  accept="image/*"
                  maxSizeMB={5}
                  path="portfolio/thumbnails"
                  disabled={updateMutation.isPending}
                />
              </div>

              {/* Featured */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    {...form.register("featured")}
                  />
                  <Label htmlFor="featured">Featured Project</Label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full"
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
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

