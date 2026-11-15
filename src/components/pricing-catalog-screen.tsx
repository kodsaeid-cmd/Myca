"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Baby, CheckCircle2, ChevronLeft, HeartHandshake,
  Home, ShieldCheck, Sparkles, Utensils
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { commissionRates, type PricingCatalog, type PricingPackage } from "@/lib/pricing-data";

function formatMillions(value: number) {
  return new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

function getPackageHref(catalog: PricingCatalog, item: PricingPackage) {
  const categoryId = catalog.kind === "child" ? "12" : "11";
  const service = item.requestService ?? (catalog.kind === "child" ? "child-care" : "independent");
  if (item.custom) {
    return `/request/new?category=${categoryId}&service=${service}&package=custom`;
  }
  return item.detailId ? `/package-ui/?product=${item.detailId}` : `/request/new?category=${categoryId}&service=${service}&package=${item.id}`;
}

export function PricingCatalogScreen({ catalog }: { catalog: PricingCatalog }) {
  const sharedIcons = [Home, Utensils, HeartHandshake, ShieldCheck];

  return (
    <AppShell activeNav="home">
      <div className="pricing-catalog">
        <div className="catalog-back">
          <Link href="/"><ArrowRight size={16} />بازگشت به صفحه اصلی</Link>
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
            <p>یکی از پنج پکیج آماده را انتخاب کنید یا پکیج متناسب با نیاز خودتان را بسازید.</p>
          </div>
          <div className="pricing-package-grid">
            {catalog.packages.map((item) => {
              const href = getPackageHref(catalog, item);
              return (
                <Link
                  href={href}
                  key={item.id}
                  aria-label={item.custom ? "ساخت پکیج اختصاصی" : `مشاهده جزئیات پکیج ${item.title}`}
                  className={["pricing-package-card", item.custom ? "pricing-custom-card" : ""].filter(Boolean).join(" ")}
                >
                  <span className="pricing-package-topline">
                    <span className="pricing-package-icon">{item.custom ? <Sparkles size={19} /> : catalog.kind === "child" ? <Baby size={19} /> : <HeartHandshake size={19} />}</span>
                    <span className="pricing-package-tag">{item.tag}</span>
                  </span>
                  <strong>{item.title}</strong>
                  {item.ageRange && <span className="pricing-package-age">{item.ageRange}</span>}
                  <p>{item.description}</p>
                  <span className="pricing-package-price">
                    {typeof item.monthlySalaryMillion === "number" ? formatMillions(item.monthlySalaryMillion) + " میلیون تومان" : "طراحی و قیمت‌گذاری اختصاصی"}
                  </span>
                  <span className="pricing-package-caption">
                    {item.custom ? "ورود به سفارشی‌ساز مایکا" : "مشاهده جزئیات، خدمات و برآورد هزینه"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="pricing-section">
          <div className="pricing-section-heading">
            <span>کمیسیون شفاف</span>
            <h2>درصد کمیسیون بر اساس مدت قرارداد</h2>
            <p>کمیسیون مایکا یک‌بار در هر قرارداد محاسبه می‌شود.</p>
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
            مبالغ پکیج‌ها، حقوق ماهانه مراقب به میلیون تومان هستند. برآورد نهایی با توجه به مدت قرارداد، نوع شیفت و شرایط خانواده در صفحه جزئیات هر پکیج نمایش داده می‌شود.
          </div>
        </section>

        <footer className="pricing-footer">
          <span>مایکا · همراه خانواده</span>
          <a href="tel:41124">۴۱۱۲۴ · تماس با مایکا</a>
          <Link href="/"><ChevronLeft size={15} />بازگشت به صفحه اصلی</Link>
        </footer>
      </div>
    </AppShell>
  );
}
