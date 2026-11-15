"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldCheck, LockKeyhole, ArrowRight } from "lucide-react";
import styles from "./admin-dashboard.module.css";

export function AdminLoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "ورود به پنل مدیریت انجام نشد.");
        return;
      }
      window.location.assign("/admin/");
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.authWrap} dir="rtl">
      <form className={styles.authCard} onSubmit={submit}>
        <span className={styles.eyebrow}>MYCA · ADMINISTRATION</span>
        <h1>ورود به پنل مدیریت</h1>
        <p>این بخش فقط برای مدیران و کارشناسان مجاز مایکا است.</p>
        <label className={styles.authField}><span>نام کاربری</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
        <label className={styles.authField}><span>رمز عبور</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.authSubmit} type="submit" disabled={loading}>{loading ? "در حال بررسی…" : "ورود امن به پنل"} <LockKeyhole size={16} /></button>
        <div className={styles.authHint}><ShieldCheck size={15} />نشست مدیریت با کوکی امن و محافظت CSRF نگهداری می‌شود.</div>
        <Link className={styles.authLink} href="/admin/setup/">راه‌اندازی اولیه مدیر سیستم</Link>
        <Link className={styles.authLink} href="/"><ArrowRight size={14} /> بازگشت به وب‌سایت مایکا</Link>
      </form>
    </main>
  );
}

export function AdminSetupScreen() {
  const [setupToken, setSetupToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setupToken, displayName, username, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "ساخت مدیر اولیه انجام نشد.");
        return;
      }
      window.location.assign("/admin/");
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.authWrap} dir="rtl">
      <form className={styles.authCard} onSubmit={submit}>
        <span className={styles.eyebrow}>ONE-TIME SECURE SETUP</span>
        <h1>ساخت مدیر اولیه مایکا</h1>
        <p>این صفحه فقط تا پیش از ایجاد اولین مدیر فعال است. کلید راه‌اندازی را از فایل خصوصی سرور وارد کنید.</p>
        <label className={styles.authField}><span>کلید یک‌بارمصرف راه‌اندازی</span>
          <input type="password" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} autoComplete="off" required /></label>
        <label className={styles.authField}><span>نام و نام خانوادگی</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required /></label>
        <label className={styles.authField}><span>نام کاربری انگلیسی</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" minLength={3} required /></label>
        <label className={styles.authField}><span>رمز عبور قوی (حداقل ۱۲ کاراکتر)</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required /></label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.authSubmit} type="submit" disabled={loading}>{loading ? "در حال ساخت حساب…" : "ساخت مدیر و ورود به پنل"} <LockKeyhole size={16} /></button>
        <div className={styles.authHint}><ShieldCheck size={15} />پس از ساخت مدیر، کلید راه‌اندازی را از فایل خصوصی سرور حذف یا تعویض کنید.</div>
        <Link className={styles.authLink} href="/admin/login/">بازگشت به ورود مدیریت</Link>
      </form>
    </main>
  );
}
