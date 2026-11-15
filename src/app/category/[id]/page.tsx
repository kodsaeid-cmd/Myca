import { notFound } from "next/navigation";
import { CategoryScreen } from "@/components/category-screen";
import { PricingCatalogScreen } from "@/components/pricing-catalog-screen";
import { categories } from "@/lib/myca-data";
import { pricingCatalogs } from "@/lib/pricing-data";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "11" || id === "22") {
    return <PricingCatalogScreen catalog={pricingCatalogs["elders-pricing"]} />;
  }
  if (id === "12" || id === "27") {
    return <PricingCatalogScreen catalog={pricingCatalogs.pedia} />;
  }
  const category = categories[id];
  if (!category) notFound();
  return <CategoryScreen category={category} />;
}

export function generateStaticParams() {
  return Object.keys(categories).map((id) => ({ id }));
}
