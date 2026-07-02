"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Plus, X, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";
import { useAdminSession } from "@/hooks/use-admin-session";
import Link from "next/link";

type ProjectFormData = z.infer<typeof projectSchema>;

export default function AddProjectPage() {
    const [techInput, setTechInput] = useState("");
    const [keyStatus, setKeyStatus] = useState<"idle" | "pending" | "verified">("idle");
    const [keyInput, setKeyInput] = useState("");
    const [devKey, setDevKey] = useState<string | null>(null);
    const { token, login } = useAdminSession();
    const router = useRouter();

    const form = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema) as never,
        defaultValues: {
            title: "",
            description: "",
            techStack: [],
            repoUrl: null,
            liveUrl: null,
            thumbnail: null,
            featured: false,
            sortOrder: 0,
        },
    });

    // Request key mutation
    const requestKeyMutation = api.admin.requestKey.useMutation({
        onSuccess: (data) => {
            setKeyStatus("pending");
            // Surface the actual send outcome, not a blanket success.
            if (data.emailSent) {
                setDevKey(null);
                toast.success(data.message);
            } else if (data.devKey) {
                // Dev mode — email failed but the server returned the key
                // so the developer can complete the flow.
                setDevKey(data.devKey);
                setKeyInput(data.devKey);
                toast.warning(
                    `${data.message} — dev key copied to the input below.`,
                    { duration: 60_000 },
                );
            } else {
                setDevKey(null);
                toast.error(data.message);
            }
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Submit with verification mutation
    const submitMutation = api.admin.verifyAndSubmit.useMutation({
        onSuccess: (data) => {
            if (data.success && data.sessionToken) {
                login(data.sessionToken);
                toast.success("Project created successfully!");
                router.push("/");
            } else if (data.needsAuthentication) {
                toast.info(data.error || "Authentication required");
            }
        },
        onError: (error) => {
            toast.error(error.message);
            if (error.message.includes("Invalid key") || error.message.includes("expired")) {
                setKeyStatus("idle");
                setKeyInput("");
            }
        },
    });

    const handleSendKey = async () => {
        const email = "ashishkmahto98@gmail.com";
        requestKeyMutation.mutate({ email });
    };

    const handleSubmit = form.handleSubmit((data) => {
        if (token) {
            // Has session, submit directly
            submitMutation.mutate({
                projectData: data,
                sessionToken: token,
            });
        } else if (keyStatus === "verified" && keyInput.length === 8) {
            // Has verified key, submit with key
            const email = "ashishkmahto98@gmail.com";
            submitMutation.mutate({
                email,
                key: keyInput,
                projectData: data,
            });
        } else {
            // Need to request key first
            toast.error("Please verify your key first");
        }
    });

    const addTech = () => {
        const current = form.getValues("techStack") ?? [];
        if (techInput.trim() && !current.includes(techInput.trim())) {
            form.setValue("techStack", [...current, techInput.trim()]);
            setTechInput("");
        }
    };

    const removeTech = (tech: string) => {
        const current = form.getValues("techStack") ?? [];
        form.setValue("techStack", current.filter((t) => t !== tech));
    };

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
                        <h1 className="text-xl font-semibold">Add Project</h1>
                    </div>
                    {token && (
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
                        <CardTitle>Add New Project</CardTitle>
                        <CardDescription>
                            Add a new project to your portfolio. Fill in the details below.
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
                                    disabled={submitMutation.isPending}
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

                            {/* Verification Section */}
                            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                                <h3 className="font-medium flex items-center gap-2">
                                    <Send className="h-4 w-4" />
                                    Verification
                                </h3>

                                {token ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-sm">Session active - ready to submit</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-4 items-center">
                                            <Input
                                                placeholder="Email for verification"
                                                defaultValue="ashishkmahto98@gmail.com"
                                                className="flex-1"
                                                disabled
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleSendKey}
                                                disabled={requestKeyMutation.isPending || keyStatus === "verified"}
                                            >
                                                {requestKeyMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4 mr-2" />
                                                )}
                                                Get Key
                                            </Button>
                                        </div>

                                        {keyStatus === "pending" && (
                                            <div className="space-y-2">
                                                <div className="flex gap-4">
                                                    <Input
                                                        placeholder="Enter 8-character key"
                                                        value={keyInput}
                                                        onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                                                        maxLength={8}
                                                        className="font-mono tracking-widest"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={() => setKeyStatus("verified")}
                                                        disabled={keyInput.length !== 8}
                                                    >
                                                        Verify
                                                    </Button>
                                                </div>
                                                {devKey && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                                        Dev mode (no email configured) — use this key:{" "}
                                                        <code className="select-all rounded bg-amber-100 px-1 py-0.5 font-mono text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                                                            {devKey}
                                                        </code>
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {keyStatus === "verified" && (
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="text-sm">Key verified (valid for session)</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={submitMutation.isPending || (!token && keyStatus !== "verified")}
                                className="w-full"
                            >
                                {submitMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Project"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

