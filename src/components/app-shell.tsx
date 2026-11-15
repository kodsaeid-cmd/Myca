"use client";

import type { ComponentType, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Activity, Bell, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ClipboardList,
  FileText, Heart, HeartHandshake, History, House, MapPin, Menu, MessageCircle, Phone, Star,
  Ticket, UserRound, Users, X, LocateFixed, Search, Building2
} from "lucide-react";
import { menuItems } from "@/lib/myca-data";

const iconMap: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  phone: Phone, heart: Heart, activity: Activity, building: Building2, file: FileText,
  history: History, star: Star, calendar: CalendarDays, message: MessageCircle,
  ticket: Ticket, user: UserRound, users: Users, book: BookOpen
};

export function AppShell({ children, activeNav = "home" }: { children: ReactNode; activeNav?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState("انتخاب محل خدمت");

  return (
    <div className="mobile-app-desktop-container">
      <div className="mobile-app-content">
        <div className="app-frame" dir="rtl">
          <header className="app-header">
            <div className="header-side header-menu">
              <button className="icon-button menu-trigger" type="button" aria-label="منو" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
            </div>
            <button className="location-trigger" type="button" onClick={() => setLocationOpen(true)}>
              <MapPin size={16} className="location-pin" /><span>{location}</span><ChevronDown size={14} className="muted-icon" />
            </button>
            <div className="header-side header-brand">
              <Link href="/" className="brand-link" aria-label="صفحه اصلی مایکا"><Image src="https://mycaapp.com/mycalogo.png" alt="مایکا" width={40} height={40} unoptimized /></Link>
              <Link href="/login/receiver" className="icon-button notification-button" aria-label="اعلان‌ها"><Bell size={21} /></Link>
            </div>
          </header>
          <main className="page-main">{children}</main>
          <BottomNavigation active={activeNav} />
          {menuOpen && <MenuDrawer onClose={() => setMenuOpen(false)} />}
          {locationOpen && <LocationDialog currentLocation={location} onClose={() => setLocationOpen(false)} onSave={(next) => { setLocation(next); setLocationOpen(false); }} />}
        </div>
      </div>
    </div>
  );
}

function BottomNavigation({ active }: { active: string }) {
  const items = [
    { key: "home", label: "خانه", href: "/", Icon: House },
    { key: "requests", label: "درخواست‌ها", href: "/requests", Icon: ClipboardList },
    { key: "messages", label: "پیام‌ها", href: "/login/receiver?next=/receiver/notifications", Icon: MessageCircle },
    { key: "services", label: "خدمات من", href: "/services", Icon: HeartHandshake },
    { key: "profile", label: "پروفایل", href: "/login/receiver?next=/receiver/profile", Icon: UserRound }
  ];
  return <nav className="bottom-navigation" aria-label="ناوبری اصلی"><ul>{items.map(({ key, label, href, Icon }) => (
    <li key={key}><Link href={href} className={active === key ? "bottom-nav-link active" : "bottom-nav-link"}><Icon size={21} strokeWidth={1.75} /><span>{label}</span></Link></li>
  ))}</ul></nav>;
}

function MenuDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-root" role="presentation" onMouseDown={onClose}>
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label="منو" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-heading"><strong>منو</strong><button type="button" className="icon-button" onClick={onClose} aria-label="بستن منو"><X size={21} /></button></div>
        <nav className="drawer-list">
          <Link href="tel:41124" className="drawer-item" onClick={onClose}><Phone size={18} /><span>تماس با ما</span><ChevronLeft size={16} /></Link>
          <div className="drawer-section-label">درباره ما</div>
          {menuItems.slice(1).map((item) => {
            const Icon = iconMap[item.icon] || FileText;
            return <Link href={item.href} key={item.label} className="drawer-item" onClick={onClose}><Icon size={18} /><span>{item.label}</span><ChevronLeft size={16} /></Link>;
          })}
        </nav>
        <div className="drawer-footer">مایکا · همراه خانواده</div>
      </aside>
    </div>
  );
}

function LocationDialog({ currentLocation, onClose, onSave }: { currentLocation: string; onClose: () => void; onSave: (location: string) => void }) {
  const [search, setSearch] = useState("");
  const [address, setAddress] = useState(currentLocation);
  const [notice, setNotice] = useState("");
  const showTehranOptions = search.trim().includes("تهران");

  function useCurrentLocation() {
    if (!navigator.geolocation) { setNotice("موقعیت‌یابی در این مرورگر در دسترس نیست."); return; }
    navigator.geolocation.getCurrentPosition(
      () => setNotice("موقعیت فعلی دریافت شد؛ نشانی دقیق را در کادر پایین وارد کنید."),
      () => setNotice("دسترسی به موقعیت مکانی فعال نشد.")
    );
  }

  return (
    <div className="overlay-root location-overlay" role="presentation" onMouseDown={onClose}>
      <section className="location-dialog" role="dialog" aria-modal="true" aria-labelledby="location-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><h2 id="location-title">محل خدمت</h2><p>موقعیت ارائه خدمت را مشخص کنید.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="بستن"><X size={20} /></button></div>
        <label className="field-label" htmlFor="location-search">جستجوی مکان</label>
        <div className="input-with-icon"><Search size={18} /><input id="location-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی مکان" /></div>
        {showTehranOptions && <div className="location-suggestions">
          <button type="button" onClick={() => { setAddress("تهران"); setSearch(""); }}><strong>تهران</strong><span>تهران، بخش مرکزی تهران، شهرستان تهران</span></button>
          <button type="button" onClick={() => { setAddress("استان تهران"); setSearch(""); }}><strong>استان تهران</strong><span>استان تهران، ایران</span></button>
        </div>}
        <button type="button" className="current-location-button" onClick={useCurrentLocation}><LocateFixed size={17} />موقعیت فعلی من</button>
        <div className="map-placeholder"><MapPin size={24} /><span>نقشه در این نسخه فعال نیست؛ نشانی را دستی وارد کنید.</span></div>
        <div className="selected-location"><span>موقعیت انتخاب‌شده</span><strong>{address}</strong></div>
        <label className="field-label" htmlFor="location-address">نشانی محل خدمت</label>
        <input id="location-address" className="text-field" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="مثلاً تهران، شهرک غرب" />
        {notice && <p className="inline-notice">{notice}</p>}
        <div className="dialog-actions"><button type="button" className="primary-button" onClick={() => onSave(address.trim() || currentLocation)}>ذخیره</button><button type="button" className="secondary-button" onClick={onClose}>انصراف</button></div>
      </section>
    </div>
  );
}

export function AuthGateModal({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  return <div className="overlay-root location-overlay" role="presentation" onMouseDown={onClose}>
    <section className="auth-gate-modal" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title" onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="modal-close" aria-label="بستن" onClick={onClose}><X size={19} /></button>
      <div className="auth-gate-mark"><UserRound size={22} /></div>
      <h2 id="auth-gate-title">ادامه فرآیند</h2>
      <p>شماره همراه خود را وارد کنید تا سفارش به‌عنوان خدمت گیرنده ادامه پیدا کند.</p>
      <input className="text-field phone-field" dir="ltr" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" aria-label="شماره همراه" />
      <button type="button" className="primary-button full-button" onClick={() => setMessage(phone.trim() ? "اتصال سرویس پیامک در نسخه بازسازی هنوز فعال نشده است." : "شماره همراه را وارد کنید.")}>دریافت کد تایید</button>
      {message && <p className="inline-notice">{message}</p>}
    </section>
  </div>;
}
