import { OperationsPage } from "@/components/operations/page";
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <OperationsPage mode="clients" searchParams={searchParams} />; }
