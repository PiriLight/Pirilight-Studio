"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Dark-first: o tema escuro é o default e a identidade principal da marca.
 * O light mode existe como alternativa (ver globals.css, classe `.light`),
 * nunca ativado automaticamente pelas preferências do sistema.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark", "light"]}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
