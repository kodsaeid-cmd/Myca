import Link from "next/link";
import { ArrowRight, BookOpen, ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { catalogCards, catalogData } from "@/lib/catalog-data";

export function CatalogsScreen() {
  return <AppShell>
    <div className="catalog-back"><Link href="/"><ArrowRight size={16} />بازگشت</Link></div>
    <h1 className="catalog-page-title">کاتالوگ‌های خدمات مایکا</h1>
    <p className="catalog-page-intro">یک کاتالوگ را انتخاب کنید تا نسخهٔ وب آن را ببینید.</p>
    <div className="catalog-card-list">{catalogCards.map((catalog) => <Link href={"/catalogs/" + catalog.slug} key={catalog.slug} className="catalog-card">
      <span className="catalog-icon"><BookOpen size={22} /></span>
      <span className="catalog-copy"><strong>{catalog.title}</strong><small>{catalog.description}</small><em>{catalog.pages}</em></span>
      <ChevronLeft size={18} />
    </Link>)}</div>
  </AppShell>;
}

export function CatalogDetailScreen({ slug }: { slug: string }) {
  const catalog = catalogData[slug];
  if (!catalog) return null;
  return <AppShell>
    <div className="catalog-back"><Link href="/catalogs"><ArrowRight size={16} />بازگشت</Link><a href={"/catalogs/" + slug + "/pdf"}>دانلود PDF</a></div>
    <h1 className="catalog-page-title">{catalog.title}</h1>
    <p className="catalog-page-intro">{catalog.description}</p>
    <div className="catalog-pages">{catalog.pages.map((page) => <figure className="catalog-page-preview" key={page.image}>
      <figcaption>{page.title}</figcaption><img src={page.image} alt={page.title} loading="lazy" />
    </figure>)}</div>
    <p className="catalog-footer">۰۲۱۴۱۱۲۴ · MYCA MyCare</p>
  </AppShell>;
}