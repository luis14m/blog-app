"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/actions/profile.server";
import { createClient } from "@/utils/supabase/client";
import { getProfile } from "@/actions/profile.client";

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
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/auth/login");
          return;
        }

        // Usar función getProfile en vez de consulta directa
        const profileData = await getProfile(user.id);

        if (!profileData) {
          throw new Error("No profile found");
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
      // Get current user id
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Prepare profile data
      const profileData = {
        username: values.username,
        display_name: values.displayName,
      };

      await updateProfile(user.id, profileData);
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
        <p className="text-muted-foreground">Update your profile information</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-8">
        <div className="space-y-2">
          <Label htmlFor="username">Email</Label>
          <Input id="username" {...form.register("username")} />
          {form.formState.errors.username && (
            <p className="text-sm text-red-500">
              {form.formState.errors.username.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Nombre Apellido</Label>
          <Input id="displayName" {...form.register("displayName")} />
          {form.formState.errors.displayName && (
            <p className="text-sm text-red-500">
              {form.formState.errors.displayName.message}
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
