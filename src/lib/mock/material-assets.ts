import type { MaterialAsset } from "@/types";

import type { SeedDates } from "./seed-dates";

export const MATERIAL_IDS = {
  piricardVideo: "mat-piricard-video",
  salesDeck: "mat-apresentacao-comercial",
  onboardingChecklist: "mat-onboarding-checklist",
  brandKit: "mat-brand-kit",
} as const;

/**
 * Phase 1B. O vídeo profissional do PiriCard vive aqui — uma linha em backlog,
 * com `status: 'idea'`. Nada mais: sem player, sem upload, sem planeamento.
 */
export function buildMaterialAssets(d: SeedDates): MaterialAsset[] {
  return [
    {
      id: MATERIAL_IDS.piricardVideo,
      title: "Vídeo profissional de vendas do PiriCard",
      description:
        "Ideia futura: vídeo curto para mostrar o PiriCard em contexto real de loja. Sem prioridade nesta fase.",
      category: "idea_backlog",
      status: "idea",
      productLine: "piricard",
      tags: ["vídeo", "vendas", "ideia"],
      createdAt: d.stamp(-60),
      updatedAt: d.stamp(-60),
    },
    {
      id: MATERIAL_IDS.salesDeck,
      title: "Apresentação comercial PiriLight",
      description: "Deck usado nas primeiras visitas a potenciais clientes.",
      category: "sales_material",
      status: "published",
      productLine: "both",
      tags: ["comercial", "apresentação"],
      createdAt: d.stamp(-200),
      updatedAt: d.stamp(-30),
    },
    {
      id: MATERIAL_IDS.onboardingChecklist,
      title: "Checklist de arranque de projeto",
      description: "O que pedir ao cliente antes de começar: conteúdos, fotografias, acessos.",
      category: "onboarding",
      status: "done",
      productLine: "pirilight",
      tags: ["processo", "onboarding"],
      createdAt: d.stamp(-150),
      updatedAt: d.stamp(-90),
    },
    {
      id: MATERIAL_IDS.brandKit,
      title: "Kit de marca PiriLight",
      description: "Logótipo, cores e tipografia oficiais.",
      category: "brand",
      status: "published",
      productLine: "both",
      tags: ["marca"],
      createdAt: d.stamp(-400),
      updatedAt: d.stamp(-120),
    },
  ];
}
