import ShopPageClient from "./ShopPageClient";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawStatus = searchParams.status;
  const status =
    typeof rawStatus === "string"
      ? rawStatus
      : Array.isArray(rawStatus)
      ? rawStatus[0]
      : null;

  return <ShopPageClient status={status} />;
}
