import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import {
  BackendNotConfiguredError, isSameOriginRequest, readJson, supabaseAdminFetch
} from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string; display_name: string; bio: string | null; city: string | null;
  province: string | null; experience_years: number | null; review_status: string; created_at: string;
};
type SkillRow = { category_id: string; service_slug: string; qualification_type: string; review_status: string };

function clean(value: unknown, max: number, required = false): string | null {
  if (typeof value !== "string") return required ? null : "";
  const result = value.trim();
  if (required && !result) return null;
  return result.slice(0, max);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return NextResponse.json({ error: "برای مشاهده پرونده همکاری وارد حساب خود شوید." }, { status: 401 });

    const profileResponse = await supabaseAdminFetch(
      `caregiver_profiles?select=id,display_name,bio,city,province,experience_years,review_status,created_at&user_id=eq.${encodeURIComponent(auth.user.id)}&limit=1`
    );
    if (!profileResponse.ok) return NextResponse.json({ error: "خواندن پرونده همکاری ممکن نشد." }, { status: 502 });
    const profiles = await readJson<ProfileRow[]>(profileResponse) ?? [];
    const profile = profiles[0] ?? null;
    if (!profile) return NextResponse.json({ application: null });

    const skillsResponse = await supabaseAdminFetch(
      `caregiver_service_qualifications?select=category_id,service_slug,qualification_type,review_status&caregiver_profile_id=eq.${encodeURIComponent(profile.id)}`
    );
    if (!skillsResponse.ok) return NextResponse.json({ error: "خواندن مهارت‌های پرونده همکاری ممکن نشد." }, { status: 502 });
    const skills = await readJson<SkillRow[]>(skillsResponse) ?? [];
    return NextResponse.json({ application: { ...profile, services: skills } });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "سامانه همکاری هنوز پیکربندی نشده است." }, { status: 503 });
    }
    return NextResponse.json({ error: "خطا در دریافت پرونده همکاری." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  }

  try {
    const auth = await getAuthContext(request);
    if (!auth) return NextResponse.json({ error: "برای ثبت درخواست همکاری ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!auth.roles.includes("family")) {
      return NextResponse.json({ error: "این حساب مجوز ثبت درخواست همکاری مراقب را ندارد." }, { status: 403 });
    }

    const rawBody = await request.json() as unknown;
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "اطلاعات فرم معتبر نیست." }, { status: 400 });
    }
    const body = rawBody as Record<string, unknown>;
    const displayName = clean(body.displayName, 100, true);
    const city = clean(body.city, 100, true);
    const province = clean(body.province, 100);
    const bio = clean(body.bio, 1000);
    const experienceYears = body.experienceYears === "" || body.experienceYears === null || body.experienceYears === undefined
      ? null : Number(body.experienceYears);

    if (!displayName || displayName.length < 2 || !city || city.length < 2) {
      return NextResponse.json({ error: "نام نمایشی و شهر محل فعالیت را کامل کنید." }, { status: 422 });
    }
    if (experienceYears !== null && (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 70)) {
      return NextResponse.json({ error: "سابقه فعالیت باید عددی بین صفر تا ۷۰ سال باشد." }, { status: 422 });
    }
    if (!Array.isArray(body.services) || body.services.length < 1 || body.services.length > 10) {
      return NextResponse.json({ error: "حداقل یک و حداکثر ده حوزه خدمت انتخاب کنید." }, { status: 422 });
    }

    const seen = new Set<string>();
    const services: Array<{ category_id: string; service_slug: string }> = [];
    for (const item of body.services) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return NextResponse.json({ error: "یکی از حوزه‌های انتخاب‌شده معتبر نیست." }, { status: 422 });
      }
      const skill = item as Record<string, unknown>;
      const categoryId = clean(skill.categoryId, 8, true);
      const serviceSlug = clean(skill.serviceSlug, 80, true);
      if (!categoryId || !/^\d{1,3}$/.test(categoryId) || !serviceSlug || !/^[a-z0-9-]+$/.test(serviceSlug)) {
        return NextResponse.json({ error: "یکی از حوزه‌های انتخاب‌شده معتبر نیست." }, { status: 422 });
      }
      const key = `${categoryId}:${serviceSlug}`;
      if (!seen.has(key)) {
        seen.add(key);
        services.push({ category_id: categoryId, service_slug: serviceSlug });
      }
    }

    const response = await supabaseAdminFetch("rpc/submit_caregiver_application", {
      method: "POST",
      body: JSON.stringify({
        p_actor: auth.user.id,
        p_application: {
          display_name: displayName, city, province, bio,
          experience_years: experienceYears, services
        }
      })
    });

    if (!response.ok) {
      const status = response.status === 403 ? 403 : 422;
      return NextResponse.json({
        error: status === 403
          ? "درخواست شامل خدمتی است که به مجوز حرفه‌ای نیاز دارد یا این حساب واجد شرایط نیست."
          : "ثبت درخواست همکاری انجام نشد. حوزه‌های انتخابی را بررسی کنید."
      }, { status });
    }

    const application = await readJson<{ id?: string; review_status?: string; skills_count?: number }>(response);
    if (!application?.id) {
      return NextResponse.json({ error: "پاسخ ثبت درخواست همکاری کامل نیست." }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      application: { id: application.id, reviewStatus: application.review_status, skillsCount: application.skills_count }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "سامانه همکاری هنوز پیکربندی نشده است." }, { status: 503 });
    }
    return NextResponse.json({ error: "خطا در ثبت درخواست همکاری." }, { status: 500 });
  }
}
