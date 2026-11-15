"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { roleTitles } from "@/lib/catalog-data";

export function LoginScreen({ role }: { role: string }) {
  const title = roleTitles[role] || "خدمت گیرنده";
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [accepted, setAccepted] = useState(false);
  const [employee, setEmployee] = useState(false);
  const [personType, setPersonType] = useState<"individual" | "legal">("individual");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function submit() {
    if (!accepted) { setMessage("برای ادامه، شرایط استفاده را بپذیرید."); return; }
    if (!phone.trim()) { setMessage("شماره موبایل را وارد کنید."); return; }
    if (mode === "password" && !password.trim()) { setMessage("رمز عبور را وارد کنید."); return; }
    setMessage("اتصال احراز هویت در نسخه بازسازی هنوز فعال نشده است.");
  }

  return <div className="login-page" dir="rtl">
    <div className="login-card">
      <Link href="/" className="login-logo"><span className="login-logo-mark">م</span><strong>مایکا</strong></Link>
      <h1>ورود به عنوان {title}</h1>
      <p className="login-intro">ورود با کد یکبار مصرف سریع‌تر است. اگر پیامک در دسترس نبود، از رمز عبور استفاده کنید.</p>

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
        <button type="button" className={mode === "otp" ? "selected" : ""} onClick={() => { setMode("otp"); setMessage(""); }}>ورود با کد یکبار مصرف</button>
        <button type="button" className={mode === "password" ? "selected" : ""} onClick={() => { setMode("password"); setMessage(""); }}>ورود با رمز عبور</button>
      </div>

      {mode === "otp" ? <div className="login-fields">
        <label className="field-label" htmlFor="login-phone">شماره موبایل خود را برای دریافت کد تایید وارد کنید.</label>
        <input id="login-phone" className="text-field" dir="ltr" inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <button type="button" className="primary-button full-button" onClick={submit}>ارسال کد تایید</button>
      </div> : <div className="login-fields">
        <label className="field-label" htmlFor="login-phone">شماره موبایل</label>
        <input id="login-phone" className="text-field" dir="ltr" inputMode="tel" placeholder="شماره موبایل" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <label className="field-label" htmlFor="login-password">رمز عبور</label>
        <input id="login-password" className="text-field" type="password" placeholder="رمز عبور" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button type="button" className="primary-button full-button" onClick={submit}>ورود</button>
        <div className="login-help-links"><Link href="#register">ثبت‌نام و ایجاد رمز</Link><Link href="#forgot">فراموشی رمز عبور</Link></div>
      </div>}

      {message && <p className={message.includes("شرایط") ? "form-message error" : "form-message"}>{message}</p>}
      <Link href="/" className="back-home"><ArrowRight size={16} />بازگشت به صفحه اول مایکا</Link>
      <div className="login-trust"><ShieldCheck size={16} />اطلاعات شما نزد مایکا محفوظ می‌ماند.</div>
    </div>
  </div>;
}

function PersonTypeToggle({ value, onChange }: { value: "individual" | "legal"; onChange: (value: "individual" | "legal") => void }) {
  return <div className="person-type-toggle">
    <button type="button" className={value === "individual" ? "selected" : ""} onClick={() => onChange("individual")}>حقیقی</button>
    <button type="button" className={value === "legal" ? "selected" : ""} onClick={() => onChange("legal")}>حقوقی</button>
  </div>;
}