import { Card } from "@/components/ui/card";
import type { Website } from "@/types";

/**
 * "Informação técnica" do Website Detail — só os campos que o schema já tem
 * (`domain`, `hostingProvider`, `cmsType`, `stagingUrl`). Nada inventado.
 */
export function WebsiteTechnicalInfo({ website }: { website: Website }) {
  const fields = [
    { label: "Domínio", value: website.domain },
    { label: "Alojamento", value: website.hostingProvider },
    { label: "CMS", value: website.cmsType },
    { label: "Staging", value: website.stagingUrl ?? "—" },
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
