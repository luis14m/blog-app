"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TiptapEditor from "@/components/tiptap-editor";
import { Loader2 } from "lucide-react";
import { createCommentFromForm } from "@/lib/actions/comment.server";
import { FileUploadZone } from "@/components/ui/FileUploadZone";
import { TYPES_MIME } from "@/types/supabase";
import { createAttachment } from "@/lib/actions/attachment.server";
import { uploadFiles } from "@/lib/actions/attachment.client";
import type { Comment } from "@/types/supabase";

const EMPTY_CONTENT = { type: "doc", content: [{ type: "paragraph" }] };

interface CommentsCreateProps {
  postId: string;
  user: any;
  onCommentCreated?: (comment: Comment) => void;
}

export function CommentsCreate({ postId, user, onCommentCreated }: CommentsCreateProps) {
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const isValidComment = () => {
    if (content && typeof content === "object") {
      // Extraer el texto plano de cualquier estructura
      const plainText = extractPlainText(content);
      return plainText.trim().length >= 5;
    }
    return false;
  };

  // Función auxiliar para extraer texto plano de cualquier estructura
  const extractPlainText = (obj: any): string => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    if (Array.isArray(obj)) {
      return obj.map(extractPlainText).join(" ");
    }
    if (typeof obj === "object") {
      if (obj.text) return obj.text;
      if (obj.content) return extractPlainText(obj.content);
      return Object.values(obj).map(extractPlainText).join(" ");
    }
    return "";
  };

  const handleSubmitComment = async (formData: FormData) => {
    if (!user) {
      console.error("Debes iniciar sesión para comentar");
      return;
    }
    setIsSubmitting(true);
    try {
      formData.append("userId", user.id);
      formData.append("content", JSON.stringify(content));
      formData.append("postId", postId);
      // 1. Crear el comentario y obtener el ID
      const createdComment = await createCommentFromForm(formData);
      const commentId = createdComment.id;
      // 2. Subir archivos al storage y asociarlos al comentario
      let uploadedFiles = [];
      if (attachments && attachments.length > 0) {
        const filesToUpload = attachments.filter((a) => a instanceof File);
        if (filesToUpload.length > 0) {
          uploadedFiles = await uploadFiles(filesToUpload, { type: "comments" });
          for (const file of uploadedFiles) {
            await createAttachment({ ...file, comment_id: commentId }, user.id);
          }
        }
      }
      // 3. Obtener el comentario completo con adjuntos y notificar al padre
      if (onCommentCreated) {
        onCommentCreated({ ...createdComment, attachments: uploadedFiles });
      }
      setContent(EMPTY_CONTENT);
      setAttachments([]);
      if (formRef.current) formRef.current.reset();
    } catch (error: any) {
      console.error(error.message || "Error al agregar comentario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} action={handleSubmitComment} className="space-y-4">
      <input type="hidden" name="postId" value={postId} />
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
          <AvatarFallback>
            {user?.email?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-4">
          <TiptapEditor
            content={content}
            onChange={setContent}
            placeholder="Escribe un comentario..."
            immediatelyRender={false}
            key={`editor-comments-create`}
          />
          <input
            type="hidden"
            name="content"
            value={JSON.stringify(content)}
          />
          {/* Zona de subida de archivos */}
          <FileUploadZone
            files={attachments}
            onFilesAdd={(files) => setAttachments((prev) => [...prev, ...files])}
            onFileRemove={(index) => {
              setAttachments((prev) => {
                const newFiles = [...prev];
                newFiles.splice(index, 1);
                return newFiles;
              });
            }}
            accept={TYPES_MIME}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              disabled={!isValidComment() || isSubmitting}
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
