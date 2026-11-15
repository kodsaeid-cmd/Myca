import { notFound } from "next/navigation";
import { CatalogPdfRedirect } from "@/components/catalog-pdf-redirect";
import { catalogData } from "@/lib/catalog-data";

export default async function CatalogPdfPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!catalogData[slug]) notFound();
  return <CatalogPdfRedirect slug={slug} />;
}

export function generateStaticParams() {
  return Object.keys(catalogData).map((slug) => ({ slug }));
}
