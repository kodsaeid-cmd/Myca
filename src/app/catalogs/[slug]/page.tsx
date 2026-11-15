import { notFound } from "next/navigation";
import { CatalogDetailScreen } from "@/components/catalogs-screen";
import { catalogData } from "@/lib/catalog-data";

export default async function CatalogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!catalogData[slug]) notFound();
  return <CatalogDetailScreen slug={slug} />;
}
export function generateStaticParams() { return Object.keys(catalogData).map((slug) => ({ slug })); }