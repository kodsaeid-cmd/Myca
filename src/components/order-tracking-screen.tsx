"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, PhoneCall, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import styles from "./request-flow.module.css";

type TrackingOrder = Record<string, unknown>;

function fa(value: number) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
}
function orderStatus(status: unknown) {
  const labels: Record<string, string> = {
    submitted: "در انتظار تماس مایکا", triage: "در انتظار بررسی کارشناسی",
    matching: "در حال بررسی و هماهنگی", offered: "پیشنهاد خدمت آماده است",
    accepted: "تأیید اولیه", quoted: "پیش‌فاکتور صادر شده",
    contract_pending: "در انتظار نهایی‌سازی قرارداد", confirmed: "خدمت تأیید شده",
    in_service: "در حال ارائه خدمت", completed: "تکمیل‌شده",
    cancelled: "لغوشده", rejected: "بسته‌شده"
  };
  return typeof status === "string" ? labels[status] ?? status : "در حال بررسی";
}
function paymentStatus(status: unknown) {
  const labels: Record<string, string> = {
    awaiting_contact: "در انتظار تماس کارشناس برای هماهنگی پرداخت",
    awaiting_payment: "در انتظار پرداخت", paid: "پرداخت توسط مایکا تأیید شده است",
    failed: "پرداخت ناموفق", refunded: "مبلغ مسترد شده است", not_required: "این سفارش نیازمند پرداخت نیست"
  };
  return typeof status === "string" ? labels[status] ?? status : "در انتظار هماهنگی";
}

export function OrderTrackingScreen({ initialReference = "" }: { initialReference?: string }) {
  const [reference, setReference] = useState(initialReference);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function trackOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, phone })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "سفارش با این اطلاعات پیدا نشد.");
        return;
      }
      setOrder(result.order ?? null);
    } catch {
      setError("ارتباط با سامانه پیگیری برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  const pricing = order?.pricing && typeof order.pricing === "object" ? order.pricing as Record<string, unknown> : {};
  const events = Array.isArray(order?.events) ? order.events as Array<Record<string, unknown>> : [];

  return (
    <AppShell activeNav="requests">
      <div className={styles.container} dir="rtl">
        <Link href="/" className={styles.backLink}><ArrowRight size={16} />بازگشت به خانه</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>MYCA ORDER TRACKING</span>
          <h1>پیگیری سفارش مایکا</h1>
          <p>کد پیگیری و شماره موبایلی را وارد کنید که هنگام ثبت سفارش تأیید شده است.</p>
        </header>
        <form className={styles.summaryCard} onSubmit={trackOrder}>
          <div className={styles.summaryHeader}><Search size={19} /><strong>اطلاعات پیگیری</strong></div>
          <label className={styles.fieldFull}><span>کد پیگیری سفارش</span>
            <input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="MYCA-YYYYMM-000001" dir="ltr" required /></label>
          <label className={styles.fieldFull}><span>شماره موبایل ثبت‌شده</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" inputMode="tel" dir="ltr" required /></label>
          {error && <p className={styles.errorMessage} role="alert">{error}</p>}
          <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? "در حال بررسی…" : "پیگیری سفارش"} <Search size={16} /></button>
        </form>

        {order && <section className={styles.section}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}><CheckCircle2 size={20} /><strong>اطلاعات سفارش</strong></div>
            <div className={styles.reference}><span>کد پیگیری</span><strong>{String(order.reference)}</strong></div>
            <div className={styles.summaryLine}><span>سفارش‌دهنده</span><strong>{String(order.requesterName ?? "—")}</strong></div>
            <div className={styles.summaryLine}><span>پکیج / خدمت</span><strong>{String(pricing.package_title ?? order.serviceSlug ?? "—")}</strong></div>
            {typeof order.recipientName === "string" && order.recipientName && <div className={styles.summaryLine}><span>دریافت‌کننده خدمت</span><strong>{order.recipientName}</strong></div>}
            <div className={styles.summaryLine}><span>شهر</span><strong>{String(order.city ?? "—")}</strong></div>
            <div className={styles.summaryLine}><span>وضعیت سفارش</span><strong>{orderStatus(order.status)}</strong></div>
            <div className={styles.summaryLine}><span>وضعیت پرداخت</span><strong>{paymentStatus(order.paymentStatus)}</strong></div>
            {typeof pricing.total_estimate_rial === "number" && <div className={styles.summaryLine}><span>برآورد اولیه</span><strong>{fa(pricing.total_estimate_rial / 10_000_000)} میلیون تومان</strong></div>}
            {typeof order.paidAmountRial === "number" && <div className={styles.summaryLine}><span>مبلغ پرداخت تأییدشده</span><strong>{fa(order.paidAmountRial / 10)} تومان</strong></div>}
            <p className={styles.hint}><ShieldCheck size={15} />پرداخت این سفارش با هماهنگی تلفنی انجام می‌شود. تا زمانی که وضعیت پرداخت «تأیید شده» نباشد، مبلغی در سامانه به‌عنوان پرداخت‌شده ثبت نشده است.</p>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}><ClipboardList size={20} /><strong>تاریخچه وضعیت سفارش</strong></div>
            {events.length ? <div className={styles.draftList}>{events.map((item, index) => (
              <article className={styles.draftCard} key={String(item.created_at ?? index)}>
                <div className={styles.draftTopline}><strong>{item.event_type === "payment_status_changed" ? "وضعیت پرداخت تغییر کرد" : orderStatus(item.to_status)}</strong><span className={styles.submittedStatus}>{typeof item.created_at === "string" ? new Date(item.created_at).toLocaleString("fa-IR") : "—"}</span></div>
                {item.event_type === "payment_status_changed" && <p>وضعیت پرداخت توسط کارشناس مایکا به‌روزرسانی شد.</p>}
              </article>
            ))}</div> : <p className={styles.hint}>هنوز رویداد دیگری برای این سفارش ثبت نشده است.</p>}
          </div>
        </section>}

        <div className={styles.buttonColumn}>
          <Link href="/requests" className={styles.secondaryButton}>مشاهده سفارش‌های حساب کاربری</Link>
          <a href="tel:41124" className={styles.secondaryButton}><PhoneCall size={16} />تماس با مایکا · ۴۱۱۲۴</a>
        </div>
      </div>
    </AppShell>
  );
}
