import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { BackendNotConfiguredError, readJson, supabaseAdminFetch } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return NextResponse.json({ error: "برای مشاهده پروفایل وارد حساب خود شوید." }, { status: 401 });
    if (!auth.roles.includes("family")) return NextResponse.json({ error: "این بخش برای حساب مشتری در دسترس است." }, { status: 403 });

    const profileQuery = new URLSearchParams({
      select: "id,phone,full_name,created_at",
      id: `eq.${auth.user.id}`,
      limit: "1"
    });
    const profileResponse = await supabaseAdminFetch(`profiles?${profileQuery.toString()}`);
    if (!profileResponse.ok) return NextResponse.json({ error: "خواندن پروفایل ممکن نشد." }, { status: 502 });
    const profiles = await readJson<Array<Record<string, unknown>>>(profileResponse) ?? [];

    const ordersQuery = new URLSearchParams({
      select: "id,reference,requester_name,category_id,service_slug,status,payment_status,payment_method,paid_amount_rial,pricing_snapshot,created_at,updated_at",
      requester_id: `eq.${auth.user.id}`,
      order: "created_at.desc",
      limit: "50"
    });
    const ordersResponse = await supabaseAdminFetch(`care_requests?${ordersQuery.toString()}`);
    if (!ordersResponse.ok) return NextResponse.json({ error: "خواندن سفارش‌ها ممکن نشد." }, { status: 502 });
    const orders = await readJson<Array<Record<string, unknown>>>(ordersResponse) ?? [];

    return NextResponse.json({
      profile: profiles[0] ?? { id: auth.user.id, phone: auth.user.phone, full_name: null },
      orders
    });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) return NextResponse.json({ error: "سامانه مشتریان هنوز پیکربندی نشده است." }, { status: 503 });
    return NextResponse.json({ error: "دریافت پروفایل انجام نشد." }, { status: 502 });
  }
}
