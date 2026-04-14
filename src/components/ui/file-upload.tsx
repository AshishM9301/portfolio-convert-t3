"use client";

import * as React from "react";
import { Upload, X, Image, Loader2, FileImage, CheckCircle2, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
    value?: string | null;
    onChange?: (value: string | null) => void;
    accept?: string;
    maxSizeMB?: number;
    path?: string;
    className?: string;
    disabled?: boolean;
}

interface UploadState {
    status: "idle" | "uploading" | "success" | "error";
    progress: number;
    preview?: string;
    error?: string;
    fileName?: string;
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
    ({ value, onChange, accept = "image/*", maxSizeMB = 5, path = "portfolio", className, disabled }, ref) => {
        const [state, setState] = React.useState<UploadState>({
            status: value ? "success" : "idle",
            progress: value ? 100 : 0,
            preview: value ?? undefined,
        });
        const [isDragging, setIsDragging] = React.useState(false);
        const [isDraggingOver, setIsDraggingOver] = React.useState(false);
        const fileInputRef = React.useRef<HTMLInputElement>(null);
        const uploadControllerRef = React.useRef<{ cancel: () => void } | null>(null);

        React.useEffect(() => {
            if (value && state.status !== "uploading") {
                setState((prev) => ({ ...prev, status: "success", progress: 100, preview: value }));
            }
        }, [value, state.status]);

        const uploadFile = async (file: File) => {
            if (file.size > maxSizeMB * 1024 * 1024) {
                setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: `File size must be less than ${maxSizeMB}MB`,
                }));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setState((prev) => ({
                    ...prev,
                    status: "uploading",
                    progress: 50,
                    preview: e.target?.result as string,
                    fileName: file.name,
                    error: undefined,
                }));
            };
            reader.readAsDataURL(file);

            try {
                // Convert to base64 directly (no Firebase upload)
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                setState((prev) => ({
                    ...prev,
                    status: "success",
                    progress: 100,
                    preview: base64,
                }));
                onChange?.(base64);
            } catch (err) {
                setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: "Failed to process image",
                }));
            }
        };

        const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            setIsDraggingOver(false);
            setIsDragging(false);

            if (disabled) return;

            const file = e.dataTransfer.files[0];
            if (file) {
                void uploadFile(file);
            }
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) {
                setIsDraggingOver(true);
            }
        };

        const handleDragLeave = (e: React.DragEvent) => {
            e.preventDefault();
            setIsDraggingOver(false);
        };

        const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                void uploadFile(file);
            }
        };

        const handleClick = () => {
            if (!disabled && state.status !== "uploading") {
                fileInputRef.current?.click();
            }
        };

        const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation();
            uploadControllerRef.current?.cancel();
            setState({ status: "idle", progress: 0 });
            onChange?.(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        };

        return (
            <div ref={ref} className={cn("relative", className)}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled}
                />

                {state.status === "idle" ? (
                    <div
                        onClick={handleClick}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                            "hover:border-primary/50 hover:bg-muted/50",
                            isDraggingOver && "border-primary bg-primary/5",
                            disabled && "opacity-50 cursor-not-allowed",
                            className
                        )}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-3 rounded-full bg-muted">
                                <Upload className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Drag & drop or click to upload</p>
                                <p className="text-xs text-muted-foreground">
                                    {accept === "image/*" ? "Images" : "Files"} up to {maxSizeMB}MB
                                </p>
                            </div>
                        </div>
                    </div>
                ) : state.status === "uploading" ? (
                    <div
                        onClick={handleClick}
                        className={cn(
                            "border rounded-lg p-4 cursor-pointer transition-all",
                            "border-primary/50 bg-primary/5",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            {state.preview ? (
                                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                    <img
                                        src={state.preview}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                    <FileImage className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{state.fileName}</p>
                                <div className="mt-2">
                                    <Progress value={state.progress} className="h-2" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Uploading... {Math.round(state.progress)}%
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleClear}
                                disabled={disabled}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : state.status === "success" ? (
                    <div className="relative border rounded-lg overflow-hidden group">
                        {state.preview ? (
                            <img
                                src={state.preview}
                                alt="Uploaded"
                                className="w-full h-48 object-cover"
                            />
                        ) : (
                            <div className="w-full h-48 bg-muted flex items-center justify-center">
                                <Image className="h-12 w-12 text-muted-foreground" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleClick}
                                disabled={disabled}
                            >
                                <Upload className="h-4 w-4 mr-1" />
                                Replace
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleClear}
                                disabled={disabled}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Remove
                            </Button>
                        </div>
                        <div className="absolute top-2 right-2">
                            <div className="p-1 bg-green-500 rounded-full">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </div>
                ) : state.status === "error" ? (
                    <div
                        onClick={handleClick}
                        className={cn(
                            "border border-destructive rounded-lg p-4 cursor-pointer transition-all",
                            "hover:bg-destructive/5",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-md bg-destructive/10">
                                <AlertCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-destructive">Upload failed</p>
                                <p className="text-xs text-muted-foreground">{state.error}</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleClick}
                                disabled={disabled}
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }
);

FileUpload.displayName = "FileUpload";

export { FileUpload };
