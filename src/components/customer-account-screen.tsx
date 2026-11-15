"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, PhoneCall, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import styles from "./request-flow.module.css";

type AccountData = { profile?: Record<string, unknown>; orders?: Array<Record<string, unknown>> };

export function CustomerAccountScreen() {
  const [data, setData] = useState<AccountData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/account", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.status === 401) {
          window.location.assign("/login/receiver?next=%2Faccount");
          return;
        }
        if (!response.ok) {
          setError(result.error || "پروفایل مشتری دریافت نشد.");
        } else {
          setData(result);
        }
      } catch {
        if (active) setError("ارتباط با حساب کاربری برقرار نشد.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const profile = data.profile ?? {};
  const orders = data.orders ?? [];
  return (
    <AppShell activeNav="profile">
      <div className={styles.container} dir="rtl">
        <Link href="/" className={styles.backLink}><ArrowRight size={16} />بازگشت به خانه</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>MYCA CUSTOMER PROFILE</span>
          <h1>پروفایل مشتری</h1>
          <p>اطلاعات حساب و سفارش‌هایی که با این شماره موبایل ثبت کرده‌اید.</p>
        </header>
        {loading ? <div className={styles.emptyState}>در حال دریافت پروفایل…</div>
          : error ? <div className={styles.emptyState}><p>{error}</p></div>
          : <>
            <section className={styles.summaryCard}>
              <div className={styles.summaryHeader}><UserRound size={20} /><strong>اطلاعات حساب</strong></div>
              <div className={styles.summaryLine}><span>نام مشتری</span><strong>{String(profile.full_name ?? "نام ثبت نشده")}</strong></div>
              <div className={styles.summaryLine}><span>شماره موبایل تأییدشده</span><strong dir="ltr">{String(profile.phone ?? "—")}</strong></div>
              <div className={styles.summaryLine}><span>تاریخ ایجاد پروفایل</span><strong>{typeof profile.created_at === "string" ? new Date(profile.created_at).toLocaleDateString("fa-IR") : "—"}</strong></div>
            </section>
            <section className={styles.summaryCard}>
              <div className={styles.summaryHeader}><ClipboardList size={20} /><strong>سفارش‌های ثبت‌شده</strong></div>
              <div className={styles.summaryLine}><span>تعداد کل سفارش‌ها</span><strong>{new Intl.NumberFormat("fa-IR").format(orders.length)}</strong></div>
              {orders.slice(0, 3).map((order) => {
                const pricing = order.pricing_snapshot && typeof order.pricing_snapshot === "object" ? order.pricing_snapshot as Record<string, unknown> : {};
                return <div className={styles.summaryLine} key={String(order.id)}><span>{String(pricing.package_title ?? order.service_slug ?? "سفارش مایکا")}</span><strong>{String(order.reference ?? "—")}</strong></div>;
              })}
              <Link href="/requests" className={styles.primaryButton}>مشاهده همه سفارش‌ها</Link>
            </section>
          </>}
        <div className={styles.buttonColumn}>
          <Link href="/track" className={styles.secondaryButton}>پیگیری با کد سفارش</Link>
          <a href="tel:41124" className={styles.secondaryButton}><PhoneCall size={16} />تماس با مایکا · ۴۱۱۲۴</a>
        </div>
      </div>
    </AppShell>
  );
}
