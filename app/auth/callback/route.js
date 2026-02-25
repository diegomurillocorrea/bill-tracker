import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Handles redirects from Supabase Auth (OAuth, magic link, password recovery).
 * Exchanges the code for a session and sets cookies, then redirects.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}${next}`);
}
