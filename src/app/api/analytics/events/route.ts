import { NextRequest, NextResponse } from "next/server";
import { BackendNotConfiguredError, isSameOriginRequest, supabaseAdminFetch } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
const allowedTypes = new Set(["page_view", "phone_click", "cta_click", "button_click", "link_click"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const visitorId = clean(body.visitorId, 80);
    const sessionId = clean(body.sessionId, 80);
    const eventType = clean(body.eventType, 32);
    const path = clean(body.path, 300);
    const eventName = clean(body.eventName, 120);
    const referrer = clean(body.referrer, 500);
    const utmSource = clean(body.utmSource, 120);

    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(visitorId)
      || !/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)
      || !allowedTypes.has(eventType)
      || !path.startsWith("/")
      || path.startsWith("//")) {
      return NextResponse.json({ error: "ساختار رویداد معتبر نیست." }, { status: 422 });
    }

    const response = await supabaseAdminFetch("site_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        visitor_id: visitorId,
        session_id: sessionId,
        event_type: eventType,
        event_name: eventName || null,
        path,
        referrer: referrer || null,
        utm_source: utmSource || null
      })
    });
    if (!response.ok) return NextResponse.json({ error: "ثبت رویداد ممکن نشد." }, { status: 502 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) return NextResponse.json({ error: "سامانه تحلیل هنوز پیکربندی نشده است." }, { status: 503 });
    return NextResponse.json({ error: "ثبت رویداد انجام نشد." }, { status: 400 });
  }
}
