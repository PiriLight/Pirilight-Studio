import { derivePaymentProgressView } from "@/lib/utils/payment";
import { formatEuros } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { PaymentSummary } from "@/types";

/**
 * Barra de progresso simples (recebido vs. total) — substitui qualquer
 * necessidade de gráfico para acompanhar pagamentos (decisão do plano,
 * secção 1). Usada no Business Detail Hub e na lista de Clientes.
 *
 * Round 5.1: a decisão de mostrar "Sem pagamentos associados" já não usa
 * `totalValue === 0` (um Payment real pode ter um total de 0€) — vem de
 * `derivePaymentProgressView`, que olha para `summary.hasPayments`.
 */
export function PaymentProgress({
  summary,
  compact = false,
}: {
  summary: PaymentSummary;
  compact?: boolean;
}) {
  const { amountReceived, totalValue, remainingValue, hasOverdue } = summary;
  const view = derivePaymentProgressView(summary);

  if (!view.hasPayments) {
    return <p className="text-xs text-muted-foreground">Sem pagamentos associados</p>;
  }

  const barColor = view.isPaid ? "bg-success" : hasOverdue ? "bg-primary" : "bg-info";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${view.percent}%` }} />
      </div>
      <div
        className={cn(
          "flex items-baseline justify-between text-xs",
          compact ? "text-muted-foreground" : "",
        )}
      >
        <span className={compact ? "" : "text-foreground"}>
          {formatEuros(amountReceived)} de {formatEuros(totalValue)}
        </span>
        {!view.isPaid && (
          <span className={hasOverdue ? "font-medium text-primary" : "text-muted-foreground"}>
            Em falta {formatEuros(remainingValue)}
          </span>
        )}
        {view.isPaid && <span className="font-medium text-success">Pago</span>}
      </div>
    </div>
  );
}
