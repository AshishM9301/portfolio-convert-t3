"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAdminAuthHeader } from "@/hooks/use-admin-session";
import { projectSchema } from "@/types/admin";

import { Badge } from "@/components/ui/badge";

type ProjectFormData = z.infer<typeof projectSchema>;

export default function NewProjectPage() {
  const router = useRouter();
  const [techInput, setTechInput] = useState("");
  const authHeader = useAdminAuthHeader();

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

  const createMutation = api.admin.projectCreate.useMutation(
    {
      onSuccess: (data) => {
        toast.success("Project created successfully!");
        router.push("/admin/dashboard");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate({
      ...data,
      repoUrl: data.repoUrl || undefined,
      liveUrl: data.liveUrl || undefined,
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
          <CardTitle>Add New Project</CardTitle>
          <CardDescription>
            Add a new project to your portfolio
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
              <p className="text-xs text-gray-500">
                Place images in the public/images folder
              </p>
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
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
              <Link href="/admin/dashboard">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

