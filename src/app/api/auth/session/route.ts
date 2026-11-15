import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, setSessionCookies } from "@/lib/server/auth";
import {
  BackendNotConfiguredError, readJson, supabaseAdminFetch, supabaseAuthFetch
} from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

type AuthUser = { id?: string; phone?: string; email?: string };
type AuthSession = { access_token?: string; refresh_token?: string; expires_in?: number };
type RoleRow = { role?: string };

async function loadUser(accessToken: string) {
  const response = await supabaseAuthFetch("/user", {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) return null;
  const user = await readJson<AuthUser>(response);
  if (!user?.id) return null;
  const rolesResponse = await supabaseAdminFetch(
    `user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}`
  );
  if (!rolesResponse.ok) throw new Error("Unable to load account permissions.");
  const roles = await readJson<RoleRow[]>(rolesResponse) ?? [];
  return {
    user: { id: user.id, phone: user.phone ?? null, email: user.email ?? null },
    roles: roles.map((row) => row.role).filter((role): role is string => Boolean(role))
  };
}

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    let refreshed: AuthSession | null = null;
    let identity = accessToken ? await loadUser(accessToken) : null;

    if (!identity && refreshToken) {
      const refreshResponse = await supabaseAuthFetch("/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (refreshResponse.ok) {
        refreshed = await readJson<AuthSession>(refreshResponse);
        if (refreshed?.access_token && refreshed.refresh_token) {
          accessToken = refreshed.access_token;
          identity = await loadUser(accessToken);
        }
      }
    }

    const response = NextResponse.json(identity
      ? { authenticated: true, ...identity }
      : { authenticated: false, user: null, roles: [] }
    );
    if (refreshed?.access_token && refreshed.refresh_token) {
      setSessionCookies(response, {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_in: refreshed.expires_in
      });
    }
    return response;
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "سرویس ورود هنوز پیکربندی نشده است." }, { status: 503 });
    }
    return NextResponse.json({ error: "خواندن وضعیت حساب ممکن نشد." }, { status: 502 });
  }
}
