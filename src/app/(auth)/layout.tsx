import Image from "next/image";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-chrome-border bg-chrome px-6 py-5 text-chrome-foreground sm:px-10">
        <div className="flex items-center gap-3">
          <Image src="/pirilight-header-icon.png" alt="" width={36} height={36} />
          <span className="text-sm font-semibold tracking-tight">PiriLight Studio</span>
        </div>
        <span className="text-xs text-chrome-muted-foreground">Espaço privado</span>
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-10 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:py-20">
        <section className="hidden lg:block" aria-labelledby="studio-intro">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">O espaço de trabalho da equipa</p>
          <h1 id="studio-intro" className="max-w-md text-5xl font-semibold leading-[1.12] tracking-tight">
            A PiriLight,<br />com tudo no lugar.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground">
            Clientes, projetos e prioridades. Um ponto de partida para organizar o trabalho de cada dia.
          </p>
        </section>
        <div className="min-w-0">{children}</div>
      </div>
      <footer className="px-6 pb-6 text-center text-xs text-muted-foreground">
        PiriLight Studio · Gestão interna
      </footer>
    </main>
  );
}
