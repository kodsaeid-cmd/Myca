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

const DRAFTS_KEY = "myca_request_drafts_v1";
const mainCategoryIds = ["11", "12", "13", "14", "17", "32"];

export type RequestDraft = {
  id: string; createdAt: string; categoryId: string; categoryTitle: string;
  serviceSlug: string; serviceTitle: string; packageTitle?: string;
  shift: string; startDate: string; startTime: string; months: number;
  recipientName: string; recipientAge: string; dependency: string;
  childCount: number; notes: string; requesterName: string; phone: string;
  city: string; address: string; urgent: boolean;
  estimatedTotalMillion?: number; status: "draft";
};

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
  if (category.id === "13") return ["ساعتی", "روزانه", "شبانه‌روزی", "موردی"];
  if (category.id === "14") return ["ساعتی", "روزانه", "شبانه‌روزی"];
  if (category.id === "17") return ["ساعتی", "روزانه", "نیاز به هماهنگی"];
  if (category.id === "32") return ["موردی", "جلسه‌ای", "نیاز به هماهنگی"];
  return ["روزانه", "شبانه", "شبانه‌روزی"];
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
  const [savedDraftId, setSavedDraftId] = useState("");
  const [acceptedLocalStorage, setAcceptedLocalStorage] = useState(false);
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
  const urgent = initial.urgent === "1";

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
  const isChildCare = isChild && serviceSlug !== "mother-companion";
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
    if (step === 4 && !acceptedLocalStorage) return "برای ذخیره پیش‌نویس محلی، تأیید خود را ثبت کنید.";
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

  function saveDraft() {
    const validation = validateCurrentStep();
    if (validation) { setError(validation); return; }
    const id = "MYCA-D-" + Date.now().toString().slice(-7);
    const draft: RequestDraft = {
      id, createdAt: new Date().toISOString(), categoryId, categoryTitle: category.title,
      serviceSlug, serviceTitle: service.title, packageTitle: selectedPackage?.title,
      shift, startDate, startTime, months, recipientName, recipientAge, dependency,
      childCount: Number(childCount) || 1, notes, requesterName, phone, city, address,
      urgent, estimatedTotalMillion: estimatedTotal, status: "draft"
    };
    try {
      const stored = JSON.parse(sessionStorage.getItem(DRAFTS_KEY) ?? "[]");
      const current = Array.isArray(stored) ? stored as RequestDraft[] : [];
      sessionStorage.setItem(DRAFTS_KEY, JSON.stringify([draft, ...current].slice(0, 20)));
      setSavedDraftId(id);
      setError("");
    } catch {
      setError("ذخیره پیش‌نویس در این مرورگر ممکن نشد. لطفاً فضای ذخیره‌سازی مرورگر را بررسی کنید.");
    }
  }

  if (savedDraftId) {
    return (
      <AppShell activeNav="requests">
        <div className={styles.container} dir="rtl">
          <div className={styles.successPanel}>
            <span className={styles.successIcon}><Check size={30} /></span>
            <span className={styles.eyebrow}>پیش‌نویس آماده شد</span>
            <h1>اطلاعات درخواست شما در این نشست ذخیره شد.</h1>
            <p>این پیش‌نویس هنوز به سامانه مایکا ارسال نشده و به معنی تأیید مراقب، رزرو یا پرداخت نیست.</p>
            <div className={styles.reference}><span>کد پیش‌نویس محلی</span><strong>{savedDraftId}</strong></div>
            <div className={styles.buttonColumn}>
              <Link href="/requests" className={styles.primaryButton}>مشاهده پیش‌نویس‌ها</Link>
              <a href="tel:41124" className={styles.secondaryButton}><PhoneCall size={17} />تماس با مایکا · ۴۱۱۲۴</a>
              <Link href="/" className={styles.textLink}>بازگشت به صفحه اصلی</Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const steps = ["انتخاب خدمت", "نیازسنجی", "زمان‌بندی", "اطلاعات تماس", "بازبینی"];

  return (
    <AppShell activeNav="requests">
      <div className={styles.container} dir="rtl">
        <Link href="/" className={styles.backLink}><ArrowRight size={16} />بازگشت به خانه</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>شروع دریافت خدمت از مایکا</span>
          <h1>درخواست مراقبت متناسب با نیاز خانواده</h1>
          <p>چند مرحله کوتاه را تکمیل کنید تا درخواست شما برای بررسی و معرفی خدمت مناسب آماده شود.</p>
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
                <div className={styles.sectionSubheading}><h3>پکیج موردنظر</h3><span>اختیاری · قابل تعیین پس از مشاوره</span></div>
                <div className={styles.packageGrid}>
                  <button type="button" onClick={() => setPackageId("")} className={!packageId ? styles.packageSelected : styles.packageCard}>
                    <strong>هنوز انتخاب نکرده‌ام</strong><small>مایکا در انتخاب پکیج مناسب راهنمایی می‌کند.</small>
                  </button>
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
              <label className={styles.field}><span>مدت قرارداد درخواستی</span>
                <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
                  {commissionRates.map((item) => <option key={item.months} value={item.months}>{formatMillions(item.months)} ماه</option>)}
                </select></label>
              <label className={styles.checkField}><input type="checkbox" checked={friday} onChange={(event) => setFriday(event.target.checked)} />
                <span>به حضور مراقب در روز جمعه نیز نیاز دارم.</span></label>
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
              <span>مرحله پنجم</span><h2>بازبینی درخواست و برآورد هزینه</h2>
              <p>پیش از ذخیره پیش‌نویس، اطلاعات و محدودیت‌های این نسخه را بررسی کنید.</p>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}><ClipboardList size={20} /><strong>خلاصه درخواست</strong></div>
              <div className={styles.summaryLine}><span>حوزه خدمت</span><strong>{category.title}</strong></div>
              <div className={styles.summaryLine}><span>نوع خدمت</span><strong>{service.title}</strong></div>
              {selectedPackage && <div className={styles.summaryLine}><span>پکیج</span><strong>{selectedPackage.title}</strong></div>}
              {recipientName && <div className={styles.summaryLine}><span>خدمت‌گیرنده</span><strong>{recipientName}</strong></div>}
              {recipientAge && <div className={styles.summaryLine}><span>سن</span><strong>{formatMillions(Number(recipientAge))}</strong></div>}
              {dependency && <div className={styles.summaryLine}><span>وضعیت سالمند</span><strong>{dependency}</strong></div>}
              {isChildCare && <div className={styles.summaryLine}><span>تعداد کودک</span><strong>{formatMillions(Number(childCount))}</strong></div>}
              <div className={styles.summaryLine}><span>شیفت</span><strong>{shift}</strong></div>
              <div className={styles.summaryLine}><span>شروع</span><strong>{startDate} · {startTime}</strong></div>
              <div className={styles.summaryLine}><span>مدت</span><strong>{formatMillions(months)} ماه</strong></div>
              {friday && <div className={styles.summaryLine}><span>جمعه</span><strong>نیاز به حضور دارد</strong></div>}
              <div className={styles.summaryLine}><span>محل خدمت</span><strong>{city}، {address}</strong></div>
              <div className={styles.summaryLine}><span>درخواست‌کننده</span><strong>{requesterName} · {phone}</strong></div>
            </div>

            {typeof estimatedTotal === "number" ? (
              <div className={styles.pricePanel}>
                <div className={styles.summaryHeader}><Wallet size={20} /><strong>پیش‌فاکتور تخمینی</strong></div>
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
              <div className={styles.summaryHeader}><ShieldCheck size={20} /><strong>پرداخت و تأیید قرارداد</strong></div>
              <p>پرداخت آنلاین و امضای قرارداد در این نسخه فعال نیستند. ابتدا باید درخواست بررسی و پیش‌فاکتور رسمی تأیید شود.</p>
              <button type="button" className={styles.disabledPayment} disabled>پرداخت آنلاین پس از اتصال درگاه فعال می‌شود</button>
            </div>
            <label className={styles.consent}>
              <input type="checkbox" checked={acceptedLocalStorage} onChange={(event) => setAcceptedLocalStorage(event.target.checked)} />
              <span>می‌دانم این نسخه به سرور مایکا متصل نیست و با ذخیره پیش‌نویس، اطلاعات فرم فقط در همین نشست مرورگر نگهداری می‌شود.</span>
            </label>
          </section>
        )}

        {error && <p className={styles.errorMessage} role="alert">{error}</p>}
        <div className={styles.navigationButtons}>
          {step > 0 ? <button type="button" onClick={previousStep} className={styles.secondaryButton}>مرحله قبل</button> : <span />}
          {step < 4
            ? <button type="button" onClick={nextStep} className={styles.primaryButton}>ادامه <ChevronLeft size={17} /></button>
            : <button type="button" onClick={saveDraft} className={styles.primaryButton}>ذخیره پیش‌نویس روی این دستگاه <Check size={17} /></button>}
        </div>
        <p className={styles.disclaimer}>ذخیره پیش‌نویس به معنی ارسال درخواست، تأیید ظرفیت، انتخاب مراقب یا ایجاد قرارداد نیست. برای ارسال و هماهنگی واقعی با ۴۱۱۲۴ تماس بگیرید.</p>
      </div>
    </AppShell>
  );
}

export function RequestDashboardScreen({ mode }: { mode: "requests" | "services" }) {
  const [drafts, setDrafts] = useState<RequestDraft[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(DRAFTS_KEY) ?? "[]");
      setDrafts(Array.isArray(stored) ? stored as RequestDraft[] : []);
    } catch {
      setDrafts([]);
    }
    setLoaded(true);
  }, []);

  const isRequests = mode === "requests";
  return (
    <AppShell activeNav={isRequests ? "requests" : "services"}>
      <div className={styles.container} dir="rtl">
        <Link href="/" className={styles.backLink}><ArrowRight size={16} />بازگشت به خانه</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>{isRequests ? "درخواست‌های خانواده" : "مدیریت خدمت"}</span>
          <h1>{isRequests ? "درخواست‌های من" : "خدمات من"}</h1>
          <p>{isRequests ? "پیش‌نویس‌هایی که در همین نشست مرورگر ذخیره کرده‌اید." : "خدمت فعال پس از تأیید قرارداد و شروع خدمت در این بخش نمایش داده می‌شود."}</p>
        </header>
        {!loaded ? <div className={styles.emptyState}>در حال خواندن اطلاعات همین نشست…</div>
          : isRequests && drafts.length > 0 ? (
            <div className={styles.draftList}>
              {drafts.map((draft) => (
                <article className={styles.draftCard} key={draft.id}>
                  <div className={styles.draftTopline}><strong>{draft.serviceTitle}</strong><span className={styles.localStatus}>پیش‌نویس محلی</span></div>
                  <p>{draft.categoryTitle}{draft.packageTitle ? " · " + draft.packageTitle : ""}</p>
                  <div className={styles.summaryLine}><span>شروع درخواستی</span><strong>{draft.startDate} · {draft.startTime}</strong></div>
                  <div className={styles.summaryLine}><span>مدت</span><strong>{formatMillions(draft.months)} ماه</strong></div>
                  {typeof draft.estimatedTotalMillion === "number" && <div className={styles.summaryLine}><span>برآورد اولیه</span><strong>{formatMillions(draft.estimatedTotalMillion)} میلیون تومان</strong></div>}
                  <div className={styles.summaryLine}><span>کد پیش‌نویس</span><strong>{draft.id}</strong></div>
                  <a href="tel:41124" className={styles.secondaryButton}><PhoneCall size={16} />تماس برای ارسال و بررسی درخواست</a>
                </article>
              ))}
            </div>
          ) : isRequests ? (
            <div className={styles.emptyState}>
              <span><ClipboardList size={28} /></span><h2>هنوز پیش‌نویسی در این نشست ندارید.</h2>
              <p>درخواست خدمت را مرحله‌به‌مرحله آماده کنید؛ پیش‌نویس آن در همین تب مرورگر قابل مشاهده خواهد بود.</p>
              <Link href="/request/new" className={styles.primaryButton}>شروع درخواست جدید</Link>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span><HeartHandshake size={28} /></span><h2>در حال حاضر خدمت فعالی برای نمایش وجود ندارد.</h2>
              <p>این نسخه هنوز به قراردادها، مراقبان تخصیص‌یافته، حضور و غیاب یا گزارش‌های خدمت واقعی متصل نیست. پس از اتصال سامانه عملیاتی، وضعیت خدمت در همین بخش نمایش داده می‌شود.</p>
              <Link href="/requests" className={styles.secondaryButton}>مشاهده درخواست‌های من</Link>
              <Link href="/request/new" className={styles.primaryButton}>ثبت درخواست جدید</Link>
            </div>
          )}
      </div>
    </AppShell>
  );
}
