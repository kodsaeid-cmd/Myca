import Link from "next/link";
import { ArrowRight, ClipboardList, PhoneCall, ShieldCheck } from "lucide-react";

export function LoginScreen({ role }: { role: string; next?: string }) {
  if (role === "support-office") {
    return (
      <main className="login-page" dir="rtl">
        <div className="login-card">
          <Link href="/" className="login-logo"><span className="login-logo-mark">م</span><strong>مایکا</strong></Link>
          <h1>ورود به پنل مدیریت</h1>
          <p className="login-intro">ورود کارشناسان و مدیران از پنل مستقل مدیریت انجام می‌شود.</p>
          <Link href="/admin/login/" className="primary-button full-button">ورود به پنل مدیریت</Link>
          <Link href="/" className="back-home"><ArrowRight size={16} />بازگشت به صفحه اصلی مایکا</Link>
        </div>
      </main>
    );
  }
  return (
    <main className="login-page" dir="rtl">
      <div className="login-card">
        <Link href="/" className="login-logo"><span className="login-logo-mark">م</span><strong>مایکا</strong></Link>
        <h1>{role === "receiver" ? "پیگیری سفارش‌های مایکا" : "دسترسی همکاری مایکا"}</h1>
        <p className="login-intro">{role === "receiver"
          ? "برای ثبت سفارش نیازی به ساخت حساب جداگانه نیست؛ پروفایل مشتری هنگام اولین سفارش به‌صورت خودکار ایجاد می‌شود."
          : "ثبت‌نام و پنل خدمت‌دهندگان در این فاز آزمایشی فعال نیست. برای راهنمایی با مایکا تماس بگیرید."}</p>
        {role === "receiver" ? (
          <Link href="/track" className="primary-button full-button"><ClipboardList size={17} />پیگیری با کد سفارش</Link>
        ) : (
          <a href="tel:41124" className="primary-button full-button"><PhoneCall size={17} />تماس با مایکا · ۴۱۱۲۴</a>
        )}
        <div className="login-trust"><ShieldCheck size={16} />در نسخه آزمایشی، هر سفارش با کد پیگیری و شماره موبایل ثبت‌شده محافظت می‌شود.</div>
        <Link href="/" className="back-home"><ArrowRight size={16} />بازگشت به صفحه اول مایکا</Link>
      </div>
    </main>
  );
}
