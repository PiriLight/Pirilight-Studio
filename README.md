# PiriLight Studio

Ferramenta interna da PiriLight, com acesso autorizado por Supabase Auth.

**Acesso online:** https://app.pirilight.pt — publicado na Vercel em 14/09/2026.
[Checkpoint de publicação e manutenção](docs/DEPLOYMENT_CHECKPOINT.md).

## Centro de Organização

Esta iteração prepara clientes, projetos e tarefas ligados, pesquisa, captura rápida,
atenção por regras explícitas e persistência Supabase. O histórico anterior permanece
em **Estrutura anterior**, identificado como protótipo com dados mock/locais.

**Base operacional ativada em 14/09/2026**, após autorização explícita, no projeto
Supabase `puipgxpnqkcoyyxgmquq`. Esta instalação local tem
`PIRILIGHT_OPERATIONS_ENABLED=true`. Instalações novas continuam desligadas por
omissão. Os exemplos anteriores não foram importados como dados reais.

- [Auditoria, modelo, testes e plano de ativação](docs/ORGANIZATION_REVIEW.md)
- [Migration local para revisão](supabase/migrations/20260914141357_organization_core.sql)
- [Capturas de laboratório](docs/organization-captures/)
- [Configuração de autenticação](docs/PRODUCTION_SETUP.md)

Login, recuperação de palavra-passe, cookies e allowlist existentes foram preservados.
O cabeçalho mostra a identidade da sessão autorizada; já não simula a troca de owner.

## Desenvolvimento

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev --port 3100
pnpm.cmd build
pnpm.cmd lint
pnpm.cmd exec tsc --noEmit
pnpm.cmd test
# Docker: container descartável, sem portas expostas e sem rede.
pwsh -File tests/operations/run-database-tests.ps1
```

Cria `.env.local` a partir de `.env.example`. Nunca coloques secrets ou `service_role`
em variáveis `NEXT_PUBLIC_*`. Não executar migrations remotas nem deploys como parte
destes testes.

A raiz é um repositório Git local, criado para preservar esta cópia antes da iteração.
A cópia aninhada `Pirilight-Studio-main/` foi mantida e excluída dos checks da raiz.
