import { OperationsPage } from "@/components/operations/page";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <OperationsPage mode="tasks" id={(await params).id} />; }
