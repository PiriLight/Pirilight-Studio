"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface BusinessDetailTabDef {
  value: string;
  label: string;
  content: ReactNode;
}

/**
 * Tabs do Business Detail Hub, sincronizadas com `?tab=` na URL — para o
 * separador ativo sobreviver a um refresh e ser partilhável por link.
 *
 * O conteúdo de cada aba já vem pronto do servidor (uma leitura composta em
 * `getBusinessOverview`); isto só decide qual mostrar. A troca em si é
 * imediata (Radix, no cliente) — o `router.replace` só mantém a URL honesta,
 * não bloqueia a troca à espera do servidor.
 */
export function BusinessDetailTabs({
  tabs,
  defaultValue,
}: {
  tabs: BusinessDetailTabDef[];
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Tabs
      defaultValue={defaultValue}
      onValueChange={(value) => {
        const isDefault = value === tabs[0]?.value;
        router.replace(isDefault ? pathname : `${pathname}?tab=${value}`, { scroll: false });
      }}
    >
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-muted p-1">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="pt-4 focus-visible:outline-none">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
