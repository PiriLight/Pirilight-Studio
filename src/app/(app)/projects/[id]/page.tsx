import { OperationsPage } from "@/components/operations/page";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <OperationsPage mode="projects" id={(await params).id} />; }
