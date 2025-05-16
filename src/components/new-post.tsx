"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import TiptapEditor from "@/components/tiptap-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import FileUploader from "./file-uploader";
import { createClient } from "@/utils/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import type { Json } from "@/types/supabase";
import { createPost } from "@/lib/actions/post.server";
import { linkAttachmentsToPost } from "@/lib/actions/attachment.client"; 

const formSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters long" }),
  excerpt: z.string().optional(),
  fecha: z.string().optional(),
  published: z.boolean().default(false),
});

export function NewPostSheet() {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showUploaderDialog, setShowUploaderDialog] = useState(false);

  const closeSheet = () => {
    const closeEvent = new Event("keydown");
    (closeEvent as any).key = "Escape";
    sheetRef.current?.dispatchEvent(closeEvent);
  };

  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      fecha: "",
      published: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("You must be logged in to create a post");
      }

      const userId = userData.user.id;
      const post = await createPost(userId, {
        title: values.title,
        content: content as Json,
        excerpt: values.excerpt,
        fecha: values.fecha,
        published: values.published,
      });

      // Link attachments to post
      try {
        await linkAttachmentsToPost(post.id, attachments);
      } catch (attachmentError) {
        console.error("Error linking attachments:", attachmentError);
      }
      console.log("Post created successfully");
      closeSheet();
      router.push("/blog");
    } catch (error: any) {
      console.error(error.message || "Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachmentRequest = () => {
    setShowUploaderDialog(true);
  };

  const handleUploadComplete = (files: any[]) => {
    setAttachments((prev) => [...prev, ...files]);
    setShowUploaderDialog(false);
  };

  return (
    <SheetContent
      ref={sheetRef}
      side="right"
      className="px-6 sm:max-w-xl overflow-y-auto"
    >
      <SheetHeader>
        <SheetTitle>Nueva Publicacion</SheetTitle>
        <SheetDescription>Detalles de la obra o proyecto.</SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título del Proyecto</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Introduce el título de tu proyecto"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Un título descriptivo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="excerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resumen</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Breve descripción del proyecto"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Un resumen corto que describe los aspectos principales del
                  proyecto.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />{" "}
          <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="w-full md:w-[150px]"
                    {...field}
                    placeholder="Selecciona una fecha"
                  />
                </FormControl>
                <FormDescription>Fecha de inicio del proyecto.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <FormLabel>Content</FormLabel>
            <TiptapEditor
              content={content}
              onChange={setContent}
              onAttachmentRequest={handleAttachmentRequest}
              editorClass="min-h-[400px]"
              immediatelyRender={false}
            />
          </div>
          <FormField
            control={form.control}
            name="published"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Publish immediately</FormLabel>
                  <FormDescription>
                    If checked, this post will be visible to everyone.
                    Otherwise, it will be saved as a draft.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />{" "}
          <div className="flex gap-4 mb-8">
            <SheetClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Post"}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={showUploaderDialog} onOpenChange={setShowUploaderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Add Attachments</DialogTitle>
          <FileUploader onUploadComplete={handleUploadComplete} />
        </DialogContent>
      </Dialog>
    </SheetContent>
  );
}
