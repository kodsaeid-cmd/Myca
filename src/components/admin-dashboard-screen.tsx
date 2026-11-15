"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, ClipboardList, CreditCard, Eye, MousePointerClick, PhoneCall, RefreshCw, Users } from "lucide-react";
import styles from "./admin-dashboard.module.css";

type Order = Record<string, unknown>;
type EditState = { status: string; paymentStatus: string; paidAmountToman: string; note: string };

const orderStatuses = [
  ["submitted", "در انتظار تماس مایکا"],
  ["triage", "در انتظار بررسی کارشناسی"],
  ["matching", "در حال بررسی و هماهنگی"],
  ["offered", "پیشنهاد خدمت آماده است"],
  ["accepted", "تأیید اولیه"],
  ["quoted", "پیش‌فاکتور صادر شده"],
  ["contract_pending", "در انتظار نهایی‌سازی قرارداد"],
  ["confirmed", "خدمت تأیید شده"],
  ["in_service", "در حال ارائه خدمت"],
  ["completed", "تکمیل‌شده"],
  ["cancelled", "لغوشده"],
  ["rejected", "بسته‌شده"]
];

const paymentStatuses = [
  ["awaiting_contact", "در انتظار تماس مایکا"],
  ["awaiting_payment", "در انتظار پرداخت"],
  ["paid", "پرداخت تأیید شده"],
  ["failed", "پرداخت ناموفق"],
  ["refunded", "مسترد شده"],
  ["not_required", "بدون نیاز به پرداخت"]
];

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0) || 0;
}
function fa(value: unknown) {
  return new Intl.NumberFormat("fa-IR").format(number(value));
}
function moneyMillionToman(rial: unknown) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(number(rial) / 10_000_000);
}
function pricingOf(order: Order) {
  return order.pricing_snapshot && typeof order.pricing_snapshot === "object"
    ? order.pricing_snapshot as Record<string, unknown> : {};
}

export function AdminDashboardScreen() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");
  const [csrfToken, setCsrfToken] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/admin/login/");
        return;
      }
      if (response.status === 403) {
        setError(result.error || "این حساب مجوز ورود به پنل مدیریت را ندارد.");
        return;
      }
      if (!response.ok) {
        setError(result.error || "دریافت داشبورد ممکن نشد.");
        return;
      }
      setCsrfToken(typeof result.csrfToken === "string" ? result.csrfToken : "");
      setStats(result.stats ?? {});
      const rows = Array.isArray(result.orders) ? result.orders as Order[] : [];
      setOrders(rows);
      setEdits((current) => {
        const next = { ...current };
        for (const order of rows) {
          const id = String(order.id);
          if (!next[id]) {
            next[id] = {
              status: String(order.status ?? "submitted"),
              paymentStatus: String(order.payment_status ?? "awaiting_contact"),
              paidAmountToman: order.paid_amount_rial ? String(number(order.paid_amount_rial) / 10) : "",
              note: ""
            };
          }
        }
        return next;
      });
    } catch {
      setError("ارتباط با پنل مدیریت برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  function changeEdit(id: string, patch: Partial<EditState>) {
    setEdits((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function saveOrder(order: Order) {
    const id = String(order.id);
    const edit = edits[id];
    if (!edit || savingId) return;
    setSavingId(id);
    setNotice("");
    setError("");
    try {
      const amount = edit.paidAmountToman.trim() ? Math.round(Number(edit.paidAmountToman) * 10) : null;
      if (edit.paidAmountToman.trim() && (!Number.isSafeInteger(amount) || Number(amount) < 0)) {
        setError("مبلغ پرداخت‌شده معتبر نیست.");
        return;
      }
      const response = await fetch("/api/admin/dashboard", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          id,
          status: edit.status,
          paymentStatus: edit.paymentStatus,
          paidAmountRial: amount,
          note: edit.note
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "ذخیره تغییرات سفارش انجام نشد.");
        return;
      }
      setNotice("تغییرات سفارش " + String(order.reference) + " ذخیره شد.");
      await loadDashboard();
    } catch {
      setError("ارتباط با سرور هنگام ذخیره تغییرات قطع شد.");
    } finally {
      setSavingId("");
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken }
      });
    } finally {
      window.location.assign("/admin/login/");
    }
  }

  const metrics = [
    { label: "کل سفارش‌ها", value: fa(stats.orders_total), sub: "امروز: " + fa(stats.orders_today), Icon: ClipboardList },
    { label: "مشتریان سفارش‌دهنده", value: fa(stats.customers_total), sub: "پروفایل‌های دارای سفارش", Icon: Users },
    { label: "در انتظار تماس", value: fa(stats.pending_contact), sub: "نیازمند تماس کارشناسان", Icon: PhoneCall },
    { label: "در انتظار پرداخت", value: fa(stats.awaiting_payment), sub: "هماهنگی پرداخت تلفنی", Icon: CreditCard },
    { label: "مجموع پرداخت تأییدشده", value: moneyMillionToman(stats.paid_revenue_rial) + " م.ت", sub: "مجموع مبالغ ثبت‌شده", Icon: Activity },
    { label: "بازدید صفحات", value: fa(stats.page_views_total), sub: "امروز: " + fa(stats.page_views_today), Icon: Eye },
    { label: "کلیک تماس", value: fa(stats.phone_clicks_total), sub: "امروز: " + fa(stats.phone_clicks_today), Icon: PhoneCall },
    { label: "کلیک CTA", value: fa(stats.cta_clicks_total), sub: "کلیک روی اقدام‌های علامت‌گذاری‌شده", Icon: MousePointerClick },
    { label: "بازدیدکننده یکتا", value: fa(stats.unique_visitors_total), sub: "Session: " + fa(stats.sessions_total), Icon: Users }
  ];

  return (
    <main className={styles.admin} dir="rtl">
      <header className={styles.topbar}>
        <div>
          <span className={styles.eyebrow}>MYCA · ADMINISTRATION</span>
          <h1>مرکز مدیریت مایکا</h1>
          <p>مدیریت سفارش‌ها، مشتریان، پرداخت‌های هماهنگ‌شده و عملکرد وب‌سایت</p>
        </div>
        <div className={styles.topbarActions}>
          <button type="button" className={styles.refresh} onClick={() => void loadDashboard()} disabled={loading}>
            <RefreshCw size={16} /> به‌روزرسانی
          </button>
          <button type="button" className={styles.logout} onClick={() => void logout()}>
            خروج از پنل
          </button>
        </div>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <section className={styles.metrics} aria-label="شاخص‌های کلیدی">
        {metrics.map(({ label, value, sub, Icon }) => (
          <article className={styles.metric} key={label}>
            <span className={styles.metricIcon}><Icon size={19} /></span>
            <span className={styles.metricLabel}>{label}</span>
            <strong>{value}</strong>
            <small>{sub}</small>
          </article>
        ))}
      </section>

      <section className={styles.analytics}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>TRAFFIC OVERVIEW</span><h2>صفحات پربازدید</h2></div>
          <span className={styles.muted}>مجموع بازدید ثبت‌شده</span>
        </div>
        {Array.isArray(stats.top_pages) && (stats.top_pages as Array<Record<string, unknown>>).length > 0
          ? <div className={styles.topPages}>{(stats.top_pages as Array<Record<string, unknown>>).map((page) => (
              <div className={styles.topPage} key={String(page.path)}>
                <span dir="ltr">{String(page.path)}</span><strong>{fa(page.views)} بازدید</strong>
              </div>
            ))}</div>
          : <p className={styles.muted}>هنوز داده‌ای برای نمایش ثبت نشده است.</p>}
        <div className={styles.clickSummary}>
          <span><PhoneCall size={15} /> تماس: {fa(stats.phone_clicks_total)}</span>
          <span><MousePointerClick size={15} /> CTA: {fa(stats.cta_clicks_total)}</span>
          <span><ArrowUpRight size={15} /> دکمه‌ها: {fa(stats.button_clicks_total)}</span>
          <span><ArrowDownRight size={15} /> لینک‌ها: {fa(stats.link_clicks_total)}</span>
        </div>
      </section>

      <section className={styles.analytics}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>PACKAGE PERFORMANCE</span><h2>تعداد سفارش هر پکیج</h2></div>
          <span className={styles.muted}>بر اساس سفارش‌های ثبت‌شده</span>
        </div>
        {Array.isArray(stats.package_orders) && (stats.package_orders as Array<Record<string, unknown>>).length > 0
          ? <div className={styles.topPages}>{(stats.package_orders as Array<Record<string, unknown>>).map((item) => (
              <div className={styles.topPage} key={String(item.package_id)}>
                <span>{String(item.package_title ?? item.package_id)}</span><strong>{fa(item.orders)} سفارش</strong>
              </div>
            ))}</div>
          : <p className={styles.muted}>هنوز سفارشی برای پکیج‌ها ثبت نشده است.</p>}
      </section>

      <section className={styles.orders}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>ORDER MANAGEMENT</span><h2>سفارش‌های اخیر</h2></div>
          <span className={styles.muted}>{fa(orders.length)} سفارش آخر</span>
        </div>
        {loading ? <p className={styles.muted}>در حال دریافت سفارش‌ها…</p> : orders.length === 0
          ? <p className={styles.muted}>هنوز سفارشی ثبت نشده است.</p>
          : <div className={styles.orderList}>
            {orders.map((order) => {
              const id = String(order.id);
              const edit = edits[id] ?? {
                status: String(order.status ?? "submitted"),
                paymentStatus: String(order.payment_status ?? "awaiting_contact"),
                paidAmountToman: "",
                note: ""
              };
              const pricing = pricingOf(order);
              return (
                <article className={styles.orderCard} key={id}>
                  <div className={styles.orderTop}>
                    <div><span className={styles.orderRef}>{String(order.reference ?? "—")}</span><h3>{String(pricing.package_title ?? order.service_slug ?? "سفارش مایکا")}</h3></div>
                    <span className={styles.orderDate}>{typeof order.created_at === "string" ? new Date(order.created_at).toLocaleString("fa-IR") : "—"}</span>
                  </div>
                  <div className={styles.orderDetails}>
                    <span>سفارش‌دهنده: <strong>{String(order.requester_name ?? "—")}</strong></span>
                    <span>موبایل: <strong dir="ltr">{String(order.requester_phone ?? "—")}</strong></span>
                    <span>دریافت‌کننده: <strong>{String(order.recipient_name ?? "—")}</strong></span>
                    <span>شهر: <strong>{String(order.city ?? "—")}</strong></span>
                    <span>شیفت: <strong>{String(order.requested_shift ?? "—")}</strong></span>
                    <span>برآورد: <strong>{typeof pricing.total_estimate_rial === "number" ? moneyMillionToman(pricing.total_estimate_rial) + " میلیون تومان" : "نیازمند استعلام"}</strong></span>
                  </div>
                  <div className={styles.editGrid}>
                    <label><span>وضعیت سفارش</span><select value={edit.status} onChange={(event) => changeEdit(id, { status: event.target.value })}>
                      {orderStatuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                    </select></label>
                    <label><span>وضعیت پرداخت</span><select value={edit.paymentStatus} onChange={(event) => changeEdit(id, { paymentStatus: event.target.value })}>
                      {paymentStatuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                    </select></label>
                    <label><span>مبلغ پرداخت‌شده (تومان)</span><input inputMode="numeric" value={edit.paidAmountToman} onChange={(event) => changeEdit(id, { paidAmountToman: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="فقط پس از دریافت وجه" /></label>
                    <label className={styles.noteField}><span>یادداشت داخلی / توضیح تغییر</span><input value={edit.note} onChange={(event) => changeEdit(id, { note: event.target.value })} placeholder="مثلاً تماس گرفته شد؛ منتظر پاسخ خانواده" /></label>
                  </div>
                  <div className={styles.orderActions}>
                    <a href={"/track?reference=" + encodeURIComponent(String(order.reference ?? ""))} target="_blank" rel="noreferrer">مشاهده صفحه پیگیری</a>
                    <button type="button" onClick={() => void saveOrder(order)} disabled={savingId === id || loading}>
                      {savingId === id ? "در حال ذخیره…" : "ذخیره تغییرات"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>}
      </section>
      <footer className={styles.footer}>مایکا · پنل مدیریت داخلی · پرداخت فاز اول با هماهنگی تلفنی</footer>
    </main>
  );
}
