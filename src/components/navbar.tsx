"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { signOut } from "@/app/auth/actions";
import { createClient } from '@/utils/supabase/client'
import { Database } from "@/types/supabase";
import { getUserAndProfile } from '@/lib/actions/profile.client';

export function Navbar() {
  const [userWithProfile, setUserWithProfile] = useState<{
    user: any;
    profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  }>({ user: null, profile: null });
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          const result = await getUserAndProfile();
          setUserWithProfile(result);
        } else if (mounted) {
          setUserWithProfile({ user: null, profile: null });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Fetch initial data
    fetchUserData();

    // Setup realtime subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN') {
        setLoading(true);
        const result = await getUserAndProfile();
        setUserWithProfile(result);
        setLoading(false);
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        setUserWithProfile({ user: null, profile: null });
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
      setUserWithProfile({ user: null, profile: null });
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image
              src="https://tlvuxyxktqqzvynbhhtu.supabase.co/storage/v1/object/public/NukleoPublico/UsoPublicoGeneral/Logo.png"
              alt="Logo"
              width={128}
              height={128}
              className="h-8 w-8"
            />
            <span className="hidden font-bold sm:inline-block">
               Blog App
            </span>
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
              <NavigationMenuLink
                href="/blog"
                className={cn(
                  navigationMenuTriggerStyle(),
                  pathname === "/blog" && "text-primary font-medium"
                )}
              >
                Blog
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search bar can be added here */}
          </div>
          <nav className="flex items-center space-x-2">
            
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : userWithProfile.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                             userWithProfile.user.user_metadata?.avatar_url}
                        alt={userWithProfile.user.email}
                        loading="eager"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.src = userWithProfile.user.user_metadata?.avatar_url || '';
                        }}
                      />
                      <AvatarFallback>
                        {userWithProfile.user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userWithProfile.profile?.display_name || 
                         userWithProfile.user.user_metadata?.full_name || 
                         userWithProfile.user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userWithProfile.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Login</Link>
              </Button>
            )}
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}