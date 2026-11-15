"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, ChevronLeft, Headset, Zap } from "lucide-react";
import { AppShell, AuthGateModal } from "@/components/app-shell";
import type { CategoryData, ServiceItem } from "@/lib/myca-data";

export function CategoryScreen({ category }: { category: CategoryData }) {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  function selectService(service: ServiceItem) {
    if (service.href) { router.push(service.href); return; }
    if (service.requiresAuthOnSelect || !service.options?.length) { setAuthOpen(true); return; }
    setSelectedService(service);
  }

  return <AppShell>
    <div className="back-row">
      <Link href={selectedService ? "/category/" + category.id : category.id === "22" ? "/category/11" : category.id === "27" ? "/category/12" : "/"} className="back-link" onClick={(event) => {
        if (selectedService) { event.preventDefault(); setSelectedService(null); }
      }}><ArrowRight size={16} />بازگشت به عقب</Link>
    </div>
    <h1 className="category-title">{selectedService ? selectedService.title : category.title}</h1>
    <section className="category-hero">
      <Image src={category.hero} alt="" fill unoptimized sizes="448px" className="hero-image" />
      <div className="category-hero-scrim" />
      <div className="category-hero-copy">
        <p>{selectedService ? selectedService.title : category.headline}</p>
        <p>{selectedService ? "انتخاب نوع خدمت مورد نیاز" : category.subheadline}</p>
        {category.supportingText && !selectedService && <small>{category.supportingText}</small>}
      </div>
    </section>

    <section className="category-services">
      {selectedService ? (selectedService.options?.length ? selectedService.options.map((option) => <button type="button" className="category-service-row" key={option.title} onClick={() => setAuthOpen(true)}>
        <span className="category-service-icon"><Image src={"https://mycaapp.com/myca-icons/" + selectedService.icon} alt="" width={42} height={42} unoptimized /></span>
        <span className="category-service-copy"><strong>{selectedService.title} {option.title}</strong><small>{option.description}</small></span>
        <span className="row-chevron"><ChevronLeft size={20} /></span>
      </button>) : <div className="category-service-row"><span className="category-service-copy"><strong>{selectedService.title}</strong><small>{selectedService.description}</small></span></div>) : category.services.map((service) => <button type="button" className="category-service-row" key={service.slug} onClick={() => selectService(service)}>
        <span className="category-service-icon"><Image src={"https://mycaapp.com/myca-icons/" + service.icon} alt="" width={42} height={42} unoptimized /></span>
        <span className="category-service-copy"><strong>{service.title}</strong><small>{service.description}</small></span>
        <span className="row-chevron"><ChevronLeft size={20} /></span>
      </button>)}
    </section>

    {category.id === "11" && <Link href="/catalogs/elders-pricing" className="category-action support-action" dir="ltr">
      <span className="category-action-icon"><BookOpen size={22} /></span>
      <span className="category-action-copy" dir="rtl"><strong>پکیج‌های سالمندی و برآورد هزینه</strong><small>مقایسه پکیج‌های عمومی و تخصصی</small></span>
      <ChevronLeft size={20} className="action-chevron" />
    </Link>}

    <button type="button" className="category-action urgent-action" dir="ltr" onClick={() => setAuthOpen(true)}>
      <span className="category-action-icon urgent-icon"><Zap size={22} /></span>
      <span className="category-action-copy" dir="rtl"><strong>ثبت درخواست فوری</strong><small>{category.urgentLabel}</small></span>
      <ChevronLeft size={20} className="action-chevron" />
    </button>
    <a href="tel:41124" className="category-action support-action" dir="ltr">
      <span className="category-action-icon"><Headset size={22} /></span>
      <span className="category-action-copy" dir="rtl"><strong>سوالی دارید؟</strong><small>با مشاوران مایکا صحبت کنید</small></span>
      <ChevronLeft size={20} className="action-chevron" />
    </a>
    {authOpen && <AuthGateModal onClose={() => setAuthOpen(false)} />}
  </AppShell>;
}
