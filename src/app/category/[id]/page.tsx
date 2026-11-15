import { notFound } from "next/navigation";
import { CategoryScreen } from "@/components/category-screen";
import { categories } from "@/lib/myca-data";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = categories[id];
  if (!category) notFound();
  return <CategoryScreen category={category} />;
}

export function generateStaticParams() {
  return Object.keys(categories).map((id) => ({ id }));
}