"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/lib/actions/server";
import { createClient } from "@/utils/supabase/client";

const formSchema = z.object({
  username: z.string().min(5).max(50),
  displayName: z.string().min(2).max(50),
  
  
  
});

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      displayName: "",
      
      
      
    },
  });

  useEffect(() => {
    async function getUserProfile() {
      try {
        // Obtener usuario actual directamente de Supabase
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push("/auth/login");
          return;
        }
        
        // Obtener perfil directamente de Supabase
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          throw profileError;
        }
        
        form.reset({
          username: profileData.username || "",
          displayName: profileData.display_name || "",
          
          
          
        });
      } catch (error) {
        console.error("Error loading profile:", error);
        console.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    
    getUserProfile();
  }, [router, form, supabase]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    
    try {
      const formData = new FormData();
      formData.append('username', values.username);
      formData.append('displayName', values.displayName);
      
      
      
      
      await updateProfile(formData);
      console.log("Profile updated successfully");
    } catch (error: any) {
      console.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Update your profile information
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-8">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            {...form.register("username")}
          />
          {form.formState.errors.username && (
            <p className="text-sm text-red-500">
              {form.formState.errors.username.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            {...form.register("displayName")}
          />
          {form.formState.errors.displayName && (
            <p className="text-sm text-red-500">
              {form.formState.errors.displayName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input
            id="avatarUrl"
            type="url"
            {...form.register("avatarUrl")}
          />
          {form.formState.errors.avatarUrl && (
            <p className="text-sm text-red-500">
              {form.formState.errors.avatarUrl.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            {...form.register("bio")}
          />
          {form.formState.errors.bio && (
            <p className="text-sm text-red-500">
              {form.formState.errors.bio.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            {...form.register("website")}
          />
          {form.formState.errors.website && (
            <p className="text-sm text-red-500">
              {form.formState.errors.website.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}