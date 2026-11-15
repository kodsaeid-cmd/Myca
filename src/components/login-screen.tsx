"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { roleTitles } from "@/lib/catalog-data";

const roleAccess: Record<string, string[]> = {
  receiver: ["family"],
  provider: ["caregiver_applicant", "caregiver", "licensed_provider"],
  collaborator: ["network_partner"],
  "recruitment-partner": ["recruitment_partner"],
  "support-office": ["support_office", "operator", "admin", "quality", "legal"]
};

export function LoginScreen({ role, next }: { role: string; next?: string }) {
  const title = roleTitles[role] || "خدمت گیرنده";
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [accepted, setAccepted] = useState(false);
  const [employee, setEmployee] = useState(false);
  const [personType, setPersonType] = useState<"individual" | "legal">("individual");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!accepted) { setMessage("برای ادامه، شرایط استفاده را بپذیرید."); return; }
    if (!phone.trim()) { setMessage("شماره موبایل را وارد کنید."); return; }
    if (mode === "password") {
      setMessage(password.trim()
        ? "ورود با رمز عبور در این مرحله فعال نیست؛ لطفاً از کد یکبارمصرف استفاده کنید."
        : "رمز عبور را وارد کنید.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      if (!otpSent) {
        const response = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(result.error || "ارسال کد ورود ممکن نشد.");
          return;
        }
        setOtpSent(true);
        setMessage(result.message || "اگر شماره معتبر باشد، کد ورود ارسال می‌شود. کد پیامک‌شده را وارد کنید.");
        return;
      }

      if (!/^\d{6,8}$/.test(otp.trim())) {
        setMessage("کد تأیید را به‌صورت کامل وارد کنید.");
        return;
      }
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, token: otp.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "کد تأیید نادرست است.");
        return;
      }

      const allowed = roleAccess[role] ?? [];
      const roles = Array.isArray(result.roles) ? result.roles as string[] : [];
      if (!allowed.some((requiredRole) => roles.includes(requiredRole))) {
        setMessage("شماره شما تأیید شد، اما این حساب هنوز دسترسی ورود به بخش «" + title + "» را ندارد. دسترسی‌های حرفه‌ای پس از ثبت و بررسی درخواست همکاری فعال می‌شوند.");
        return;
      }

      const destination = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
        ? next
        : "/";
      window.location.assign(destination);
    } catch {
      setMessage("ارتباط با سرویس ورود برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="login-page" dir="rtl">
    <div className="login-card">
      <Link href="/" className="login-logo"><span className="login-logo-mark">م</span><strong>مایکا</strong></Link>
      <h1>ورود به عنوان {title}</h1>
      <p className="login-intro">ورود با کد یکبارمصرف از طریق شماره همراه انجام می‌شود.</p>

      {role === "recruitment-partner" && <div className="role-extra">
        <label className="check-row"><input type="checkbox" checked={employee} onChange={(event) => setEmployee(event.target.checked)} /><span className="fake-check">{employee && <Check size={14} />}</span>کارمند مایکا هستم</label>
        <PersonTypeToggle value={personType} onChange={setPersonType} />
      </div>}
      {role === "support-office" && <div className="role-extra">
        <span className="field-label">نوع شخص دفتر پشتیبانی</span>
        <PersonTypeToggle value={personType} onChange={setPersonType} />
      </div>}

      <div className="terms-box">
        <label className="check-row">
          <input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); setMessage(""); }} />
          <span className="fake-check">{accepted && <Check size={14} />}</span>
          <span>شرایط استفاده و حریم خصوصی را می‌پذیرم.</span>
        </label>
        <p><Link href="#terms">شرایط استفاده از خدمات</Link> و <Link href="#privacy">حریم خصوصی</Link> را مطالعه نموده و با آن موافقت می‌کنم.</p>
      </div>

      <div className="login-mode-switch">
        <button type="button" className={mode === "otp" ? "selected" : ""} onClick={() => { setMode("otp"); setMessage(""); setOtpSent(false); setOtp(""); }}>ورود با کد یکبارمصرف</button>
        <button type="button" className={mode === "password" ? "selected" : ""} onClick={() => { setMode("password"); setMessage(""); }}>ورود با رمز عبور</button>
      </div>

      {mode === "otp" ? <div className="login-fields">
        <label className="field-label" htmlFor="login-phone">شماره موبایل خود را وارد کنید.</label>
        <input id="login-phone" className="text-field" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={phone} onChange={(event) => { setPhone(event.target.value); setOtpSent(false); setOtp(""); }} />
        {otpSent && <>
          <label className="field-label" htmlFor="login-otp">کد تأیید پیامک‌شده</label>
          <input id="login-otp" className="text-field" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="کد یکبارمصرف" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} />
        </>}
        <button type="button" className="primary-button full-button" onClick={submit} disabled={loading}>
          {loading ? "لطفاً صبر کنید…" : otpSent ? "تأیید کد و ورود" : "ارسال کد تأیید"}
        </button>
        {otpSent && <button type="button" className="login-resend-button" onClick={() => { setOtpSent(false); setOtp(""); setMessage(""); }}>تغییر شماره یا درخواست کد جدید</button>}
      </div> : <div className="login-fields">
        <label className="field-label" htmlFor="login-phone">شماره موبایل</label>
        <input id="login-phone" className="text-field" dir="ltr" inputMode="tel" placeholder="شماره موبایل" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <label className="field-label" htmlFor="login-password">رمز عبور</label>
        <input id="login-password" className="text-field" type="password" placeholder="رمز عبور" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button type="button" className="primary-button full-button" onClick={submit} disabled={loading}>ورود</button>
        <div className="login-help-links"><button type="button" onClick={() => { setMode("otp"); setMessage("برای این نسخه، ورود با کد یکبارمصرف فعال است."); }}>استفاده از کد یکبارمصرف</button></div>
      </div>}

      {message && <p className={message.includes("ارسال می‌شود") ? "form-message" : "form-message error"} role="status">{message}</p>}
      <Link href="/" className="back-home"><ArrowRight size={16} />بازگشت به صفحه اول مایکا</Link>
      <div className="login-trust"><ShieldCheck size={16} />اطلاعات ورود با کوکی امن و غیرقابل دسترسی از JavaScript نگهداری می‌شود.</div>
    </div>
  </div>;
}

function PersonTypeToggle({ value, onChange }: { value: "individual" | "legal"; onChange: (value: "individual" | "legal") => void }) {
  return <div className="person-type-toggle">
    <button type="button" className={value === "individual" ? "selected" : ""} onClick={() => onChange("individual")}>حقیقی</button>
    <button type="button" className={value === "legal" ? "selected" : ""} onClick={() => onChange("legal")}>حقوقی</button>
  </div>;
}
