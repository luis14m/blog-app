"use client";

import { Button } from "@/components/ui/button";
import { PenSquare, PlusIcon } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { NewPostSheet } from "@/components/new-post";

// Adaptado para recibir el usuario como prop desde un Server Component
export function NewPostButton({ user }: { user: any }) {
  

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" disabled={!user} variant="default">
          <PlusIcon className="mr-2 h-4 w-4" />
          {user ? "New Post" : "Login to Post"}
        </Button>
      </SheetTrigger>
      <NewPostSheet />
    </Sheet>
  );
}