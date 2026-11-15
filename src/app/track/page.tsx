import { OrderTrackingScreen } from "@/components/order-tracking-screen";

type SearchParams = Promise<{ reference?: string }>;

export default async function TrackPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  return <OrderTrackingScreen initialReference={query.reference ?? ""} />;
}
