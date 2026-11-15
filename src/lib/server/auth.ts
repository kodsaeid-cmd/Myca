import "server-only";

import type { NextRequest } from "next/server";
import { supabaseAdminFetch, supabaseAuthFetch, readJson } from "./supabase";

export const ACCESS_COOKIE = "myca_access_token";
export const REFRESH_COOKIE = "myca_refresh_token";

export type MycaAuthContext = {
  user: { id: string; phone: string | null; email: string | null };
  roles: string[];
  accessToken: string;
};

type SupabaseUser = { id?: string; phone?: string; email?: string };
type RoleRow = { role?: string };

export async function getAuthContext(request: NextRequest): Promise<MycaAuthContext | null> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  const userResponse = await supabaseAuthFetch("/user", {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!userResponse.ok) return null;

  const user = await readJson<SupabaseUser>(userResponse);
  if (!user?.id) return null;

  const rolesResponse = await supabaseAdminFetch(
    `user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}`
  );
  if (!rolesResponse.ok) throw new Error("Unable to load account permissions.");
  const rows = await readJson<RoleRow[]>(rolesResponse) ?? [];

  return {
    user: { id: user.id, phone: user.phone ?? null, email: user.email ?? null },
    roles: rows.map((row) => row.role).filter((role): role is string => Boolean(role)),
    accessToken
  };
}

export function setSessionCookies(
  response: import("next/server").NextResponse,
  session: { access_token: string; refresh_token: string; expires_in?: number }
) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Math.min(session.expires_in ?? 3600, 60 * 60 * 24))
  });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSessionCookies(response: import("next/server").NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
