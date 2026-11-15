import { NextRequest, NextResponse } from "next/server";
import { BackendNotConfiguredError, isSameOriginRequest, normalizePhone, readJson, supabaseAdminFetch } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  reference: string;
  requester_name: string;
  requester_phone: string;
  recipient_name: string | null;
  category_id: string;
  service_slug: string;
  requested_shift: string;
  requested_start_at: string;
  duration_months: number | null;
  city: string;
  status: string;
  payment_status: string;
  payment_method: string;
  paid_amount_rial: number | null;
  pricing_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  try {
    const body = await request.json() as { reference?: unknown; phone?: unknown };
    const reference = typeof body.reference === "string" ? body.reference.trim().toUpperCase() : "";
    const phone = normalizePhone(body.phone);
    if (!/^MYCA-\d{6}-\d{6}$/.test(reference) || !phone) {
      return NextResponse.json({ error: "کد پیگیری یا شماره موبایل معتبر نیست." }, { status: 422 });
    }

    const query = new URLSearchParams({
      select: "id,reference,requester_name,requester_phone,recipient_name,category_id,service_slug,requested_shift,requested_start_at,duration_months,city,status,payment_status,payment_method,paid_amount_rial,pricing_snapshot,created_at,updated_at",
      reference: `eq.${reference}`,
      requester_phone: `eq.${phone}`,
      limit: "1"
    });
    const response = await supabaseAdminFetch(`care_requests?${query.toString()}`);
    if (!response.ok) return NextResponse.json({ error: "امکان بررسی کد پیگیری وجود ندارد." }, { status: 502 });
    const rows = await readJson<OrderRow[]>(response) ?? [];
    const order = rows[0];
    if (!order) return NextResponse.json({ error: "کد پیگیری یا شماره موبایل صحیح نیست." }, { status: 404 });

    const eventQuery = new URLSearchParams({
      select: "from_status,to_status,event_type,created_at",
      request_id: `eq.${order.id}`,
      order: "created_at.asc",
      limit: "50"
    });
    const eventsResponse = await supabaseAdminFetch(`care_request_events?${eventQuery.toString()}`);
    const events = eventsResponse.ok ? await readJson<Array<Record<string, unknown>>>(eventsResponse) ?? [] : [];

    return NextResponse.json({
      order: {
        reference: order.reference,
        requesterName: order.requester_name,
        recipientName: order.recipient_name,
        categoryId: order.category_id,
        serviceSlug: order.service_slug,
        shift: order.requested_shift,
        startAt: order.requested_start_at,
        durationMonths: order.duration_months,
        city: order.city,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        paidAmountRial: order.paid_amount_rial,
        pricing: order.pricing_snapshot,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        events
      }
    });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) return NextResponse.json({ error: "سامانه پیگیری هنوز پیکربندی نشده است." }, { status: 503 });
    return NextResponse.json({ error: "بررسی سفارش انجام نشد." }, { status: 400 });
  }
}
