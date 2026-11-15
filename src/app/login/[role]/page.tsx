import { notFound } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { roleTitles } from "@/lib/catalog-data";

type SearchParams = Promise<{ next?: string }>;

export default async function RoleLoginPage({
  params,
  searchParams
}: {
  params: Promise<{ role: string }>;
  searchParams: SearchParams;
}) {
  const [{ role }, query] = await Promise.all([params, searchParams]);
  if (!roleTitles[role]) notFound();
  const next = query.next && query.next.startsWith("/") && !query.next.startsWith("//") && !query.next.includes("\\")
    ? query.next
    : undefined;
  return <LoginScreen role={role} next={next} />;
}

export function generateStaticParams() {
  return Object.keys(roleTitles).map((role) => ({ role }));
}
