import { NextRequest, NextResponse } from "next/server";
import {
  BackendNotConfiguredError, isSameOriginRequest, normalizePhone,
  readJson, supabaseAdminFetch, supabaseAuthFetch
} from "@/lib/server/supabase";
import { setSessionCookies } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

type AuthSession = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};
type AuthUser = { id?: string; phone?: string; email?: string };
type RoleRow = { role?: string };

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  }

  try {
    const body = await request.json() as { phone?: unknown; token?: unknown };
    const phone = normalizePhone(body.phone);
    const token = typeof body.token === "string" ? body.token.replace(/\D/g, "") : "";
    if (!phone || !/^\d{6,8}$/.test(token)) {
      return NextResponse.json({ error: "شماره موبایل یا کد تأیید معتبر نیست." }, { status: 422 });
    }

    const verifyResponse = await supabaseAuthFetch("/verify", {
      method: "POST",
      body: JSON.stringify({ phone, token, type: "sms" })
    });
    if (!verifyResponse.ok) {
      return NextResponse.json({ error: "کد تأیید نادرست یا منقضی شده است." }, { status: 400 });
    }

    const session = await readJson<AuthSession>(verifyResponse);
    if (!session?.access_token || !session.refresh_token) {
      return NextResponse.json({ error: "پاسخ سرویس احراز هویت کامل نیست." }, { status: 502 });
    }

    const userResponse = await supabaseAuthFetch("/user", {
      method: "GET",
      headers: { authorization: `Bearer ${session.access_token}` }
    });
    if (!userResponse.ok) {
      return NextResponse.json({ error: "تأیید حساب انجام نشد. دوباره وارد شوید." }, { status: 502 });
    }
    const user = await readJson<AuthUser>(userResponse);
    if (!user?.id) {
      return NextResponse.json({ error: "اطلاعات حساب از سرویس احراز هویت دریافت نشد." }, { status: 502 });
    }

    const rolesResponse = await supabaseAdminFetch(
      `user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}`
    );
    if (!rolesResponse.ok) {
      return NextResponse.json({ error: "پروفایل حساب هنوز آماده نیست. کمی بعد دوباره تلاش کنید." }, { status: 503 });
    }
    const roleRows = await readJson<RoleRow[]>(rolesResponse) ?? [];
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, phone: user.phone ?? phone, email: user.email ?? null },
      roles: roleRows.map((row) => row.role).filter((role): role is string => Boolean(role))
    });
    setSessionCookies(response, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in
    });
    return response;
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "سرویس ورود هنوز پیکربندی نشده است." }, { status: 503 });
    }
    return NextResponse.json({ error: "تأیید کد ورود انجام نشد." }, { status: 502 });
  }
}
