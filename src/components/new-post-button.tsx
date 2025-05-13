"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PenSquare } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { NewPostSheet } from "@/components/new-post";
import { createClient } from "@/utils/supabase/client";

export function NewPostButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Button size="lg" disabled>
        <PenSquare className="mr-2 h-4 w-4" />
        Cargando...
      </Button>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="lg" disabled={!user}>
          <PenSquare className="mr-2 h-4 w-4" />
          {user ? "New Post" : "Login to Post"}
        </Button>
      </SheetTrigger>
      <NewPostSheet />
    </Sheet>
  );
}