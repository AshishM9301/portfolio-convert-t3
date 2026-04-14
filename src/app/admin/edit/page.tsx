"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function EditPage() {
  const utils = api.useUtils();

  const { data, isLoading } = api.admin.projectList.useQuery(
    { limit: 100 }
  );

  const deleteMutation = api.admin.projectDelete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      void utils.admin.projectList.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold">Edit Projects</h1>
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
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Edit Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/trash">
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Trash
              </Button>
            </Link>
            <Link href="/admin/add">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Your Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No projects found</p>
                <Link href="/admin/add">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data?.projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {project.image && (
                        <img
                          src={project.image.url}
                          alt={project.title}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{project.title}</h3>
                          {project.featured && (
                            <Badge variant="secondary" className="text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {project.description}
                        </p>
                        {project.techStack.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {project.techStack.slice(0, 3).map((tech) => (
                              <Badge key={tech} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                            {project.techStack.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{project.techStack.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/edit/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${project.title}"?`)) {
                            deleteMutation.mutate({ id: project.id });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

