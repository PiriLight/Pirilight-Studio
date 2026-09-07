import { Skeleton } from "@/components/ui/skeleton";

export default function GoalsLoading() {
  return <div className="space-y-6" aria-label="A carregar objetivos"><div className="space-y-2"><Skeleton className="h-8 w-44" /><Skeleton className="h-4 w-80 max-w-full" /></div><Skeleton className="h-20 w-full" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-56" /><Skeleton className="h-56" /><Skeleton className="h-56" /></div></div>;
}
