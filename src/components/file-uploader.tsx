"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, FileIcon, Image, File, UploadCloud } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface FileUploaderProps {
  onUploadComplete: (files: {
    id: string;
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }[]) => void;
  bucketName?: string;
  folderPath?: string;
  entityId?: string;
  entityType?: "post" | "comment";
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedFileTypes?: string[];
}

export default function FileUploader({
  onUploadComplete,
  bucketName = "attachments",
  entityId,
  entityType,
  maxFiles = 5,
  maxSize = 10, // 10MB
  acceptedFileTypes = ["image/*", "application/pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
}: FileUploaderProps) {
  const [files, setFiles] = useState<
    {
      file: File;
      id: string;
      preview?: string;
      progress: number;
      uploading: boolean;
      error?: string;
      uploaded?: boolean;
      path?: string;
    }[]
  >([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        console.error(`You can only upload up to ${maxFiles} files`);
        return;
      }

      const newFiles = acceptedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substring(2, 11),
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        progress: 0,
        uploading: false,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxSize * 1024 * 1024,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    const supabase = createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      console.error("You must be logged in to upload files");
      return;
    }

    const uploadPromises = files.map(async (fileObj) => {
      if (fileObj.uploaded) return fileObj;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, uploading: true } : f
        )
      );

      const file = fileObj.file;
      const fileExt = file.name.split(".").pop();
      const baseFolder = entityType && entityId ? `${entityType === "post" ? "posts" : "comments"}/${entityId}` : "";
      const filePath = `${baseFolder}/${Math.random().toString(36).substring(2, 11)}.${fileExt}`;

      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        const path = data?.path;

        return {
          ...fileObj,
          uploading: false,
          uploaded: true,
          progress: 100,
          path,
        };
      } catch (error: any) {
        console.error("Upload error:", error?.message || JSON.stringify(error));
        return {
          ...fileObj,
          uploading: false,
          error: error?.message || "Error de carga desconocido",
          progress: 0,
        };
      }
    });

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      setFiles(uploadedFiles);

      // Save file references to the database if they were successfully uploaded
      const successfulUploads = uploadedFiles.filter((f) => f.uploaded && f.path);
      if (successfulUploads.length > 0) {
        const attachments = await Promise.all(
          successfulUploads.map(async (fileObj) => {
            const { data, error } = await supabase
              .from("attachments")
              .insert({
                file_path: fileObj.path!,
                file_name: fileObj.file.name,
                file_type: fileObj.file.type,
                file_size: fileObj.file.size,
                user_id: user.data.user!.id,
                ...(entityType === "post" && entityId ? { post_id: entityId } : {}),
                ...(entityType === "comment" && entityId ? { comment_id: entityId } : {}),
              })
              .select()
              .single();

            if (error) {
              console.error("Database error:", error);
              throw error;
            }

            return data;
          })
        );

        onUploadComplete(attachments);
        console.log(`${successfulUploads.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error("Error processing uploads:", error);
      console.error("An error occurred during upload");
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-8 w-8" />;
    if (fileType.includes("pdf")) return <FileIcon className="h-8 w-8" />;
    return <File className="h-8 w-8" />;
  };

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={`border border-dashed rounded-xl p-8 cursor-pointer transition-all ${
          isDragActive 
            ? "border-primary/70 bg-primary/5" 
            : "border-border/50 hover:border-primary/30 hover:bg-accent/50"
        }`}
      >
        <input {...getInputProps()} onClick={e => e.stopPropagation()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <UploadCloud className="h-12 w-12 text-primary/70" />
          <div className="text-center">
            <p className="text-sm font-medium">
              Drop your files here, or <span className="text-primary">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supported formats: Images, PDF, Office documents, etc.
            </p>
            <p className="text-xs text-muted-foreground">
              Up to {maxFiles} files, max {maxSize}MB each
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-accent/40 hover:bg-accent/60 transition-colors"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    className="h-12 w-12 rounded-md object-cover ring-1 ring-border"
                    alt={file.file.name}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-background/80 ring-1 ring-border flex items-center justify-center">
                    {getFileIcon(file.file.type)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {file.file.name}
                  </p>
                  {file.uploading ? (
                    <div className="mt-1">
                      <Progress value={file.progress} className="h-1 w-full bg-accent" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploading... {file.progress}%
                      </p>
                    </div>
                  ) : file.error ? (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  ) : file.uploaded ? (
                    <p className="text-xs text-emerald-600 mt-1">Successfully uploaded</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  disabled={file.uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFiles([])}
              disabled={files.some((f) => f.uploading)}
              className="rounded-full"
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={uploadFiles}
              disabled={files.length === 0 || files.every((f) => f.uploaded) || files.some((f) => f.uploading)}
              className="rounded-full"
            >
              Adjuntar Files
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}