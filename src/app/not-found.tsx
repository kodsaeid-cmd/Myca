import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return <main className="not-found" dir="rtl">
    <strong>۴۰۴</strong>
    <h1>صفحه مورد نظر پیدا نشد.</h1>
    <Link href="/"><ArrowRight size={16} />بازگشت به صفحه اصلی مایکا</Link>
  </main>;
}