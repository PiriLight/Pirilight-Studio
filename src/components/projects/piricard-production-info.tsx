import { Card } from "@/components/ui/card";
import { cardTypeLabel, designStatusLabel, shippingStatusLabel } from "@/lib/constants/labels";
import type { PiriCard } from "@/types";

/**
 * "Produção PiriCard" do PiriCard Detail — só os campos que o schema já tem
 * (`cardType`, `designStatus`, `shippingStatus`, `quantity`). Sem upload de
 * design, QR/NFC ou tracking de transportadora (fora de âmbito, secção 4).
 */
export function PiriCardProductionInfo({ piriCard }: { piriCard: PiriCard }) {
  const fields = [
    { label: "Tipo de cartão", value: cardTypeLabel(piriCard.cardType) },
    { label: "Design", value: designStatusLabel(piriCard.designStatus) },
    { label: "Entrega", value: shippingStatusLabel(piriCard.shippingStatus) },
    { label: "Quantidade", value: String(piriCard.quantity) },
  ];

  return (
    <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
      {fields.map((field) => (
        <div key={field.label} className="flex flex-col gap-0.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</p>
          <p className="truncate text-sm font-medium text-foreground">{field.value}</p>
        </div>
      ))}
    </Card>
  );
}
