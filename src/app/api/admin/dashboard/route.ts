import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { BackendNotConfiguredError, readJson, supabaseAdminFetch, isSameOriginRequest } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const staffRoles = new Set(["admin", "operator", "support_office"]);
const orderSelect = "id,reference,requester_name,requester_phone,recipient_name,category_id,service_slug,requested_shift,requested_start_at,duration_months,city,status,payment_status,payment_method,paid_amount_rial,pricing_snapshot,created_at,updated_at";

async function requireStaff(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return { error: NextResponse.json({ error: "برای ورود به پنل مدیریت وارد شوید." }, { status: 401 }) } as const;
  if (!auth.roles.some((role) => staffRoles.has(role))) {
    return { error: NextResponse.json({ error: "این حساب دسترسی مدیریت سفارش‌ها را ندارد." }, { status: 403 }) } as const;
  }
  return { auth } as const;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireStaff(request);
    if ("error" in access) return access.error;
    const [statsResponse, ordersResponse] = await Promise.all([
      supabaseAdminFetch("rpc/myca_admin_dashboard_stats", {
        method: "POST",
        body: JSON.stringify({ p_actor: access.auth.user.id })
      }),
      supabaseAdminFetch(`care_requests?select=${orderSelect}&order=created_at.desc&limit=100`)
    ]);
    if (!statsResponse.ok || !ordersResponse.ok) {
      return NextResponse.json({ error: "دریافت اطلاعات داشبورد ممکن نشد." }, { status: 502 });
    }
    const stats = await readJson<Record<string, unknown>>(statsResponse);
    const orders = await readJson<Array<Record<string, unknown>>>(ordersResponse) ?? [];
    return NextResponse.json({ stats: stats ?? {}, orders });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) return NextResponse.json({ error: "اتصال پنل مدیریت هنوز پیکربندی نشده است." }, { status: 503 });
    return NextResponse.json({ error: "خطا در دریافت داشبورد مدیریت." }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  try {
    const access = await requireStaff(request);
    if ("error" in access) return access.error;
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const status = typeof body.status === "string" ? body.status : null;
    const paymentStatus = typeof body.paymentStatus === "string" ? body.paymentStatus : null;
    const paidAmountRial = body.paidAmountRial === null || body.paidAmountRial === undefined
      ? null : Number(body.paidAmountRial);
    const note = typeof body.note === "string" ? body.note.slice(0, 1000) : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)
      || (paidAmountRial !== null && (!Number.isSafeInteger(paidAmountRial) || paidAmountRial < 0))) {
      return NextResponse.json({ error: "اطلاعات تغییر سفارش معتبر نیست." }, { status: 422 });
    }
    const response = await supabaseAdminFetch("rpc/myca_admin_update_order", {
      method: "POST",
      body: JSON.stringify({
        p_actor: access.auth.user.id,
        p_request_id: id,
        p_status: status,
        p_payment_status: paymentStatus,
        p_paid_amount_rial: paidAmountRial,
        p_note: note
      })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: detail.includes("paid_amount_required")
        ? "برای ثبت پرداخت، مبلغ پرداخت‌شده را وارد کنید."
        : "ذخیره تغییرات سفارش انجام نشد." }, { status: 422 });
    }
    const order = await readJson<Record<string, unknown>>(response);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) return NextResponse.json({ error: "اتصال پنل مدیریت هنوز پیکربندی نشده است." }, { status: 503 });
    return NextResponse.json({ error: "خطا در ذخیره تغییرات سفارش." }, { status: 500 });
  }
}
