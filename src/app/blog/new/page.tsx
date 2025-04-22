"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import TiptapEditor from "@/components/tiptap-editor";
import FileUploader from "@/components/file-uploader";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { generateSlug } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  excerpt: z.string().optional(),
  published: z.boolean().default(false),
  coverImage: z.string().optional(),
});

export default function NewPostPage() {
  const router = useRouter();
  const [content, setContent] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showUploaderDialog, setShowUploaderDialog] = useState(false);
  const [coverImageUploadOpen, setCoverImageUploadOpen] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      published: false,
      coverImage: "",
    },
  });

  const handleCoverImageUpload = (files: any[]) => {
    if (files.length > 0) {
      // Get the file path from the storage
      const { data } = supabase.storage.from("attachments").getPublicUrl(files[0].file_path);
      
      if (data?.publicUrl) {
        form.setValue("coverImage", data.publicUrl);
        toast.success("Cover image uploaded successfully");
        setCoverImageUploadOpen(false);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error("You must be logged in to create a post");
      }

      const userId = userData.user.id;
      
      // Generate slug from title
      const slug = generateSlug(values.title);

      // Create post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          title: values.title,
          content,
          excerpt: values.excerpt || null,
          slug,
          published: values.published,
          user_id: userId,
          cover_image: values.coverImage || null,
        })
        .select()
        .single();

      if (postError) {
        throw postError;
      }

      // Link attachments to post
      if (attachments.length > 0) {
        const { error: attachmentError } = await supabase
          .from("attachments")
          .update({ post_id: post.id })
          .in(
            "id",
            attachments.map((attachment) => attachment.id)
          );

        if (attachmentError) {
          console.error("Error linking attachments:", attachmentError);
        }
      }

      toast.success("Post created successfully");
      router.push(`/blog/${slug || post.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create post");
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
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Create New Post</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Cover Image Upload */}
          <div className="mb-6">
            <FormLabel>Cover Image</FormLabel>
            <div className="mt-2 flex items-center gap-4">
              {form.watch("coverImage") ? (
                <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border">
                  <img
                    src={form.watch("coverImage")}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => form.setValue("coverImage", "")}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCoverImageUploadOpen(true)}
                >
                  Upload Cover Image
                </Button>
              )}
            </div>
            {form.formState.errors.coverImage && (
              <p className="text-sm font-medium text-destructive mt-2">
                {form.formState.errors.coverImage.message}
              </p>
            )}
          </div>

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
            name="excerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Excerpt</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter a short excerpt for your post" 
                    className="resize-none" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  A brief summary of your post that will be displayed in the post list.
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
              onAttachmentRequest={handleAttachmentRequest}
              editorClass="min-h-[300px]"
            />
          </div>

          <div className="space-y-2">
            <FormLabel>Attachments</FormLabel>
            <div className="border rounded-md p-4">
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div 
                      key={attachment.id} 
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-muted flex items-center justify-center rounded">
                          {attachment.file_type.startsWith("image/") ? (
                            <img
                              src={supabase.storage.from("attachments").getPublicUrl(attachment.file_path).data?.publicUrl}
                              alt={attachment.file_name}
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <span className="text-xs">{attachment.file_type.split("/")[1]?.toUpperCase() || "FILE"}</span>
                          )}
                        </div>
                        <span className="text-sm">{attachment.file_name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAttachments(attachments.filter((a) => a.id !== attachment.id));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleAttachmentRequest}
                  >
                    Add More Attachments
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No attachments added yet</p>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleAttachmentRequest}
                  >
                    Add Attachments
                  </Button>
                </div>
              )}
            </div>
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
                    If checked, this post will be visible to everyone. Otherwise, it will be saved as a draft.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Post"
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      {/* File uploader dialog */}
      <Dialog open={showUploaderDialog} onOpenChange={setShowUploaderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Add Attachments</DialogTitle>
          <FileUploader onUploadComplete={handleUploadComplete} />
        </DialogContent>
      </Dialog>

      {/* Cover image uploader dialog */}
      <Dialog open={coverImageUploadOpen} onOpenChange={setCoverImageUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Upload Cover Image</DialogTitle>
          <FileUploader 
            onUploadComplete={handleCoverImageUpload} 
            maxFiles={1}
            acceptedFileTypes={["image/*"]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}