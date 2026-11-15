import { NextResponse } from "next/server";
import { getSupabaseConfig, supabaseAdminFetch } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ status: "ok", backend: "not_configured" });
  }

  try {
    const response = await supabaseAdminFetch("service_categories?select=id&limit=1");
    if (!response.ok) {
      return NextResponse.json({ status: "degraded", backend: "unavailable" }, { status: 503 });
    }
    return NextResponse.json({ status: "ok", backend: "connected" });
  } catch {
    return NextResponse.json({ status: "degraded", backend: "unavailable" }, { status: 503 });
  }
}
