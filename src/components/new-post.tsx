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
import { redirect, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { TYPES_MIME, type Json } from "@/types/supabase";
import { createPost } from "@/lib/actions/post.server";

import { createAttachment } from "@/lib/actions/attachment.server";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUploadZone } from "@/components/ui/FileUploadZone";
import { uploadFiles } from "@/lib/actions/attachment.client";

const formSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters long" }),
  excerpt: z.string().optional(),
  fecha: z.string().optional(),
  content: z.any().optional(),
  archivos: z.array(z.instanceof(File)).optional(),
  published: z.boolean().default(false),
});

export function NewPostSheet() {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      content: "",
      archivos: [],
      published: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isLoading) return;
    setIsLoading(true);
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      timeoutId = setTimeout(() => {
        if (isLoading) {
          toast.error(
            "La creación del post está tardando demasiado. Intenta de nuevo."
          );
          setIsLoading(false);
        }
      }, 3000);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("You must be logged in to create un post");
      }
      const userId = userData.user.id;

      // 1. Crear el post primero
      const post = await createPost(userId, {
        title: values.title,
        content: values.content as Json,
        excerpt: values.excerpt,
        fecha: values.fecha,
        published: values.published,
      });

      // 2. Subir archivos al storage y asociarlos al post
      if (post && post.id && values.archivos && values.archivos.length > 0) {
        const uploadedFiles = await uploadFiles(values.archivos);
        // Ahora tienes el post.id
        for (const file of uploadedFiles) {
          await createAttachment(
            {
              ...file,
              post_id: post.id,
            },
            userId
          );
        }
      }

      closeSheet();
      toast.success("Post creado con éxito");
      router.refresh();
      redirect("/blog");
      setIsLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Ocurrió un error al crear el post.");
      setIsLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  return (
    <SheetContent
      ref={sheetRef}
      side="right"
      className="px-6 sm:max-w-xl overflow-y-auto"
    >
      <SheetHeader>
        <SheetTitle>Nueva Publicacion</SheetTitle>
        <SheetDescription>Detalles de la publicacion.</SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título del Post</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Introduce el título del post"
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
            name="fecha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Inicio</FormLabel>
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
          />{" "}
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
          />
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contenido del Post</FormLabel>
                <FormControl>
                  <TiptapEditor
                    content={field.value}
                    onChange={field.onChange}
                    editorClass="max-h-[400px]"
                    immediatelyRender={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Campo archivos adjuntos */}
          <FormField
            control={form.control}
            name="archivos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subir archivos</FormLabel>
                <FormControl>
                  <FileUploadZone
                    files={Array.isArray(field.value) ? field.value : []}
                    onFilesAdd={(files) =>
                      field.onChange([
                        ...(Array.isArray(field.value) ? field.value : []),
                        ...files,
                      ])
                    }
                    onFileRemove={(index) => {
                      const newFiles = Array.isArray(field.value)
                        ? [...field.value]
                        : [];
                      newFiles.splice(index, 1);
                      field.onChange(newFiles);
                    }}
                    accept={TYPES_MIME}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          />
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
    </SheetContent>
  );
}
