import { notFound } from "next/navigation";
import { CatalogDetailScreen } from "@/components/catalogs-screen";
import { PricingCatalogScreen } from "@/components/pricing-catalog-screen";
import { catalogData } from "@/lib/catalog-data";
import { pricingCatalogs } from "@/lib/pricing-data";

export default async function CatalogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (pricingCatalogs[slug]) return <PricingCatalogScreen catalog={pricingCatalogs[slug]} />;
  if (!catalogData[slug]) notFound();
  return <CatalogDetailScreen slug={slug} />;
}

export function generateStaticParams() {
  return [...new Set([...Object.keys(catalogData), ...Object.keys(pricingCatalogs)])].map((slug) => ({ slug }));
}
