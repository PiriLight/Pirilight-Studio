"use client";
import { usePathname } from "next/navigation";
export function LegacyNotice() {
  const path = usePathname();
  const legacy = [
    "/reference/tasks",
    "/reference/dashboard",
    "/websites",
    "/piricards",
    "/commercial",
    "/businesses",
    "/goals",
    "/maintenance",
    "/renewals",
    "/finance",
    "/materials",
  ].some((p) => path === p || path.startsWith(p + "/"));
  return legacy ? (
    <p
      role="note"
      className="mb-6 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm leading-6"
    >
      Protótipo anterior · dados de demonstração e apontamentos locais. As
      edições nesta vista não são partilhadas com a equipa nem aparecem no novo
      Centro de Organização.
    </p>
  ) : null;
}
