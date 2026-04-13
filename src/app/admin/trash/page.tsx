"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminSession } from "@/hooks/use-admin-session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function AdminTrashPage() {
  const { token } = useAdminSession();
  const [permanentId, setPermanentId] = useState<string | null>(null);
  const [permanentTitle, setPermanentTitle] = useState("");
  const utils = api.useUtils();

  const { data, isLoading } = api.admin.projectListDeleted.useQuery(
    { page: 1, limit: 50 },
    { enabled: !!token }
  );

  const permanentDeleteMutation = api.admin.projectPermanentDelete.useMutation({
    onSuccess: () => {
      toast.success("Project permanently deleted");
      void utils.admin.projectListDeleted.invalidate();
      setPermanentId(null);
      setPermanentTitle("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Open the admin add flow or dashboard with your session to manage trash.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/admin">Admin</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/admin/add">Add / session</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/edit">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Trash</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Projects here are hidden from the public site. Permanently delete only when you are sure.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.projects.length ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center text-muted-foreground">
              Trash is empty.
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {data.projects.map((project) => (
              <Card key={project.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="font-medium">{project.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setPermanentId(project.id);
                      setPermanentTitle(project.title);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete forever
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!permanentId} onOpenChange={() => setPermanentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete?</DialogTitle>
            <DialogDescription>
              This removes &quot;{permanentTitle}&quot; from the database. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPermanentId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={permanentDeleteMutation.isPending || !permanentId}
              onClick={() => permanentId && permanentDeleteMutation.mutate({ id: permanentId })}
            >
              {permanentDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete forever"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
