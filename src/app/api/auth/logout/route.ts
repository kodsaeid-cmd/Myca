import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, clearSessionCookies } from "@/lib/server/auth";
import { getSupabaseConfig, supabaseAuthFetch } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken && getSupabaseConfig()) {
    try {
      await supabaseAuthFetch("/logout", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` }
      });
    } catch {
      // The local cookies are still cleared if the upstream logout endpoint is unavailable.
    }
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
