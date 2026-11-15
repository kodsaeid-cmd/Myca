"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, Baby, CheckCircle2, ChevronLeft, HeartHandshake,
  Home, PhoneCall, ShieldCheck, Sparkles, Utensils
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { commissionRates, type PricingCatalog } from "@/lib/pricing-data";

function formatMillions(value: number) {
  return new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

export function PricingCatalogScreen({ catalog }: { catalog: PricingCatalog }) {
  const firstPricedPackage = catalog.packages.find((item) => typeof item.monthlySalaryMillion === "number");
  const [selectedPackageId, setSelectedPackageId] = useState(firstPricedPackage?.id ?? catalog.packages[0].id);
  const [months, setMonths] = useState(1);
  const selectedPackage = catalog.packages.find((item) => item.id === selectedPackageId) ?? catalog.packages[0];
  const monthlySalary = selectedPackage.monthlySalaryMillion ?? 0;
  const commissionPercent = commissionRates.find((item) => item.months === months)?.percent ?? 0;
  const salarySubtotal = monthlySalary * months;
  const commission = monthlySalary * commissionPercent / 100;
  const estimatedTotal = salarySubtotal + commission;
  const hasEstimate = typeof selectedPackage.monthlySalaryMillion === "number";
  const sharedIcons = [Home, Utensils, HeartHandshake, ShieldCheck];

  return (
    <AppShell activeNav="home">
      <div className="pricing-catalog">
        <div className="catalog-back">
          <Link href="/catalogs"><ArrowRight size={16} />بازگشت به کاتالوگ‌ها</Link>
        </div>

        <section className="pricing-hero">
          <Image src={catalog.hero} alt="" fill unoptimized sizes="393px" className="pricing-hero-image" />
          <div className="pricing-hero-overlay" />
          <div className="pricing-hero-content">
            <span>{catalog.eyebrow}</span>
            <h1>{catalog.title}</h1>
            <p>{catalog.description}</p>
          </div>
        </section>

        <p className="pricing-intro">{catalog.summary}</p>

        <section className="pricing-section">
          <div className="pricing-section-heading">
            <span>{catalog.kind === "child" ? "خدمات پایه مراقبت کودک" : "خدمات پایه مشترک"}</span>
            <h2>{catalog.kind === "child" ? "در پکیج‌های مراقبت کودک چه خدمات پایه‌ای ارائه می‌شود؟" : "در تمام پکیج‌ها چه خدماتی ارائه می‌شود؟"}</h2>
          </div>
          <div className="pricing-shared-grid">
            {catalog.sharedServices.map((service, index) => {
              const Icon = sharedIcons[index % sharedIcons.length];
              return (
                <article className="pricing-shared-card" key={service.title}>
                  <span className="pricing-shared-icon"><Icon size={19} /></span>
                  <strong>{service.title}</strong>
                  <p>{service.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="pricing-section">
          <div className="pricing-section-heading">
            <span>انتخاب پکیج</span>
            <h2>کدام خدمت با نیاز خانواده شما هماهنگ‌تر است؟</h2>
            <p>برای مشاهده برآورد، یکی از پکیج‌ها را انتخاب کنید.</p>
          </div>
          <div className="pricing-package-grid">
            {catalog.packages.map((item) => {
              const isSelected = item.id === selectedPackageId;
              return (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={isSelected}
                  className={["pricing-package-card", item.custom ? "pricing-custom-card" : "", isSelected ? "selected" : ""].filter(Boolean).join(" ")}
                  onClick={() => setSelectedPackageId(item.id)}
                >
                  <span className="pricing-package-topline">
                    <span className="pricing-package-icon">{item.custom ? <Sparkles size={19} /> : catalog.kind === "child" ? <Baby size={19} /> : <HeartHandshake size={19} />}</span>
                    <span className="pricing-package-tag">{item.tag}</span>
                  </span>
                  <strong>{item.title}</strong>
                  {item.ageRange && <span className="pricing-package-age">{item.ageRange}</span>}
                  <p>{item.description}</p>
                  <span className="pricing-package-price">
                    {typeof item.monthlySalaryMillion === "number" ? formatMillions(item.monthlySalaryMillion) + " میلیون تومان" : "قیمت‌گذاری اختصاصی"}
                  </span>
                  <span className="pricing-package-caption">
                    {typeof item.monthlySalaryMillion === "number" ? "حقوق ماهانه مراقب" : "برای استعلام با مایکا تماس بگیرید"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {hasEstimate ? (
          <section className="pricing-calculator" aria-live="polite">
            <div className="pricing-calculator-heading">
              <span>محاسبه‌گر قرارداد</span>
              <h2>برآورد هزینه پکیج {selectedPackage.title}</h2>
              <p>مدت قرارداد را انتخاب کنید تا مبلغ حقوق مراقب و کمیسیون یک‌باره مایکا محاسبه شود.</p>
            </div>

            <div className="pricing-calculator-field">
              <strong>مدت قرارداد</strong>
              <div className="pricing-term-options" role="group" aria-label="مدت قرارداد">
                {commissionRates.map((item) => (
                  <button
                    type="button"
                    key={item.months}
                    aria-pressed={months === item.months}
                    className={months === item.months ? "pricing-term-chip selected" : "pricing-term-chip"}
                    onClick={() => setMonths(item.months)}
                  >
                    {formatMillions(item.months)} ماه
                  </button>
                ))}
              </div>
            </div>

            <div className="pricing-price-breakdown">
              <div className="pricing-price-row">
                <span>حقوق ماهانه مراقب</span>
                <strong>{formatMillions(monthlySalary)} میلیون تومان</strong>
              </div>
              <div className="pricing-price-row">
                <span>مجموع حقوق مراقب در {formatMillions(months)} ماه</span>
                <strong>{formatMillions(salarySubtotal)} میلیون تومان</strong>
              </div>
              <div className="pricing-price-row">
                <span>کمیسیون یک‌باره مایکا ({formatMillions(commissionPercent)}٪)</span>
                <strong>{formatMillions(commission)} میلیون تومان</strong>
              </div>
              <div className="pricing-price-total">
                <span>هزینه کل برآوردی قرارداد</span>
                <strong>{formatMillions(estimatedTotal)} <small>میلیون تومان</small></strong>
              </div>
            </div>

            <p className="pricing-calculator-note">
              این برآورد بر پایه حقوق ماهانه پایه پکیج محاسبه شده است. هزینه شیفت شبانه‌روزی، حضور در روز جمعه و در کاتالوگ کودک، کودک اضافه، جداگانه به مبلغ قرارداد افزوده می‌شوند و در عدد بالا لحاظ نشده‌اند.
            </p>
            <a href="tel:41124" className="pricing-primary-cta"><PhoneCall size={18} />استعلام و نهایی‌سازی قرارداد با مایکا</a>
          </section>
        ) : (
          <section className="pricing-quote-card">
            <strong>برای این خدمت، قیمت‌گذاری اختصاصی انجام می‌شود.</strong>
            <p>شرایط خانواده و نیازهای خدمت را با کارشناسان مایکا مطرح کنید تا خدمت متناسب طراحی و هزینه آن اعلام شود.</p>
            <a href="tel:41124" className="pricing-primary-cta"><PhoneCall size={18} />تماس با مایکا · ۴۱۱۲۴</a>
          </section>
        )}

        <section className="pricing-section">
          <div className="pricing-section-heading">
            <span>کمیسیون شفاف</span>
            <h2>درصد کمیسیون بر اساس مدت قرارداد</h2>
            <p>کمیسیون مایکا یک‌بار در هر قرارداد محاسبه و دریافت می‌شود.</p>
          </div>
          <div className="pricing-commission-grid">
            {commissionRates.map((item) => (
              <div className="pricing-commission-cell" key={item.months}>
                <strong>{formatMillions(item.percent)}٪</strong>
                <span>{formatMillions(item.months)} ماه</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pricing-section">
          <div className="pricing-section-heading">
            <span>شرایط محاسبه</span>
            <h2>نکات مهم درباره پکیج و هزینه‌ها</h2>
          </div>
          <ul className="pricing-rule-list">
            {catalog.rules.map((rule) => <li key={rule}><CheckCircle2 size={17} />{rule}</li>)}
          </ul>
          <div className="pricing-source-note">
            مبالغ پکیج‌ها، حقوق ماهانه مراقب به میلیون تومان هستند و هزینه کل قرارداد برابر مجموع حقوق مراقب در مدت قرارداد به‌علاوه کمیسیون یک‌باره مایکا است. هزینه‌های افزوده طبق شرایط هر خدمت جداگانه محاسبه می‌شوند.
          </div>
        </section>

        <footer className="pricing-footer">
          <span>مایکا · همراه خانواده</span>
          <a href="tel:41124">۴۱۱۲۴ · تماس با مایکا</a>
          <Link href="/catalogs"><ChevronLeft size={15} />سایر کاتالوگ‌ها</Link>
        </footer>
      </div>
    </AppShell>
  );
}
