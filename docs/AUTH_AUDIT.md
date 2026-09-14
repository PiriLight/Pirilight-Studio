# Auditoria de autenticação e infraestrutura

Data da auditoria: 4 de setembro de 2026.

## Baseline verificado

- Repositório: `pirigfamilia/Pirilight-Studio` (público no momento da auditoria).
- Branch com a aplicação: `claude/pirilight-studio-plan-47t2k7`, commit inicial da auditoria `918471c`.
- A `main` contém apenas o baseline inicial e ainda não representa a aplicação.
- Stack: Next.js 16.3.4, React 19.2.8, TypeScript strict, Tailwind 3.4 e Zustand.
- Onze áreas internas vivem no route group `src/app/(app)` e partilham um único layout.
- Não existiam Supabase, autenticação, `proxy.ts`, Vercel link nem variáveis de ambiente.
- Os dados atuais são mocks; vários módulos mutáveis são persistidos apenas no `localStorage`.
- O scan dos ficheiros versionados não encontrou `service_role`, secret keys, chaves privadas ou ficheiros `.env`.
- Contactos presentes no mock usam `example.pt` e o bloco telefónico fictício documentado pelo projeto.

## Infraestrutura observada

- A ligação Vercel disponível pertence à equipa `Vexas Studio` (`vexas-stud1o`), plano Hobby.
- Não existia um projeto Vercel para o Command Center; os projetos `piricard` e `pirilight` são aplicações diferentes e não foram alterados.
- A ligação Supabase disponível apresenta dois projetos inativos: `PiriLight` e `pirigfamilia's Project`.
- Nenhum projeto Supabase foi associado automaticamente, porque reutilizar um deles sem confirmação pode afetar outra aplicação.

## Decisão

Supabase Auth é adequado porque o projeto já prevê Supabase, precisa de apenas um
pequeno grupo de utilizadores internos e beneficia de sessões SSR compatíveis com
Vercel. A autorização não depende de `user_metadata` nem de “estar autenticado”:
exige também uma linha ativa na tabela `public.app_users`.

```text
Pedido privado
  -> Next.js Proxy valida/renova o token
  -> layout (app) confirma o utilizador no Auth
  -> RLS permite ler apenas a própria autorização ativa
  -> Command Center
```

O registo público não foi implementado. As contas são criadas por um administrador
no Supabase e só entram depois de serem adicionadas à allowlist.

## Controlo de acesso implementado

- `proxy.ts`: bloqueio inicial de todas as rotas fora do fluxo público de autenticação.
- `src/app/(app)/layout.tsx`: verificação server-side autoritativa antes de renderizar o shell.
- `public.app_users`: allowlist com RLS, `is_active` e papéis `owner`/`member`.
- `authenticated` recebe apenas `SELECT` da própria autorização; não pode autoautorizar-se.
- `anon` não recebe acesso à tabela.
- utilizadores anónimos do Supabase são recusados explicitamente pela policy.
- logout local; reset de palavra-passe termina todas as sessões depois da alteração.
- redirects `next` são limitados a caminhos privados internos para impedir open redirects.
- pedidos de recuperação devolvem resposta indistinguível, evitando enumeração de contas.

## Limites que continuam em aberto

1. Ainda falta escolher/criar e ativar o projeto Supabase de produção.
2. A migração não foi aplicada remotamente e ainda não existem utilizadores autorizados.
3. Ainda falta SMTP de produção para garantir a entrega de emails de recuperação.
4. A app não está ligada a um projeto Vercel e o domínio ainda não foi adicionado.
5. O DNS só pode ser listado depois de a Vercel devolver os valores reais.
6. A branch ainda precisa de PR/revisão/merge para `main` antes de esta ser a fonte de produção.
7. Autenticação protege a interface, mas os dados continuam locais por browser; um backend partilhado é uma fase separada.
8. Antes de introduzir dados reais, o repositório deve ser tornado privado ou os dados devem permanecer estritamente fictícios.
