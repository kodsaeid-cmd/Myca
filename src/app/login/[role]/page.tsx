import { notFound } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { roleTitles } from "@/lib/catalog-data";

export default async function RoleLoginPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!roleTitles[role]) notFound();
  return <LoginScreen role={role} />;
}
export function generateStaticParams() { return Object.keys(roleTitles).map((role) => ({ role })); }