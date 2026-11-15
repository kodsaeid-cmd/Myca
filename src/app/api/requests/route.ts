import { NextRequest, NextResponse } from "next/server";
import { commissionRates, pricingCatalogs } from "@/lib/pricing-data";
import { getAuthContext } from "@/lib/server/auth";
import {
  BackendNotConfiguredError, isSameOriginRequest, normalizePhone, readJson, supabaseAdminFetch
} from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const allowedShifts = new Set([
  "روزانه", "شبانه", "شبانه‌روزی", "ساعتی", "موردی", "جلسه‌ای", "نیاز به هماهنگی"
]);
const allowedDurations = new Set(commissionRates.map((item) => item.months));
const dependencyMap: Record<string, string> = {
  "مستقل": "independent",
  "نیمه‌وابسته": "semi_dependent",
  "وابسته": "dependent",
  "independent": "independent",
  "semi_dependent": "semi_dependent",
  "dependent": "dependent"
};

type ServiceRow = {
  category_id: string;
  slug: string;
  title: string;
  delivery_class: string;
  requires_professional_license: boolean;
};
type CreatedRequest = {
  id: string;
  reference: string;
  status: string;
  created_at: string;
  delivery_class: string;
  pricing_snapshot: Record<string, unknown> | null;
};

function textValue(value: unknown, maxLength: number, required = false): string | null {
  if (typeof value !== "string") return required ? null : "";
  const clean = value.trim();
  if (!clean && required) return null;
  return clean.slice(0, maxLength);
}

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getPricingCatalog(categoryId: string, serviceSlug: string) {
  if (categoryId === "11" || categoryId === "22") return pricingCatalogs["elders-pricing"];
  if (categoryId === "27") return pricingCatalogs.pedia;
  if (categoryId === "12" && ["infant-nurse", "mother-companion", "child-care", "child-care-package"].includes(serviceSlug)) {
    return pricingCatalogs.pedia;
  }
  return null;
}

function isPackageAllowed(categoryId: string, serviceSlug: string, packageId: string) {
  if (categoryId === "11" || categoryId === "22") return Boolean(pricingCatalogs["elders-pricing"].packages.find((item) => item.id === packageId));
  if (categoryId === "27" || serviceSlug === "infant-nurse") return ["infant", "custom"].includes(packageId);
  if (serviceSlug === "mother-companion") return ["pregnancy", "custom"].includes(packageId);
  if (serviceSlug === "child-care") return ["toddler", "preschool", "school-age", "custom"].includes(packageId);
  if (serviceSlug === "child-care-package") return pricingCatalogs.pedia.packages.some((item) => item.id === packageId);
  return false;
}

function buildPricingSnapshot(args: {
  categoryId: string;
  serviceSlug: string;
  packageId: string | null;
  shift: string;
  durationMonths: number | null;
  childrenCount: number;
  fridayRequired: boolean;
}) {
  const { categoryId, serviceSlug, packageId, shift, durationMonths, childrenCount, fridayRequired } = args;
  const catalog = getPricingCatalog(categoryId, serviceSlug);

  if (!catalog || !packageId) {
    return {
      estimate_status: "quote_required",
      reason: "package_or_catalog_not_selected",
      payment_method: "phone_coordination",
      payment_status: "awaiting_contact",
      friday_required: fridayRequired
    };
  }

  const selectedPackage = catalog.packages.find((item) => item.id === packageId);
  if (!selectedPackage) return null;

  if (typeof selectedPackage.monthlySalaryMillion !== "number" || !durationMonths) {
    return {
      estimate_status: "quote_required",
      catalog: catalog.slug,
      package_id: selectedPackage.id,
      package_title: selectedPackage.title,
      payment_method: "phone_coordination",
      payment_status: "awaiting_contact",
      friday_required: fridayRequired
    };
  }

  const isChildCare = catalog.kind === "child" && serviceSlug !== "mother-companion";
  const additionalChildPercent = isChildCare ? Math.max(0, childrenCount - 1) * 25 : 0;
  const roundTheClockPercent = shift === "شبانه‌روزی" ? 35 : 0;
  const surchargePercent = additionalChildPercent + roundTheClockPercent;
  const baseMonthlyRial = Math.round(selectedPackage.monthlySalaryMillion * 10_000_000);
  const adjustedMonthlyRial = Math.round(baseMonthlyRial * (1 + surchargePercent / 100));
  const wageSubtotalRial = adjustedMonthlyRial * durationMonths;
  const commissionPercent = commissionRates.find((item) => item.months === durationMonths)?.percent ?? 0;
  const oneTimeCommissionRial = Math.round(adjustedMonthlyRial * commissionPercent / 100);

  return {
    estimate_status: fridayRequired ? "provisional_excluding_friday" : "provisional",
    payment_method: "phone_coordination",
    payment_status: "awaiting_contact",
    source_catalog: catalog.slug,
    package_id: selectedPackage.id,
    package_title: selectedPackage.title,
    currency: "IRR",
    display_unit: "TOMAN",
    base_monthly_wage_rial: baseMonthlyRial,
    adjusted_monthly_wage_rial: adjustedMonthlyRial,
    duration_months: durationMonths,
    additional_child_percent: additionalChildPercent,
    round_the_clock_percent: roundTheClockPercent,
    wage_subtotal_rial: wageSubtotalRial,
    commission_percent: commissionPercent,
    one_time_commission_rial: oneTimeCommissionRial,
    total_estimate_rial: wageSubtotalRial + oneTimeCommissionRial,
    friday_required: fridayRequired,
    friday_included: false,
    exclusions: fridayRequired
      ? ["هزینه حضور روز جمعه در این برآورد وارد نشده و نیازمند پیش‌فاکتور تکمیلی است."]
      : []
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return NextResponse.json({ error: "برای مشاهده درخواست‌ها وارد حساب خود شوید." }, { status: 401 });
    if (!auth.roles.includes("family")) {
      return NextResponse.json({ error: "این حساب مجوز مشاهده درخواست‌های خانواده را ندارد." }, { status: 403 });
    }

    const query = new URLSearchParams({
      select: "id,reference,requester_name,requester_phone,recipient_name,category_id,service_slug,delivery_class,requested_shift,requested_start_at,duration_months,friday_required,is_urgent,city,province,status,payment_method,payment_status,paid_amount_rial,paid_at,pricing_snapshot,created_at,updated_at",
      requester_id: `eq.${auth.user.id}`,
      order: "created_at.desc",
      limit: "50"
    });
    const response = await supabaseAdminFetch(`care_requests?${query.toString()}`);
    if (!response.ok) {
      return NextResponse.json({ error: "خواندن درخواست‌ها ممکن نشد." }, { status: 502 });
    }
    const requests = await readJson<unknown[]>(response) ?? [];
    return NextResponse.json({ requests });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "سامانه درخواست‌ها هنوز پیکربندی نشده است." }, { status: 503 });
    }
    return NextResponse.json({ error: "خطا در دریافت درخواست‌ها." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  }

  try {
    const auth = await getAuthContext(request);
    if (!auth) return NextResponse.json({ error: "برای ثبت درخواست ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!auth.roles.includes("family")) {
      return NextResponse.json({ error: "فقط حساب خدمت‌گیرنده می‌تواند درخواست خانواده ثبت کند." }, { status: 403 });
    }
    if (!auth.user.phone) {
      return NextResponse.json({ error: "شماره تماس تأییدشده‌ای برای حساب شما ثبت نشده است." }, { status: 422 });
    }

    const rawBody = await request.json() as unknown;
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "ساختار اطلاعات درخواست معتبر نیست." }, { status: 400 });
    }
    const body = rawBody as Record<string, unknown>;
    const categoryId = textValue(body.categoryId, 8, true);
    const serviceSlug = textValue(body.serviceSlug, 80, true);
    const requesterName = textValue(body.requesterName, 120, true);
    const contactPhone = textValue(body.phone, 32, true);
    const recipientName = textValue(body.recipientName, 120);
    const city = textValue(body.city, 100, true);
    const province = textValue(body.province, 100);
    const addressLine = textValue(body.address, 500, true);
    const postalCode = textValue(body.postalCode, 20);
    const notes = textValue(body.notes, 1200);
    const shift = textValue(body.shift, 40, true);
    const packageId = textValue(body.packageId, 80);
    const startAt = textValue(body.startAt, 80, true);
    const dependencyRaw = textValue(body.dependency, 40);
    const recipientAge = numberValue(body.recipientAge);
    const childrenCount = numberValue(body.childrenCount) ?? 1;
    const durationMonths = numberValue(body.durationMonths);
    const fridayRequired = body.fridayRequired === true;
    const isUrgent = body.urgent === true;

    if (!categoryId || !/^\d{1,3}$/.test(categoryId) || !serviceSlug || !/^[a-z0-9-]+$/.test(serviceSlug)) {
      return NextResponse.json({ error: "دسته خدمت یا نوع خدمت معتبر نیست." }, { status: 422 });
    }
    if (!requesterName || !contactPhone || !city || !addressLine || !shift || !startAt || !allowedShifts.has(shift)) {
      return NextResponse.json({ error: "اطلاعات ضروری درخواست را کامل کنید." }, { status: 422 });
    }
    const normalizedContactPhone = normalizePhone(contactPhone);
    const normalizedAccountPhone = normalizePhone(auth.user.phone);
    if (!normalizedContactPhone || normalizedContactPhone !== normalizedAccountPhone) {
      return NextResponse.json({ error: "شماره تماس باید با شماره تأییدشده حساب شما یکسان باشد." }, { status: 422 });
    }
    if (recipientAge !== null && (!Number.isInteger(recipientAge) || recipientAge < 0 || recipientAge > 120)) {
      return NextResponse.json({ error: "سن خدمت‌گیرنده معتبر نیست." }, { status: 422 });
    }
    if (!Number.isInteger(childrenCount) || childrenCount < 1 || childrenCount > 4) {
      return NextResponse.json({ error: "تعداد کودک باید بین ۱ تا ۴ باشد." }, { status: 422 });
    }
    if (durationMonths !== null && (!Number.isInteger(durationMonths) || !allowedDurations.has(durationMonths))) {
      return NextResponse.json({ error: "مدت قرارداد انتخاب‌شده معتبر نیست." }, { status: 422 });
    }
    if (!/^\d{4}-\d{2}-\d{2}T/.test(startAt) || !/(Z|[+-]\d{2}:\d{2})$/.test(startAt) || Number.isNaN(Date.parse(startAt))) {
      return NextResponse.json({ error: "زمان شروع باید با منطقه زمانی معتبر ارسال شود." }, { status: 422 });
    }
    if (Date.parse(startAt) <= Date.now()) {
      return NextResponse.json({ error: "زمان شروع خدمت باید در آینده باشد." }, { status: 422 });
    }
    if (dependencyRaw && !dependencyMap[dependencyRaw]) {
      return NextResponse.json({ error: "وضعیت استقلال خدمت‌گیرنده معتبر نیست." }, { status: 422 });
    }

    const serviceResponse = await supabaseAdminFetch(
      `services?select=category_id,slug,title,delivery_class,requires_professional_license&category_id=eq.${encodeURIComponent(categoryId)}&slug=eq.${encodeURIComponent(serviceSlug)}&active=eq.true&limit=1`
    );
    if (!serviceResponse.ok) {
      return NextResponse.json({ error: "بررسی کاتالوگ خدمات ممکن نشد." }, { status: 502 });
    }
    const services = await readJson<ServiceRow[]>(serviceResponse) ?? [];
    if (!services[0]) {
      return NextResponse.json({ error: "این خدمت در کاتالوگ فعال مایکا موجود نیست." }, { status: 422 });
    }

    const catalog = getPricingCatalog(categoryId, serviceSlug);
    if (catalog && !packageId) {
      return NextResponse.json({ error: "برای ثبت سفارش، ابتدا یکی از پکیج‌های این کاتالوگ را انتخاب کنید." }, { status: 422 });
    }
    if (packageId && !catalog) {
      return NextResponse.json({ error: "پکیج انتخاب‌شده با این خدمت سازگار نیست." }, { status: 422 });
    }
    if (packageId && !isPackageAllowed(categoryId, serviceSlug, packageId)) {
      return NextResponse.json({ error: "پکیج انتخاب‌شده با نوع خدمت سازگار نیست." }, { status: 422 });
    }

    const pricingSnapshot = buildPricingSnapshot({
      categoryId, serviceSlug, packageId, shift,
      durationMonths: durationMonths ?? null,
      childrenCount, fridayRequired
    });
    if (pricingSnapshot === null) {
      return NextResponse.json({ error: "پکیج انتخاب‌شده قابل قیمت‌گذاری نیست." }, { status: 422 });
    }

    const rpcPayload = {
      p_actor: auth.user.id,
      p_request: {
        requester_name: requesterName,
        requester_phone: auth.user.phone,
        recipient_name: recipientName,
        recipient_age: recipientAge,
        dependency_level: dependencyRaw ? dependencyMap[dependencyRaw] : null,
        children_count: childrenCount,
        category_id: categoryId,
        service_slug: serviceSlug,
        requested_shift: shift,
        requested_start_at: new Date(startAt).toISOString(),
        duration_months: durationMonths,
        friday_required: fridayRequired,
        is_urgent: isUrgent,
        city,
        province,
        address_line: addressLine,
        postal_code: postalCode,
        notes,
        pricing_snapshot: pricingSnapshot,
        source: "web"
      }
    };

    const createResponse = await supabaseAdminFetch("rpc/create_care_request", {
      method: "POST",
      body: JSON.stringify(rpcPayload)
    });
    if (!createResponse.ok) {
      return NextResponse.json({ error: "ثبت درخواست در سامانه انجام نشد. اطلاعات را بررسی و دوباره تلاش کنید." }, { status: 422 });
    }
    const created = await readJson<CreatedRequest>(createResponse);
    if (!created?.id || !created.reference) {
      return NextResponse.json({ error: "پاسخ ثبت درخواست کامل نیست." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      request: {
        id: created.id,
        reference: created.reference,
        status: created.status,
        createdAt: created.created_at,
        deliveryClass: created.delivery_class,
        pricing: created.pricing_snapshot
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "سامانه درخواست‌ها هنوز پیکربندی نشده است." }, { status: 503 });
    }
    return NextResponse.json({ error: "خطا در ثبت درخواست. دوباره تلاش کنید." }, { status: 500 });
  }
}
