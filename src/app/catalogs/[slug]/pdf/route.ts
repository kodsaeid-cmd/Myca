import { catalogData } from "@/lib/catalog-data";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!catalogData[slug]) return new Response("Not found", { status: 404 });
  return Response.redirect("https://mycaapp.com/catalogs/" + slug + "/pdf", 302);
}