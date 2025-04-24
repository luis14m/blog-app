import { NextRequest, NextResponse } from "next/server";
import { getUser, updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest, response: NextResponse) {
  const protectedRoutesList = ["/blog"],
    authRoutesList = ["/", "/login", "/sign-up"];
  const currentPath = new URL(request.url).pathname;

  const {data: { user },} = await getUser(request, response);

  if (protectedRoutesList.includes(currentPath) && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  if (authRoutesList.includes(currentPath) && user) {
    return NextResponse.redirect(new URL("/blog", request.url));
  }
  await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};