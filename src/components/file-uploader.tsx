"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, FileIcon, Image, File, UploadCloud } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

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
  folderPath = "",
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
        toast.error(`You can only upload up to ${maxFiles} files`);
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
      toast.error("You must be logged in to upload files");
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
      const baseFolder = entityType && entityId ? `${entityType}s/${entityId}` : "";
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
      } catch (error) {
        console.error("Upload error:", error);
        return {
          ...fileObj,
          uploading: false,
          error: "Upload failed",
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
        toast.success(`${successfulUploads.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error("Error processing uploads:", error);
      toast.error("An error occurred during upload");
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
        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer flex flex-col items-center justify-center transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-center text-sm font-medium">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-center text-xs text-muted-foreground mt-1">
          Max {maxFiles} files, up to {maxSize}MB each
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 p-2 rounded-md border bg-background"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    className="h-10 w-10 rounded object-cover"
                    alt={file.file.name}
                  />
                ) : (
                  getFileIcon(file.file.type)
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  {file.uploading ? (
                    <Progress value={file.progress} className="h-1.5 w-full" />
                  ) : file.error ? (
                    <p className="text-xs text-destructive">{file.error}</p>
                  ) : file.uploaded ? (
                    <p className="text-xs text-green-600">Uploaded</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
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
              onClick={() => setFiles([])}
              disabled={files.some((f) => f.uploading)}
            >
              Clear All
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={files.length === 0 || files.every((f) => f.uploaded) || files.some((f) => f.uploading)}
            >
              Upload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}