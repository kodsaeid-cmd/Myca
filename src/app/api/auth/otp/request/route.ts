import { NextRequest, NextResponse } from "next/server";
import { BackendNotConfiguredError, isSameOriginRequest, normalizePhone, readJson, supabaseAuthFetch } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  }

  try {
    const body = await request.json() as { phone?: unknown };
    const phone = normalizePhone(body.phone);
    if (!phone) {
      return NextResponse.json({ error: "شماره موبایل معتبر وارد کنید." }, { status: 422 });
    }

    const response = await supabaseAuthFetch("/otp", {
      method: "POST",
      body: JSON.stringify({ phone, create_user: true })
    });

    if (!response.ok) {
      const status = response.status === 429 ? 429 : 400;
      return NextResponse.json({
        error: status === 429
          ? "درخواست کد بیش از حد تکرار شده است. کمی بعد دوباره تلاش کنید."
          : "ارسال کد ممکن نشد. شماره را بررسی کنید یا بعداً تلاش کنید."
      }, { status });
    }

    return NextResponse.json({
      ok: true,
      phone,
      message: "اگر شماره قابل تأیید باشد، کد ورود برای آن ارسال می‌شود."
    });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "سرویس ورود هنوز پیکربندی نشده است." }, { status: 503 });
    }
    return NextResponse.json({ error: "فعلاً امکان ارسال کد ورود وجود ندارد." }, { status: 502 });
  }
}
