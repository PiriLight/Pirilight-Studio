"use client";

import { PROFILES, useProfileStore } from "@/store/use-profile-store";

/**
 * O título do Dashboard — "Bom dia/Boa tarde/Boa noite, {nome}" — reativo ao
 * perfil ativo (`useProfileStore`, já usado pelo `ProfileSwitcher` na Topbar).
 * Cliente só por causa disto: o resto da página continua Server Component.
 * A hora usa o relógio do próprio browser — o Sny e o Bino usam a app a
 * partir de Portugal, por isso é exatamente a hora que importa aqui.
 */
export function DashboardGreeting() {
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  const name = PROFILES[activeProfileId].name;
  const hour = new Date().getHours();
  const period = hour < 12 ? "Bom dia" : hour < 20 ? "Boa tarde" : "Boa noite";

  return (
    <>
      {period}, {name}
    </>
  );
}
