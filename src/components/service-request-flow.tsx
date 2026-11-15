"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Baby, Check, CheckCircle2, ChevronLeft, ClipboardList,
  Clock3, HeartHandshake, Home, MapPin, PhoneCall, ShieldCheck, Wallet
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { categories, type CategoryData } from "@/lib/myca-data";
import { commissionRates, pricingCatalogs, type PricingCatalog } from "@/lib/pricing-data";
import styles from "./request-flow.module.css";

const mainCategoryIds = ["11", "12", "13", "14", "17", "32"];

type InitialRequest = { category?: string; service?: string; package?: string; shift?: string; urgent?: string };

function formatMillions(value: number) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
}

function getCategoryCatalog(categoryId: string, serviceSlug: string): PricingCatalog | undefined {
  if (categoryId === "11" || categoryId === "22") return pricingCatalogs["elders-pricing"];
  if ((categoryId === "12" || categoryId === "27") &&
    ["infant-nurse", "mother-companion", "child-care", "daily", "night", "24h"].includes(serviceSlug)) {
    return pricingCatalogs.pedia;
  }
  return undefined;
}

function shiftChoices(category: CategoryData, serviceSlug: string) {
  const service = category.services.find((item) => item.slug === serviceSlug);
  if (service?.options?.length) return service.options.map((item) => item.title);
  if (category.id === "22" || category.id === "27") {
    if (serviceSlug === "night") return ["شبانه"];
    if (serviceSlug === "24h") return ["شبانه‌روزی"];
    return ["روزانه"];
  }
  if (category.id === "12") {
    if (serviceSlug === "child-care") return ["روزانه", "شبانه‌روزی"];
    return ["نیاز به هماهنگی"];
  }
  if (category.id === "13") {
    if (serviceSlug === "hourly-nurse") return ["ساعتی"];
    if (serviceSlug === "one-time-nurse") return ["موردی"];
    if (serviceSlug === "hospital-companion") return ["شبانه‌روزی"];
    return ["نیاز به هماهنگی"];
  }
  if (category.id === "14") {
    if (serviceSlug === "home-cook" || serviceSlug === "cooking-home") return ["روزانه"];
    return ["ساعتی", "روزانه"];
  }
  if (category.id === "17") {
    if (serviceSlug === "office-cleaning") return ["ساعتی"];
    return ["نیاز به هماهنگی"];
  }
  if (category.id === "32") {
    if (serviceSlug === "laboratory") return ["موردی"];
    if (serviceSlug === "physiotherapy" || serviceSlug === "specialist-doctor") return ["جلسه‌ای"];
    return ["نیاز به هماهنگی"];
  }
  return ["نیاز به هماهنگی"];
}

export function ServiceRequestFlow({ initial }: { initial: InitialRequest }) {
  const firstCategoryId = categories[initial.category ?? ""] ? initial.category! : "11";
  const firstCategory = categories[firstCategoryId];
  const [categoryId, setCategoryId] = useState(firstCategoryId);
  const [serviceSlug, setServiceSlug] = useState(
    firstCategory.services.some((item) => item.slug === initial.service) ? initial.service! : firstCategory.services[0].slug
  );
  const [packageId, setPackageId] = useState(initial.package ?? "");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<{ id: string; reference: string; status: string; createdAt: string } | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientAge, setRecipientAge] = useState("");
  const [dependency, setDependency] = useState("");
  const [childCount, setChildCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [shift, setShift] = useState(initial.shift ?? "روزانه");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [months, setMonths] = useState(1);
  const [friday, setFriday] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [urgent, setUrgent] = useState(initial.urgent === "1");

  const category = categories[categoryId] ?? categories["11"];
  const service = category.services.find((item) => item.slug === serviceSlug) ?? category.services[0];
  const catalog = getCategoryCatalog(categoryId, serviceSlug);
  const availablePackages = catalog?.packages.filter((item) => {
    if (catalog.kind !== "child") return true;
    if (serviceSlug === "mother-companion") return ["pregnancy", "custom"].includes(item.id);
    if (serviceSlug === "infant-nurse" || categoryId === "27") return ["infant", "custom"].includes(item.id);
    if (serviceSlug === "child-care") return ["toddler", "preschool", "school-age", "custom"].includes(item.id);
    return true;
  }) ?? [];
  const selectedPackage = catalog?.packages.find((item) => item.id === packageId);
  const shifts = useMemo(() => shiftChoices(category, serviceSlug), [category, serviceSlug]);
  const isChild = categoryId === "12" || categoryId === "27";
  const isChildCare = isChild && ["infant-nurse", "child-care", "daily", "night", "24h"].includes(serviceSlug);
  const isElder = categoryId === "11" || categoryId === "22";
  const commissionPercent = commissionRates.find((item) => item.months === months)?.percent ?? 0;
  const baseMonthlySalary = selectedPackage?.monthlySalaryMillion;
  const extraChildPercent = isChildCare ? Math.max(0, Number(childCount) - 1) * 25 : 0;
  const roundTheClockPercent = shift === "شبانه‌روزی" ? 35 : 0;
  const surchargePercent = extraChildPercent + roundTheClockPercent;
  const adjustedMonthlySalary = typeof baseMonthlySalary === "number"
    ? baseMonthlySalary * (1 + surchargePercent / 100) : undefined;
  const salarySubtotal = typeof adjustedMonthlySalary === "number" ? adjustedMonthlySalary * months : undefined;
  const commission = typeof adjustedMonthlySalary === "number" ? adjustedMonthlySalary * commissionPercent / 100 : undefined;
  const estimatedTotal = typeof salarySubtotal === "number" && typeof commission === "number"
    ? salarySubtotal + commission : undefined;

  useEffect(() => {
    if (!shifts.includes(shift)) setShift(shifts[0] ?? "نیاز به هماهنگی");
  }, [shifts, shift]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category");
    const requestedService = params.get("service");
    if (requestedCategory && categories[requestedCategory]) {
      const nextCategory = categories[requestedCategory];
      setCategoryId(requestedCategory);
      setServiceSlug(nextCategory.services.some((item) => item.slug === requestedService)
        ? requestedService!
        : nextCategory.services[0].slug);
    }
    const requestedPackage = params.get("package");
    if (requestedPackage) setPackageId(requestedPackage);
    const requestedShift = params.get("shift");
    if (requestedShift) setShift(requestedShift);
    setUrgent(params.get("urgent") === "1");
  }, []);

  useEffect(() => {
    let active = true;
    async function checkCustomerSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) {
          setAuthError(result.error || "بررسی حساب مشتری ممکن نشد.");
          setAuthReady(true);
          return;
        }
        if (!result.authenticated) {
          const next = window.location.pathname + window.location.search;
          window.location.assign("/login/receiver?next=" + encodeURIComponent(next));
          return;
        }
        if (!Array.isArray(result.roles) || !result.roles.includes("family")) {
          setAuthError("برای ثبت سفارش باید با حساب خدمت‌گیرنده وارد شوید.");
          setAuthReady(true);
          return;
        }
        if (typeof result.user?.phone === "string") setPhone(result.user.phone);
        setAuthReady(true);
      } catch {
        if (active) {
          setAuthError("ارتباط با سامانه ورود برقرار نشد. دوباره صفحه را بارگذاری کنید.");
          setAuthReady(true);
        }
      }
    }
    void checkCustomerSession();
    return () => { active = false; };
  }, []);

  function chooseCategory(nextId: string) {
    const nextCategory = categories[nextId];
    if (!nextCategory) return;
    setCategoryId(nextId);
    setServiceSlug(nextCategory.services[0].slug);
    setPackageId("");
    setShift(shiftChoices(nextCategory, nextCategory.services[0].slug)[0] ?? "روزانه");
    setError("");
  }

  function chooseService(nextSlug: string) {
    setServiceSlug(nextSlug);
    setPackageId("");
    setShift(shiftChoices(category, nextSlug)[0] ?? "نیاز به هماهنگی");
    setError("");
  }

  function validateCurrentStep() {
    if (step === 0 && (!categoryId || !serviceSlug)) return "ابتدا دسته خدمت و نوع خدمت را انتخاب کنید.";
    if (step === 1 && isChildCare && !recipientAge.trim()) return "سن کودک را وارد کنید تا نیازسنجی دقیق‌تر انجام شود.";
    if (step === 2 && (!startDate || !shift || !startTime)) return "تاریخ شروع، شیفت و ساعت شروع را مشخص کنید.";
    if (step === 3) {
      if (!requesterName.trim()) return "نام درخواست‌کننده را وارد کنید.";
      if (phone.trim().replace(/\s/g, "").length < 10) return "شماره تماس معتبر وارد کنید.";
      if (!city.trim() || !address.trim()) return "شهر و نشانی محل ارائه خدمت را تکمیل کنید.";
    }
    if (step === 4 && catalog && !packageId) return "برای ثبت سفارش، یکی از پکیج‌های موجود را انتخاب کنید.";
    return "";
  }

  function nextStep() {
    const validation = validateCurrentStep();
    if (validation) { setError(validation); return; }
    setError("");
    setStep((current) => Math.min(4, current + 1));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  async function submitOrder() {
    const validation = validateCurrentStep();
    if (validation) { setError(validation); return; }
    setSubmitting(true);
    setError("");
    try {
      const startAt = new Date(`${startDate}T${startTime}:00`).toISOString();
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId,
          serviceSlug,
          packageId: packageId || null,
          shift,
          startAt,
          durationMonths: catalog ? months : null,
          fridayRequired: friday,
          childrenCount: Number(childCount) || 1,
          recipientName,
          recipientAge: recipientAge || null,
          dependency: dependency || null,
          notes,
          requesterName,
          phone,
          city,
          address,
          urgent
        })
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        const next = window.location.pathname + window.location.search;
        window.location.assign("/login/receiver?next=" + encodeURIComponent(next));
        return;
      }
      if (!response.ok || !result.request?.reference) {
        setError(result.error || "ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید.");
        return;
      }
      setSubmittedOrder({
        id: result.request.id,
        reference: result.request.reference,
        status: result.request.status,
        createdAt: result.request.createdAt
      });
    } catch {
      setError("ارتباط با سامانه برقرار نشد. اطلاعات واردشده را بررسی و دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authReady) {
    return <AppShell activeNav="requests"><div className={styles.container} dir="rtl"><div className={styles.emptyState}>در حال بررسی حساب مشتری…</div></div></AppShell>;
  }

  if (authError) {
    return <AppShell activeNav="requests"><div className={styles.container} dir="rtl"><div className={styles.emptyState}><h2>ورود به سفارش‌گذاری ممکن نیست.</h2><p>{authError}</p><Link href="/login/receiver" className={styles.primaryButton}>ورود به حساب مشتری</Link></div></div></AppShell>;
  }

  if (submittedOrder) {
    return (
      <AppShell activeNav="requests">
        <div className={styles.container} dir="rtl">
          <div className={styles.successPanel}>
            <span className={styles.successIcon}><Check size={30} /></span>
            <span className={styles.eyebrow}>سفارش شما ثبت شد</span>
            <h1>درخواست خرید پکیج به مایکا رسید.</h1>
            <p>کارشناسان مایکا برای تأیید جزئیات، اعلام مبلغ نهایی و هماهنگی پرداخت با شما تماس می‌گیرند. هنگام ثبت سفارش هیچ پرداختی انجام نشده است.</p>
            <div className={styles.reference}><span>کد پیگیری سفارش</span><strong>{submittedOrder.reference}</strong></div>
            <div className={styles.buttonColumn}>
              <Link href={"/track?reference=" + encodeURIComponent(submittedOrder.reference)} className={styles.primaryButton}>پیگیری وضعیت سفارش</Link>
              <Link href="/requests" className={styles.secondaryButton}>مشاهده سفارش‌های من</Link>
              <a href="tel:41124" className={styles.secondaryButton}><PhoneCall size={17} />تماس با مایکا · ۴۱۱۲۴</a>
              <Link href="/" className={styles.textLink}>بازگشت به صفحه اصلی</Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const steps = ["انتخاب خدمت", "نیازسنجی", "زمان‌بندی", "اطلاعات تماس", "تأیید سفارش"];

  return (
    <AppShell activeNav="requests">
      <div className={styles.container} dir="rtl">
        <Link href="/" className={styles.backLink}><ArrowRight size={16} />بازگشت به خانه</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>سفارش پکیج و خدمات مایکا</span>
          <h1>ثبت سفارش خدمت موردنظر</h1>
          <p>پکیج را انتخاب کنید، اطلاعات سفارش را ثبت کنید و منتظر تماس کارشناس مایکا بمانید.</p>
        </header>

        <div className={styles.stepper} aria-label="مراحل درخواست">
          {steps.map((label, index) => (
            <div className={styles.stepItem} key={label}>
              <span className={index <= step ? styles.stepDotActive : styles.stepDot}>{index < step ? <Check size={13} /> : index + 1}</span>
              <span className={index === step ? styles.stepLabelActive : styles.stepLabel}>{label}</span>
            </div>
          ))}
        </div>
        <div className={styles.progressTrack}><span style={{ width: ((step + 1) / steps.length * 100) + "%" }} /></div>

        {step === 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>مرحله اول</span><h2>چه خدمتی نیاز دارید؟</h2>
              <p>ابتدا حوزه خدمت را انتخاب کنید، سپس نوع مراقبت موردنظر را مشخص کنید.</p>
            </div>
            <div className={styles.categoryGrid}>
              {(mainCategoryIds.includes(categoryId) ? mainCategoryIds : [categoryId]).map((id) => {
                const item = categories[id];
                const selected = id === categoryId;
                const Icon = id === "11" ? HeartHandshake : id === "12" ? Baby : id === "14" ? Home : ShieldCheck;
                return <button type="button" key={id} onClick={() => chooseCategory(id)}
                  className={selected ? styles.choiceSelected : styles.choiceCard} aria-pressed={selected}>
                  <Icon size={20} /><strong>{item.title}</strong>{selected && <CheckCircle2 size={16} />}
                </button>;
              })}
            </div>
            <div className={styles.sectionSubheading}><h3>نوع خدمت</h3><span>{category.title}</span></div>
            <div className={styles.serviceList}>
              {category.services.map((item) => (
                <button type="button" key={item.slug} onClick={() => chooseService(item.slug)}
                  className={serviceSlug === item.slug ? styles.serviceSelected : styles.serviceChoice} aria-pressed={serviceSlug === item.slug}>
                  <span><strong>{item.title}</strong><small>{item.description}</small></span>
                  {serviceSlug === item.slug && <CheckCircle2 size={18} />}
                </button>
              ))}
            </div>
            {catalog && (
              <div className={styles.packageSection}>
                <div className={styles.sectionSubheading}><h3>پکیج موردنظر</h3><span>الزامی برای ثبت سفارش</span></div>
                <div className={styles.packageGrid}>
                  {availablePackages.map((item) => (
                    <button type="button" key={item.id} onClick={() => setPackageId(item.id)}
                      className={packageId === item.id ? styles.packageSelected : styles.packageCard}>
                      <strong>{item.title}</strong>{item.ageRange && <small>{item.ageRange}</small>}
                      <span>{typeof item.monthlySalaryMillion === "number" ? formatMillions(item.monthlySalaryMillion) + " میلیون تومان / ماه" : "قیمت‌گذاری اختصاصی"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {urgent && <p className={styles.warningNote}>درخواست شما با اولویت فوری علامت‌گذاری می‌شود؛ فوریت و امکان ارائه خدمت باید توسط مایکا تأیید شود.</p>}
          </section>
        )}

        {step === 1 && (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>مرحله دوم</span><h2>برای چه کسی مراقبت نیاز دارید؟</h2>
              <p>اطلاعات کلی به مایکا کمک می‌کند نیاز خدمت را بهتر ارزیابی کند.</p>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>نام خدمت‌گیرنده <small>اختیاری</small></span>
                <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="نام فرد دریافت‌کننده خدمت" /></label>
              <label className={styles.field}><span>{isChildCare ? "سن کودک" : "سن خدمت‌گیرنده"} {isChildCare && <small>الزامی</small>}</span>
                <input type="number" min="0" max="120" value={recipientAge} onChange={(event) => setRecipientAge(event.target.value)} placeholder={isChild ? "مثلاً ۳ سال" : "مثلاً ۷۸ سال"} /></label>
              {isElder && <label className={styles.field}><span>وضعیت استقلال سالمند</span>
                <select value={dependency} onChange={(event) => setDependency(event.target.value)}>
                  <option value="">انتخاب کنید</option><option value="مستقل">مستقل</option><option value="نیمه‌وابسته">نیمه‌وابسته</option><option value="وابسته">وابسته</option>
                </select></label>}
              {isChildCare && <label className={styles.field}><span>تعداد کودکانی که مراقبت می‌خواهند</span>
                <select value={childCount} onChange={(event) => setChildCount(event.target.value)}>
                  <option value="1">۱ کودک</option><option value="2">۲ کودک</option><option value="3">۳ کودک</option><option value="4">۴ کودک</option>
                </select></label>}
              <label className={styles.fieldFull}><span>توضیحات نیاز خانواده <small>اختیاری</small></span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="چه نوع همراهی یا مراقبتی مدنظر دارید؟" /></label>
            </div>
            <p className={styles.hint}><ShieldCheck size={16} />برای حفظ حریم خصوصی، در این پیش‌نویس جزئیات پزشکی بسیار حساس یا مدارک هویتی وارد نکنید.</p>
          </section>
        )}

        {step === 2 && (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>مرحله سوم</span><h2>زمان ارائه خدمت را مشخص کنید.</h2>
              <p>زمان انتخابی شما درخواست اولیه است و پس از بررسی ظرفیت تأیید خواهد شد.</p>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>تاریخ شروع</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label className={styles.field}><span>ساعت شروع</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
              <div className={styles.fieldFull}><span className={styles.labelText}>شیفت درخواستی</span>
                <div className={styles.optionGrid}>{shifts.map((item) =>
                  <button type="button" key={item} onClick={() => setShift(item)} className={shift === item ? styles.optionSelected : styles.optionButton}>{item}</button>
                )}</div>
              </div>
              {catalog && <label className={styles.field}><span>مدت قرارداد درخواستی</span>
                <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
                  {commissionRates.map((item) => <option key={item.months} value={item.months}>{formatMillions(item.months)} ماه</option>)}
                </select></label>}
              {catalog && <label className={styles.checkField}><input type="checkbox" checked={friday} onChange={(event) => setFriday(event.target.checked)} />
                <span>به حضور مراقب در روز جمعه نیز نیاز دارم.</span></label>}
            </div>
            <p className={styles.hint}><Clock3 size={16} />تاریخ و ساعت نهایی پس از بررسی ظرفیت مراقبان و هماهنگی با خانواده قطعی می‌شود.</p>
          </section>
        )}

        {step === 3 && (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>مرحله چهارم</span><h2>اطلاعات تماس و محل خدمت</h2>
              <p>این اطلاعات برای هماهنگی اولیه لازم است.</p>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>نام درخواست‌کننده</span><input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} placeholder="نام و نام خانوادگی" autoComplete="name" /></label>
              <label className={styles.field}><span>شماره تماس</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="شماره موبایل" inputMode="tel" dir="ltr" autoComplete="tel" /></label>
              <label className={styles.field}><span>شهر</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="مثلاً تهران" autoComplete="address-level2" /></label>
              <label className={styles.fieldFull}><span>نشانی محل ارائه خدمت</span><textarea rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="نشانی کامل، محله و توضیحات لازم" autoComplete="street-address" /></label>
            </div>
            <p className={styles.hint}><MapPin size={16} />موقعیت دقیق و محدوده پوشش خدمت در تماس کارشناسی بررسی می‌شود.</p>
          </section>
        )}

        {step === 4 && (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>مرحله پنجم</span><h2>بازبینی سفارش و برآورد هزینه</h2>
              <p>اطلاعات پکیج و درخواست را بررسی کنید. ثبت سفارش در این مرحله بدون پرداخت آنلاین انجام می‌شود.</p>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}><ClipboardList size={20} /><strong>خلاصه سفارش</strong></div>
              <div className={styles.summaryLine}><span>حوزه خدمت</span><strong>{category.title}</strong></div>
              <div className={styles.summaryLine}><span>نوع خدمت</span><strong>{service.title}</strong></div>
              {selectedPackage && <div className={styles.summaryLine}><span>پکیج</span><strong>{selectedPackage.title}</strong></div>}
              {recipientName && <div className={styles.summaryLine}><span>خدمت‌گیرنده</span><strong>{recipientName}</strong></div>}
              {recipientAge && <div className={styles.summaryLine}><span>سن</span><strong>{formatMillions(Number(recipientAge))}</strong></div>}
              {dependency && <div className={styles.summaryLine}><span>وضعیت سالمند</span><strong>{dependency}</strong></div>}
              {isChildCare && <div className={styles.summaryLine}><span>تعداد کودک</span><strong>{formatMillions(Number(childCount))}</strong></div>}
              <div className={styles.summaryLine}><span>شیفت</span><strong>{shift}</strong></div>
              <div className={styles.summaryLine}><span>شروع</span><strong>{startDate} · {startTime}</strong></div>
              {catalog && <div className={styles.summaryLine}><span>مدت</span><strong>{formatMillions(months)} ماه</strong></div>}
              {friday && catalog && <div className={styles.summaryLine}><span>جمعه</span><strong>نیاز به حضور دارد</strong></div>}
              {urgent && <div className={styles.summaryLine}><span>اولویت</span><strong>فوری · نیازمند تأیید مایکا</strong></div>}
              {notes.trim() && <div className={styles.summaryLine}><span>توضیحات</span><strong>{notes}</strong></div>}
              <div className={styles.summaryLine}><span>محل خدمت</span><strong>{city}، {address}</strong></div>
              <div className={styles.summaryLine}><span>درخواست‌کننده</span><strong>{requesterName} · {phone}</strong></div>
            </div>

            {typeof estimatedTotal === "number" ? (
              <div className={styles.pricePanel}>
                <div className={styles.summaryHeader}><Wallet size={20} /><strong>برآورد اولیه هزینه</strong></div>
                <div className={styles.summaryLine}><span>حقوق ماهانه پایه</span><strong>{formatMillions(baseMonthlySalary!)} میلیون تومان</strong></div>
                {surchargePercent > 0 && <div className={styles.summaryLine}><span>افزایش شیفت/کودک اضافه ({formatMillions(surchargePercent)}٪)</span><strong>{formatMillions(adjustedMonthlySalary! - baseMonthlySalary!)} میلیون تومان در ماه</strong></div>}
                <div className={styles.summaryLine}><span>حقوق ماهانه پس از افزایش‌های انتخابی</span><strong>{formatMillions(adjustedMonthlySalary!)} میلیون تومان</strong></div>
                <div className={styles.summaryLine}><span>مجموع حقوق در {formatMillions(months)} ماه</span><strong>{formatMillions(salarySubtotal!)} میلیون تومان</strong></div>
                <div className={styles.summaryLine}><span>کمیسیون یک‌باره مایکا ({formatMillions(commissionPercent)}٪)</span><strong>{formatMillions(commission!)} میلیون تومان</strong></div>
                <div className={styles.priceTotal}><span>جمع برآوردی قرارداد</span><strong>{formatMillions(estimatedTotal)} میلیون تومان</strong></div>
                <p className={styles.hint}>حضور در روز جمعه در این مبلغ لحاظ نشده و باید جداگانه تأیید شود. مبلغ نهایی پس از بررسی شرایط و پیش‌فاکتور رسمی مشخص می‌شود.</p>
              </div>
            ) : (
              <div className={styles.pricePanel}>
                <div className={styles.summaryHeader}><Wallet size={20} /><strong>اعلام هزینه پس از بررسی</strong></div>
                <p className={styles.hint}>برای این خدمت یا پکیج، قیمت قطعی در اطلاعات فعلی موجود نیست. مایکا باید پس از بررسی جزئیات، پیش‌فاکتور رسمی ارائه کند.</p>
              </div>
            )}

            <div className={styles.matchingPanel}>
              <div className={styles.summaryHeader}><HeartHandshake size={20} /><strong>معرفی مراقب مناسب</strong></div>
              <p>پس از بررسی درخواست، مراقبان واجد شرایط و متناسب با نیاز خانواده معرفی می‌شوند. فهرست زنده مراقبان، احراز هویت و ظرفیت زمانی هنوز به این نسخه متصل نیست؛ بنابراین در این مرحله مراقب واقعی نمایش داده نمی‌شود.</p>
            </div>
            <div className={styles.paymentPanel}>
              <div className={styles.summaryHeader}><ShieldCheck size={20} /><strong>نحوه پرداخت در فاز اول</strong></div>
              <p>پس از ثبت سفارش، کارشناس مایکا با شما تماس می‌گیرد تا مبلغ نهایی، روش پرداخت و زمان شروع خدمت را هماهنگ کند. پرداخت آنلاین در این فاز وجود ندارد.</p>
              <p className={styles.hint}>ثبت سفارش به معنی پرداخت وجه، تأیید ظرفیت یا شروع قرارداد نیست. وضعیت پرداخت پس از هماهنگی و تأیید کارشناس در پروفایل شما به‌روزرسانی می‌شود.</p>
            </div>
          </section>
        )}

        {error && <p className={styles.errorMessage} role="alert">{error}</p>}
        <div className={styles.navigationButtons}>
          {step > 0 ? <button type="button" onClick={previousStep} className={styles.secondaryButton}>مرحله قبل</button> : <span />}
          {step < 4
            ? <button type="button" onClick={nextStep} className={styles.primaryButton}>ادامه <ChevronLeft size={17} /></button>
            : <button type="button" onClick={() => void submitOrder()} disabled={submitting} className={styles.primaryButton}>{submitting ? "در حال ثبت سفارش…" : "ثبت سفارش و درخواست تماس مایکا"} <Check size={17} /></button>}
        </div>
        <p className={styles.disclaimer}>پس از ثبت سفارش، کد پیگیری برای شما صادر می‌شود. پرداخت با هماهنگی تلفنی انجام خواهد شد؛ برای تماس مستقیم با مایکا با ۴۱۱۲۴ تماس بگیرید.</p>
      </div>
    </AppShell>
  );
}

export function RequestDashboardScreen({ mode }: { mode: "requests" | "services" }) {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const isRequests = mode === "requests";

  useEffect(() => {
    let active = true;
    async function loadOrders() {
      if (!isRequests) { setLoaded(true); return; }
      try {
        const response = await fetch("/api/requests", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.status === 401) {
          window.location.assign("/login/receiver?next=%2Frequests");
          return;
        }
        if (!response.ok) {
          setError(result.error || "دریافت سفارش‌ها ممکن نشد.");
          setOrders([]);
        } else {
          setOrders(Array.isArray(result.requests) ? result.requests : []);
        }
      } catch {
        if (active) setError("ارتباط با سامانه برقرار نشد.");
      } finally {
        if (active) setLoaded(true);
      }
    }
    void loadOrders();
    return () => { active = false; };
  }, [isRequests]);

  function serviceTitleFor(categoryId: unknown, slug: unknown) {
    const category = typeof categoryId === "string" ? categories[categoryId] : undefined;
    const service = category?.services.find((item) => item.slug === slug);
    return service?.title ?? (typeof slug === "string" ? slug : "خدمت مایکا");
  }

  function statusTitle(status: unknown) {
    const labels: Record<string, string> = {
      submitted: "در انتظار تماس مایکا",
      triage: "در انتظار بررسی کارشناسی",
      matching: "در حال بررسی و هماهنگی",
      offered: "پیشنهاد خدمت آماده است",
      accepted: "تأیید اولیه انجام شد",
      quoted: "پیش‌فاکتور صادر شده",
      contract_pending: "در انتظار نهایی‌سازی قرارداد",
      confirmed: "خدمت تأیید شده",
      in_service: "در حال ارائه خدمت",
      completed: "تکمیل‌شده",
      cancelled: "لغوشده",
      rejected: "بسته‌شده"
    };
    return typeof status === "string" ? labels[status] ?? status : "در حال بررسی";
  }

  function paymentTitle(status: unknown) {
    const labels: Record<string, string> = {
      awaiting_contact: "در انتظار تماس مایکا",
      awaiting_payment: "در انتظار پرداخت با هماهنگی",
      paid: "پرداخت تأیید شده",
      failed: "پرداخت ناموفق",
      refunded: "مسترد شده",
      not_required: "بدون نیاز به پرداخت"
    };
    return typeof status === "string" ? labels[status] ?? status : "در انتظار هماهنگی";
  }

  return (
    <AppShell activeNav={isRequests ? "requests" : "services"}>
      <div className={styles.container} dir="rtl">
        <Link href="/" className={styles.backLink}><ArrowRight size={16} />بازگشت به خانه</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>{isRequests ? "سفارش‌های خانواده" : "مدیریت خدمت"}</span>
          <h1>{isRequests ? "سفارش‌های من" : "خدمات من"}</h1>
          <p>{isRequests ? "سفارش‌های ثبت‌شده، کد پیگیری و وضعیت هماهنگی و پرداخت را اینجا مشاهده می‌کنید." : "خدمت فعال پس از تأیید سفارش و شروع ارائه خدمت در این بخش نمایش داده می‌شود."}</p>
        </header>

        {!loaded ? <div className={styles.emptyState}>در حال خواندن اطلاعات…</div>
          : error ? <div className={styles.emptyState}><p>{error}</p></div>
          : isRequests ? (
            orders.length > 0 ? (
              <section className={styles.draftList}>
                {orders.map((item, index) => {
                  const pricing = item.pricing_snapshot && typeof item.pricing_snapshot === "object"
                    ? item.pricing_snapshot as Record<string, unknown> : {};
                  const reference = String(item.reference ?? "");
                  return (
                    <article className={styles.draftCard} key={String(item.id ?? reference ?? index)}>
                      <div className={styles.draftTopline}>
                        <strong>{String(pricing.package_title ?? serviceTitleFor(item.category_id, item.service_slug))}</strong>
                        <span className={styles.submittedStatus}>{statusTitle(item.status)}</span>
                      </div>
                      <p>{serviceTitleFor(item.category_id, item.service_slug)} · {String(item.city ?? "—")}</p>
                      <div className={styles.summaryLine}><span>کد پیگیری</span><strong>{reference}</strong></div>
                      <div className={styles.summaryLine}><span>تاریخ ثبت</span><strong>{typeof item.created_at === "string" ? new Date(item.created_at).toLocaleString("fa-IR") : "—"}</strong></div>
                      <div className={styles.summaryLine}><span>وضعیت پرداخت</span><strong>{paymentTitle(item.payment_status)}</strong></div>
                      <div className={styles.summaryLine}><span>روش پرداخت</span><strong>هماهنگی تلفنی با مایکا</strong></div>
                      {typeof pricing.total_estimate_rial === "number" && (
                        <div className={styles.summaryLine}><span>برآورد اولیه</span><strong>{formatMillions(pricing.total_estimate_rial / 10_000_000)} میلیون تومان</strong></div>
                      )}
                      <Link href={"/track?reference=" + encodeURIComponent(reference)} className={styles.primaryButton}>پیگیری سفارش</Link>
                    </article>
                  );
                })}
              </section>
            ) : (
              <div className={styles.emptyState}>
                <span><ClipboardList size={28} /></span><h2>هنوز سفارشی ثبت نکرده‌اید.</h2>
                <p>پکیج موردنظر را انتخاب کنید و سفارش خود را در مایکا ثبت کنید.</p>
                <Link href="/catalogs" className={styles.primaryButton}>مشاهده پکیج‌ها</Link>
              </div>
            )
          ) : (
            <div className={styles.emptyState}>
              <span><HeartHandshake size={28} /></span><h2>در حال حاضر خدمت فعالی برای نمایش وجود ندارد.</h2>
              <p>پس از تأیید سفارش و شروع خدمت، وضعیت آن در این بخش نمایش داده می‌شود.</p>
              <Link href="/requests" className={styles.secondaryButton}>مشاهده سفارش‌های من</Link>
              <Link href="/catalogs" className={styles.primaryButton}>مشاهده پکیج‌ها</Link>
            </div>
          )}
      </div>
    </AppShell>
  );
}
