// components/LogoutButton.tsx
"use client";
import { signOut } from "@/app/auth/actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      className="w-full text-left"
      variant="ghost"
      onClick={async () => {
        await signOut();
        router.push("/auth/login");
        window.location.reload();
      }}
    >
      Log out
    </Button>
  );
}