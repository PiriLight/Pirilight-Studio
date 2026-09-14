# Ativação de produção — `app.pirilight.pt`

Este documento separa o que já está no código do que exige uma ação administrativa.
Não contém chaves, IDs de utilizadores ou valores DNS inventados.

## 1. Supabase

### Escolher o projeto

Usar um projeto dedicado chamado, por exemplo, `PiriLight Studio`, na região europeia
pretendida. Não reutilizar o projeto inativo `PiriLight` sem confirmar primeiro que
ele não pertence ao site público ou a outra aplicação.

### Aplicar a migração

Depois de ligar o CLI ao projeto correto, aplicar a migração existente em
`supabase/migrations/20260904113505_create_app_users_allowlist.sql`.

Confirmar depois:

- a tabela `public.app_users` existe;
- RLS está ativo;
- `anon` não tem privilégios;
- `authenticated` tem apenas `SELECT`;
- a policy limita a leitura ao próprio `auth.uid()`, exige `is_active = true` e recusa utilizadores anónimos.

### Configuração Auth no dashboard

- Site URL: `https://app.pirilight.pt`
- Redirect URL de produção: `https://app.pirilight.pt/auth/callback`
- Redirect URL local: `http://localhost:3000/auth/callback`
- Email/password: ativo
- Sign-ups: desativados
- Anonymous sign-ins: desativados
- Comprimento mínimo da palavra-passe: 12
- Requisitos: minúsculas, maiúsculas, números e símbolos
- Proteção de palavras-passe comprometidas: ativar, se disponível no plano
- SMTP: configurar um remetente do domínio antes do go-live

Em previews, adicionar apenas o URL exato da preview que for realmente usada. Não
adicionar wildcards amplos sem necessidade.

### Criar utilizadores autorizados

1. Em Authentication > Users, criar ou convidar cada utilizador interno.
2. Confirmar o email e copiar o UUID atribuído pelo Supabase.
3. Inserir a autorização no SQL Editor, substituindo os placeholders:

```sql
insert into public.app_users (user_id, display_name, role)
values
  ('<UUID_DO_UTILIZADOR>', '<NOME>', 'owner');
```

Para retirar acesso sem apagar a conta:

```sql
update public.app_users
set is_active = false, updated_at = now()
where user_id = '<UUID_DO_UTILIZADOR>';
```

Não usar emails em RLS e não guardar autorização em `user_metadata`.

## 2. Variáveis de ambiente

Configurar no projeto Vercel em Production e, quando necessário, Preview/Development:

| Variável | Produção | Sensibilidade |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL API do projeto escolhido | Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave `sb_publishable_...` ativa | Pública, protegida por RLS |
| `NEXT_PUBLIC_SITE_URL` | `https://app.pirilight.pt` | Pública |

Não adicionar `service_role`, `sb_secret_...`, password da base de dados ou token
de gestão ao frontend. Esta implementação não precisa deles.

Depois de alterar uma variável `NEXT_PUBLIC_*`, criar um novo deployment: o Next.js
incorpora estes valores no build.

## 3. Git e Vercel

1. Rever esta branch e integrá-la em `main` por Pull Request.
2. Criar um projeto Vercel separado para o Command Center; não usar os projetos
   existentes `pirilight` ou `piricard`.
3. Ligar o repositório `pirigfamilia/Pirilight-Studio` e definir `main` como branch de produção.
4. Framework preset: Next.js. Build: `pnpm build`. Install: `pnpm install --frozen-lockfile`.
5. Definir Node.js 22 ou superior.
6. Adicionar as três variáveis e fazer uma preview.
7. Testar a preview antes de promover para produção.

## 4. Domínio e DNS

Só depois de o projeto Vercel existir e a preview passar:

1. Adicionar `app.pirilight.pt` em Project Settings > Domains.
2. Abrir os detalhes do domínio e copiar exatamente os registos apresentados pela Vercel.
3. Criar esses registos no fornecedor DNS de `pirilight.pt`.
4. Voltar à Vercel, verificar o domínio e aguardar o certificado SSL.

Tabela a preencher apenas com a resposta real da Vercel:

| Tipo | Nome/Host | Valor/Target | Estado |
|---|---|---|---|
| PENDENTE | PENDENTE | PENDENTE — fornecido pela Vercel | não solicitado ainda |

Não criar um A, CNAME ou TXT genérico com base em exemplos da documentação. A
Vercel pode devolver valores específicos para atribuição ou verificação de domínio.

## 5. Teste de aceitação

- visitante sem sessão em `/`, `/finance` e uma rota dinâmica é enviado para `/login`;
- o parâmetro `next` regressa apenas a uma rota interna válida;
- credenciais inválidas não criam sessão;
- conta Supabase válida sem linha ativa em `app_users` é recusada;
- conta autorizada entra e mantém sessão após refresh;
- logout bloqueia imediatamente as rotas privadas;
- recuperação não revela se o email existe;
- link de recuperação abre `/reset-password`, altera a password e termina sessões;
- todas as rotas existentes continuam com o mesmo conteúdo e estado local;
- headers/cookies de autenticação não são guardados em cache;
- não existem secrets no bundle do browser, Git, logs ou ficheiros `.env` versionados;
- `pnpm lint`, `pnpm test`, TypeScript e `pnpm build` passam;
- `https://app.pirilight.pt` tem HTTPS válido e o fluxo completo funciona em produção.
