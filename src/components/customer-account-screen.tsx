import Link from "next/link";
import { ArrowRight, ClipboardList, PhoneCall, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import styles from "./request-flow.module.css";

export function CustomerAccountScreen() {
  return (
    <AppShell activeNav="profile">
      <div className={styles.container} dir="rtl">
        <Link href="/" className={styles.backLink}><ArrowRight size={16} />بازگشت به خانه</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>MYCA CUSTOMER PROFILE</span>
          <h1>پروفایل مشتری مایکا</h1>
          <p>با ثبت اولین سفارش، پروفایل مشتری شما به‌صورت خودکار در مایکا ایجاد می‌شود.</p>
        </header>
        <section className={styles.summaryCard}>
          <div className={styles.summaryHeader}><UserRound size={20} /><strong>دسترسی امن به سفارش‌ها</strong></div>
          <p className={styles.hint}><ClipboardList size={15} />برای مشاهده وضعیت هر سفارش، کد پیگیری همان سفارش و شماره موبایلی را که هنگام ثبت آن وارد کرده‌اید، استفاده کنید. در این نسخه تاریخچه همه سفارش‌ها صرفاً با شماره موبایل نمایش داده نمی‌شود.</p>
          <Link href="/track" className={styles.primaryButton}>پیگیری سفارش با کد</Link>
        </section>
        <div className={styles.buttonColumn}>
          <Link href="/catalogs" className={styles.secondaryButton}>مشاهده پکیج‌ها</Link>
          <a href="tel:41124" className={styles.secondaryButton}><PhoneCall size={16} />تماس با مایکا · ۴۱۱۲۴</a>
        </div>
      </div>
    </AppShell>
  );
}
