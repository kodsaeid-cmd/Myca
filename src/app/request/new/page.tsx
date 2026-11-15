import { ServiceRequestFlow } from "@/components/service-request-flow";

type SearchParams = Promise<{ category?: string; service?: string; shift?: string; urgent?: string }>;

export default async function NewRequestPage({ searchParams }: { searchParams: SearchParams }) {
  const initial = await searchParams;
  return <ServiceRequestFlow initial={initial} />;
}
