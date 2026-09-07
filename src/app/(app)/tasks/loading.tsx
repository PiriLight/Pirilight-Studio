import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return <div className="space-y-6" aria-label="A carregar tarefas"><div className="space-y-2"><Skeleton className="h-8 w-36" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-28 w-full" /><div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>;
}
