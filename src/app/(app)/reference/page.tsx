import Link from "next/link";
export default function Page() {
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Estrutura anterior</h1>
      <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
        Estas vistas pertencem ao protótipo anterior. Contêm exemplos e
        alterações guardadas apenas neste navegador. Foram preservadas para
        consulta; não são a base partilhada da equipa e não alimentam o novo
        Centro.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Tarefas locais", "/reference/tasks"],
          ["Dashboard anterior", "/reference/dashboard"],
          ["Websites", "/websites"],
          ["PiriCards", "/piricards"],
          ["Comercial", "/commercial"],
          ["Objetivos", "/goals"],
          ["Manutenção", "/maintenance"],
          ["Renovações", "/renewals"],
          ["Finanças", "/finance"],
          ["Materiais", "/materials"],
        ].map(([label, href]) => (
          <Link
            className="rounded-lg border bg-card p-4 text-sm hover:bg-accent"
            key={href}
            href={href!}
          >
            {label} · protótipo →
          </Link>
        ))}
      </div>
    </section>
  );
}
