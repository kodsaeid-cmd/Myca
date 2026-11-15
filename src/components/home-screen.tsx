"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ClipboardList, Headset, Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { homeSearchSuggestions, homeServiceCards } from "@/lib/myca-data";

export function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const normalizedQuery = query.trim().replace(/\s+/g, "");

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    if (normalizedQuery.includes("سالمند")) return homeSearchSuggestions;
    const all = [
      ...homeSearchSuggestions,
      { title: "پرستار نوزاد", subtitle: "مراقبت از نوزاد تا دو سالگی", icon: "mother-child.svg", href: "/category/27", group: "sub" },
      { title: "مادریار", subtitle: "مراقبت از مادر", icon: "mother-child.svg", href: "/category/12", group: "sub" },
      { title: "نظافت منزل", subtitle: "خدمات و امور منزل", icon: "cleaning-spray.svg", href: "/category/14", group: "sub" },
      { title: "کمک‌بهیار", subtitle: "پرستاری و مراقبت بیمار", icon: "certified-nurse.svg", href: "/category/13", group: "sub" }
    ];
    return all.filter((item) => item.title.replace(/\s+/g, "").includes(normalizedQuery) || item.subtitle.replace(/\s+/g, "").includes(normalizedQuery));
  }, [normalizedQuery]);

  const subcategories = suggestions.filter((item) => item.group === "sub");
  const shifts = suggestions.filter((item) => item.group === "shift");

  return <AppShell activeNav="home">
    <section className="home-hero">
      <Image src="https://mycaapp.com/customer-home/myca-hero-elderly-care-hijab.png" alt="مراقبت بهتر" fill priority unoptimized sizes="448px" className="hero-image" />
      <div className="hero-scrim" />
      <div className="hero-copy"><h1>مراقبت مطمئن<br />در خانه</h1><p>انتخاب سریع و شفاف برای خانواده شما</p></div>
    </section>

    <div className="home-search-wrap">
      <label className="home-search" dir="ltr">
        <Search size={20} className="search-icon" />
        <input dir="rtl" value={query} onFocus={() => setSearchFocused(true)} onChange={(event) => setQuery(event.target.value)} placeholder="چه خدمتی نیاز دارید؟" aria-label="جستجوی خدمات" />
        {query && <button type="button" className="clear-search" onClick={() => setQuery("")} aria-label="پاک کردن جستجو"><X size={17} /></button>}
      </label>
      {searchFocused && query.trim() && <div className="search-results">
        {subcategories.length > 0 && <section><h3>زیردسته‌ها</h3>{subcategories.map((item) => <button type="button" className="suggestion-row" key={item.title} onClick={() => { setSearchFocused(false); router.push(item.href); }}>
          <span className="suggestion-icon"><Image src={"https://mycaapp.com/myca-icons/" + item.icon} alt="" width={34} height={34} unoptimized /></span>
          <span className="suggestion-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span><ChevronLeft size={17} />
        </button>)}</section>}
        {shifts.length > 0 && <section><h3>شیفت‌ها</h3>{shifts.map((item) => <button type="button" className="suggestion-row compact" key={item.title} onClick={() => { setSearchFocused(false); router.push(item.href); }}>
          <span className="suggestion-icon"><Image src={"https://mycaapp.com/myca-icons/" + item.icon} alt="" width={30} height={30} unoptimized /></span>
          <span className="suggestion-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span><ChevronLeft size={17} />
        </button>)}</section>}
        {suggestions.length === 0 && <p className="no-results">خدمتی با این عبارت پیدا نشد.</p>}
      </div>}
      {searchFocused && <button className="search-dismiss" aria-label="بستن نتایج جستجو" type="button" onClick={() => setSearchFocused(false)} />}
    </div>

    <section className="home-services">
      <h2>خدمات اصلی</h2>
      <div className="service-grid">{homeServiceCards.map((service) => <Link href={service.href} key={service.title} className="home-service-card">
        <span className="home-service-icon"><Image src={"https://mycaapp.com/myca-icons/" + service.icon} alt="" width={46} height={46} unoptimized /></span>
        <span>{service.title}</span>
      </Link>)}</div>
    </section>

    <a href="tel:41124" className="home-action-card" dir="ltr">
      <span className="action-pill"><ChevronLeft size={16} />مشاوره با مایکا</span>
      <span className="action-copy" dir="rtl"><strong>نمی‌دانید کدام خدمت مناسب است؟</strong><small>با مشاوران مایکا صحبت کنید.</small></span>
      <span className="action-icon"><Headset size={22} /></span>
    </a>

    <Link href="/login/receiver?next=/receiver/requests" className="home-action-card request-card" dir="ltr">
      <span className="action-pill"><ChevronLeft size={16} />مشاهده</span>
      <span className="action-copy" dir="rtl"><strong>درخواست‌های من</strong><small>پیگیری، جزئیات و وضعیت درخواست‌های شما</small></span>
      <span className="action-icon"><ClipboardList size={21} /></span>
    </Link>
  </AppShell>;
}
