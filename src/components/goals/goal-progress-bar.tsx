import { cn } from "@/lib/utils";

/**
 * Barra simples + percentagem — mesmo padrão do `PaymentProgress` (sem
 * biblioteca de gráficos, plano secção 1). Reaproveitada na lista, no card
 * mobile, no detalhe e na pré-visualização do formulário.
 */
export function GoalProgressBar({ progress, className }: { progress: number; className?: string }) {
  const done = progress >= 100;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", done ? "bg-success" : "bg-primary")}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{progress}%</span>
    </div>
  );
}
