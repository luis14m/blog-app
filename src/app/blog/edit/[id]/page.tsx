"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import TiptapEditor from "@/components/tiptap-editor";

import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

import { Loader2 } from "lucide-react";

import { updatePost } from "@/lib/actions/server";
import { getPostById } from "@/lib/actions/client";
import type { Database, Json } from "@/types/supabase";



type Post = Database["public"]["Tables"]["posts"]["Row"];

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const formSchema = z.object({
  title: z.string().min(3).max(100),
  excerpt: z.string().max(200).optional(),
  fecha: z.string().optional(),
  published: z.boolean().default(false),
});

export default function EditPostPage(props: PageProps) {
  const params = use(props.params);
  const { id } = params;
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
  useEffect(() => {
    const getPost = async () => {
      try {
        const post = await getPostById(id);

        if (!post) {
          console.error("Post not found");
          router.push("/blog");
          return;
        }

        form.reset({
          title: post.title,
          excerpt: post.excerpt || "",
          fecha: post.fecha || "",
          published: post.published || false,
        });

        // Handle editor content
        if (post.content) {
          try {
            // If it's a string, parse it once
            const editorContent =
              typeof post.content === "string"
                ? JSON.parse(post.content)
                : post.content;

            setContent(editorContent);
          } catch (error) {
            console.error("Error parsing content:", error);
            setContent({});
          }
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        router.push("/blog");
      } finally {
        setIsLoading(false);
      }
    };

    getPost();
  }, [id, router, form]);
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("excerpt", values.excerpt || "");
      formData.append("fecha", values.fecha || "");
      formData.append("published", values.published.toString());
      formData.append("content", JSON.stringify(content)); // Añadir el content del editor

      await updatePost(id, formData);
      const updatedPost = await getPostById(id);
      toast.success("Post updated successfully");
      router.push(`/blog/${updatedPost.slug}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update post");
    } finally {
      setIsSaving(false);
    }
  }

  

    if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      
      <h1 className="text-3xl font-bold mb-8">Edit Post</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter post title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="w-full md:w-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription></FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="excerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detalles o Lugar</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter a short excerpt for your post"
                    className="resize-none"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  A brief summary of your post that will be displayed in the
                  post list.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Content</FormLabel>
            <TiptapEditor
              content={content}
              onChange={setContent}
              editorClass="min-h-[300px]"
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
                  <FormLabel>Publish</FormLabel>
                  <FormDescription>
                    If checked, this post will be visible to everyone.
                    Otherwise, it will be saved as a draft.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Post"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
