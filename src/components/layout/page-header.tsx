import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Normalmente uma string; `ReactNode` (Round 7) só para o Dashboard, cujo título é reativo ao perfil ativo. */
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  tabs?: ReactNode;
}

/**
 * Cabeçalho consistente para todas as páginas: PageHeader → (KPIs opcionais)
 * → corpo. Nenhuma página escreve o seu próprio título "à mão".
 */
export function PageHeader({ title, description, action, tabs }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {tabs}
    </div>
  );
}
