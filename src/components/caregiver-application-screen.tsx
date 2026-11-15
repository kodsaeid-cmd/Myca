"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock3, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { categories } from "@/lib/myca-data";
import styles from "./caregiver-application.module.css";

const serviceOptions = [
  { categoryId: "11", serviceSlug: "independent" },
  { categoryId: "11", serviceSlug: "semi-dependent" },
  { categoryId: "11", serviceSlug: "dependent" },
  { categoryId: "12", serviceSlug: "infant-nurse" },
  { categoryId: "12", serviceSlug: "mother-companion" },
  { categoryId: "12", serviceSlug: "child-care" },
  { categoryId: "13", serviceSlug: "hospital-companion" },
  { categoryId: "14", serviceSlug: "home-cleaning" },
  { categoryId: "14", serviceSlug: "cooking-home" },
  { categoryId: "14", serviceSlug: "home-cook" },
  { categoryId: "17", serviceSlug: "pantry" },
  { categoryId: "17", serviceSlug: "office-cleaning" }
].map((item) => {
  const category = categories[item.categoryId];
  const service = category.services.find((entry) => entry.slug === item.serviceSlug);
  return { ...item, categoryTitle: category.title, title: service?.title ?? item.serviceSlug, description: service?.description ?? "" };
});

type ExistingApplication = {
  id: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  province: string | null;
  experience_years: number | null;
  review_status: string;
  services: Array<{ category_id: string; service_slug: string; review_status: string }>;
};

export function CaregiverApplicationScreen() {
  const [loaded, setLoaded] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [application, setApplication] = useState<ExistingApplication | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await sessionResponse.json().catch(() => ({}));
        if (!session.authenticated) {
          window.location.assign("/login/receiver?next=%2Fprovider%2Fapply");
          return;
        }
        setAuthenticated(true);
        const response = await fetch("/api/caregiver/application", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.application) {
          const saved = result.application as ExistingApplication;
          setApplication(saved);
          setDisplayName(saved.display_name ?? "");
          setCity(saved.city ?? "");
          setProvince(saved.province ?? "");
          setBio(saved.bio ?? "");
          setExperienceYears(saved.experience_years === null ? "" : String(saved.experience_years));
          setSelectedServices((saved.services ?? []).map((skill) => `${skill.category_id}:${skill.service_slug}`));
        }
      } catch {
        setError("دریافت وضعیت حساب ممکن نشد. دوباره تلاش کنید.");
      } finally {
        setLoaded(true);
      }
    }
    void load();
  }, []);

  function toggleService(key: string) {
    setSelectedServices((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  }

  async function submit() {
    if (!authenticated) {
      window.location.assign("/login/receiver?next=%2Fprovider%2Fapply");
      return;
    }
    if (displayName.trim().length < 2 || city.trim().length < 2) {
      setError("نام نمایشی و شهر محل فعالیت را کامل کنید.");
      return;
    }
    if (selectedServices.length < 1) {
      setError("حداقل یک حوزه خدمت انتخاب کنید.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const services = selectedServices.map((key) => {
        const [categoryId, serviceSlug] = key.split(":");
        return { categoryId, serviceSlug };
      });
      const response = await fetch("/api/caregiver/application", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName, city, province, bio, experienceYears, services
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "ثبت درخواست همکاری انجام نشد.");
        return;
      }
      const refresh = await fetch("/api/caregiver/application", { cache: "no-store" });
      const latest = await refresh.json().catch(() => ({}));
      if (refresh.ok && latest.application) setApplication(latest.application as ExistingApplication);
      setNotice("درخواست همکاری شما ثبت شد و برای بررسی هویت و صلاحیت در صف مایکا قرار گرفت.");
    } catch {
      setError("ارتباط با سامانه برقرار نشد. اطلاعات فرم را دوباره ارسال کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  const status = application?.review_status;
  const isPending = status === "pending";
  const isVerified = status === "verified";
  const isSuspended = status === "suspended";

  return (
    <AppShell activeNav="profile">
      <div className={styles.container} dir="rtl">
        <Link href="/" className={styles.backLink}><ArrowRight size={16} />بازگشت به خانه</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>همکاری با شبکه مراقبین مایکا</span>
          <h1>درخواست همکاری به‌عنوان مراقب</h1>
          <p>اطلاعات اولیه و حوزه‌های فعالیت خود را ثبت کنید. فعال‌شدن پروفایل منوط به بررسی مدارک و تأیید مایکا است.</p>
        </header>

        {!loaded ? <div className={styles.loading}>در حال بررسی حساب و پرونده همکاری…</div>
          : isPending ? (
            <section className={styles.statusPanel}>
              <span className={styles.statusIcon}><Clock3 size={25} /></span>
              <span className={styles.eyebrow}>درخواست دریافت شد</span>
              <h2>پرونده شما در انتظار بررسی است.</h2>
              <p>حوزه‌های انتخابی ثبت شده‌اند. تا زمان بررسی هویت، مدارک و صلاحیت‌های لازم، پروفایل شما در پیشنهادهای مراقب به خانواده‌ها نمایش داده نمی‌شود.</p>
              <div className={styles.statusMeta}><span>نام پروفایل</span><strong>{application?.display_name}</strong></div>
              <div className={styles.statusMeta}><span>شهر فعالیت</span><strong>{application?.city}</strong></div>
              <div className={styles.statusMeta}><span>حوزه‌های ثبت‌شده</span><strong>{formatCount(application?.services.length ?? 0)} مورد</strong></div>
              {notice && <p className={styles.successMessage}>{notice}</p>}
              <a href="tel:41124" className={styles.secondaryButton}>پیگیری با مایکا · ۴۱۱۲۴</a>
            </section>
          ) : isVerified ? (
            <section className={styles.statusPanel}>
              <span className={styles.statusIcon}><ShieldCheck size={25} /></span>
              <span className={styles.eyebrow}>پروفایل تأییدشده</span>
              <h2>صلاحیت پروفایل شما تأیید شده است.</h2>
              <p>فعالیت در هر خدمت همچنان به تطبیق مهارت، ظرفیت زمانی و محدوده ارائه خدمت وابسته است.</p>
              <div className={styles.statusMeta}><span>نام پروفایل</span><strong>{application?.display_name}</strong></div>
              <div className={styles.statusMeta}><span>شهر فعالیت</span><strong>{application?.city}</strong></div>
            </section>
          ) : isSuspended ? (
            <section className={styles.statusPanel}>
              <span className={styles.statusIcon}><ShieldCheck size={25} /></span>
              <h2>دسترسی پروفایل همکاری شما متوقف شده است.</h2>
              <p>برای بررسی وضعیت با پشتیبانی مایکا تماس بگیرید.</p>
              <a href="tel:41124" className={styles.secondaryButton}>تماس با مایکا · ۴۱۱۲۴</a>
            </section>
          ) : (
            <section className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <span>اطلاعات اولیه</span>
                <h2>{status === "rejected" ? "اصلاح و ارسال مجدد درخواست" : "مشخصات پروفایل همکاری"}</h2>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>نام نمایشی</span>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="نام و نام خانوادگی" autoComplete="name" />
                </label>
                <label className={styles.field}>
                  <span>شهر محل فعالیت</span>
                  <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="مثلاً تهران" />
                </label>
                <label className={styles.field}>
                  <span>استان</span>
                  <input value={province} onChange={(event) => setProvince(event.target.value)} placeholder="مثلاً تهران" />
                </label>
                <label className={styles.field}>
                  <span>سابقه فعالیت به سال</span>
                  <input type="number" min="0" max="70" step="0.5" value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} placeholder="مثلاً ۳" />
                </label>
                <label className={styles.fieldFull}>
                  <span>معرفی کوتاه و تجربه کاری</span>
                  <textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="تجربه و توانمندی‌های مرتبط خود را کوتاه توضیح دهید." />
                </label>
              </div>

              <div className={styles.sectionHeading}>
                <span>حوزه‌های فعالیت</span>
                <h2>در چه خدماتی توانایی همکاری دارید؟</h2>
                <p>فقط حوزه‌های غیرپزشکی در این فرم اولیه قابل انتخاب‌اند.</p>
              </div>
              <div className={styles.serviceGrid}>
                {serviceOptions.map((item) => {
                  const key = `${item.categoryId}:${item.serviceSlug}`;
                  const checked = selectedServices.includes(key);
                  return (
                    <label key={key} className={checked ? styles.serviceSelected : styles.serviceChoice}>
                      <input type="checkbox" checked={checked} onChange={() => toggleService(key)} />
                      <span className={styles.fakeCheck}>{checked && <Check size={13} />}</span>
                      <span className={styles.serviceCopy}><strong>{item.title}</strong><small>{item.categoryTitle}</small></span>
                    </label>
                  );
                })}
              </div>

              <div className={styles.scopeNote}>
                <ShieldCheck size={18} />
                <p>خدماتی مانند نرسینگ تخصصی، تزریقات، پزشک، روانشناسی، فیزیوتراپی و آزمایشگاه در این فرم قابل ثبت نیستند. ارائه آن‌ها به مجوز حرفه‌ای معتبر و فرایند بررسی جداگانه نیاز دارد.</p>
              </div>

              {error && <p className={styles.errorMessage} role="alert">{error}</p>}
              {notice && <p className={styles.successMessage}>{notice}</p>}
              <button type="button" className={styles.primaryButton} onClick={() => void submit()} disabled={submitting}>
                {submitting ? "در حال ثبت درخواست…" : status === "rejected" ? "ارسال مجدد برای بررسی" : "ثبت درخواست همکاری"}
              </button>
              <p className={styles.disclaimer}>ثبت این فرم به معنی تأیید هویت، صدور مجوز حرفه‌ای یا فعال‌شدن پروفایل مراقب نیست. مدارک و صلاحیت‌ها باید توسط مایکا بررسی شوند.</p>
            </section>
          )}
      </div>
    </AppShell>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}
