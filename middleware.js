import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const supabase = createClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session && isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!session && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, other static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
