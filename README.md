# PiriLight Studio — Command Center

Aplicação interna e privada de gestão do negócio da **PiriLight Studio** e da **PiriCard**, usada pelo Sny e pelo Bino.

O plano de implementação completo está em [`/root/.claude/plans/i-want-to-build-stateless-wolf.md`](../../root/.claude/plans/i-want-to-build-stateless-wolf.md) (secções 0–15: arquitetura, modelo de dados, navegação, ordem de implementação, etc.).

## Estado atual

Esta ronda entrega apenas a fundação visual, sem dados nem lógica de negócio:

- Next.js 16 (App Router) + TypeScript (`strict` + `noUncheckedIndexedAccess`) + Tailwind CSS v3.4
- Identidade visual real da PiriLight (dark-first), com light mode via `next-themes`
- shadcn/ui — primitivos essenciais (Button, Card, Badge, Tabs, Sheet, Skeleton, Tooltip, DropdownMenu, ScrollArea, Avatar, EmptyState)
- `AppShell` (Sidebar + Topbar, "chrome" sempre escuro, brand-first) + navegação mobile (Sheet)
- As 11 rotas estruturais (Dashboard, Tarefas, Comercial, Clientes, Websites, PiriCards, Renovações, Goals, Maintenance, Finance, Materials), com o Dashboard a reproduzir visualmente a estrutura final e as restantes como placeholders
- Interface em Português de Portugal, responsivo (desktop + mobile)

A aplicação inclui agora os módulos operacionais entregues até ao Round 9 e uma
camada de acesso privado preparada para Supabase Auth:

- login por email e palavra-passe;
- sessão SSR persistente em cookies;
- allowlist `app_users` separada de `auth.users`;
- proteção de todas as rotas do Command Center no Proxy e no layout server-side;
- logout e recuperação/reset de palavra-passe;
- sem registo público e sem qualquer `service_role` no frontend.

Com `PIRILIGHT_OPERATIONAL_DATA_SOURCE=supabase`, Comercial, Clientes e Contactos
usam exclusivamente as tabelas Supabase e Server Actions protegidas por RLS. Sem
essa ativação, essas áreas mantêm o modo de demonstração; não existe dual-write.
Tasks, Goals e os restantes módulos com Zustand continuam em mock/localStorage.

O inventário e o processo seguro para rever os dados de demonstração antes de uma
importação real estão em [`docs/CRM_DATA_MIGRATION.md`](docs/CRM_DATA_MIGRATION.md).

Consulta [`docs/AUTH_AUDIT.md`](docs/AUTH_AUDIT.md) para o diagnóstico e
[`docs/PRODUCTION_SETUP.md`](docs/PRODUCTION_SETUP.md) para o checklist de ativação.

## Desenvolvimento

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # build de produção
pnpm lint     # eslint
pnpm test     # testes unitários
```

Cria `.env.local` a partir de `.env.example`. Nunca coloques uma secret key ou
`service_role` numa variável `NEXT_PUBLIC_*`.
