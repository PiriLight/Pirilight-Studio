# Acessos dos owners — preparação local

Estado em 14 de setembro de 2026: contas e autorizações existentes confirmadas
no dashboard Supabase; CNAME de envio criado na Domínios.pt com autorização do utilizador.

| Pessoa | E-mail indicado | Papel confirmado |
|---|---|---|
| Sny | afonsosantoscs@gmail.com | owner |
| Bino | lachefbino@gmail.com | owner |

Não contém palavras-passe. Cada pessoa deve definir a sua própria palavra-passe
através do fluxo de autenticação. Estes endereços não são uma regra de autorização
no frontend: o acesso continua a depender do UUID de Auth em `public.app_users`.

## O que foi confirmado nesta pasta

- Existe Supabase Auth no código, com login, callback e recuperação de palavra-passe.
- Existem duas migrações para `app_users`; devem ser revistas em conjunto com o
  estado remoto antes de aplicar alguma que ainda falte.
- As contas precisam de uma linha ativa em `app_users` para entrar.
- A ligação Supabase disponível devolveu uma lista vazia de projetos. Isto não
  refletia o projeto do utilizador: a ligação aponta para a organização `Pirilight`,
  enquanto o projeto indicado está em `pirigfamilia's Org`.
- O navegador autenticado permitiu confirmar o projeto `PiriLight Studio`,
  referência `puipgxpnqkcoyyxgmquq`, com estado Healthy.
- Os dois endereços já existem em Auth. Os UUIDs correspondem a duas linhas em
  `app_users`, Sny e Bino, ambas com `role = owner` e `is_active = true`.
- SMTP próprio desativado. Site URL: `http://localhost:3000`. Lista de Redirect URLs vazia.
- Email/password ativo, confirmação de e-mail ativa e autenticação anónima desativada.
  `Allow new users to sign up` está ativo: propor desativação para este Studio privado.
  A allowlist existente continua a ser necessária para entrar na aplicação.
- Não existe configuração local `.env.local` nesta cópia.
- A pasta de trabalho não contém `.git` e inclui outra cópia em `Pirilight-Studio-main/`.
  As alterações desta tarefa estão na raiz `E:\PiriLight-Studio-main`.
- Os módulos operacionais desta cópia usam mocks e stores locais. Ativar login
  não transforma esses dados numa base de dados partilhada entre os dois owners.

## Próximo passo administrativo

O utilizador confirmou que o Studio será alojado num subdomínio de `pirilight.pt`,
na Vercel. `app.pirilight.pt` continua a proposta da documentação existente, sem
publicação ou DNS verificados nesta tarefa. Identificar o serviço SMTP existente
ou escolher um antes de configurar envio. Verificar os logs para apurar a causa
dos envios anteriores; o SMTP padrão e os URLs atuais são limitações confirmadas,
mas não constituem, por si só, uma prova da causa de cada falha passada.

### Resend e DNS — inspeção posterior

O utilizador indicou uma conta Resend. No navegador foi confirmado que já existe
o domínio `pirilight.pt`, criado em 27 de agosto, região Irlanda, com estado
`Partially Failed`. Não criar um segundo domínio para resolver esta configuração.

Valores exibidos no Resend:

| Tipo | Nome | Destino | Estado no Resend |
|---|---|---|---|
| TXT | resend._domainkey | chave pública DKIM existente, não alterar | Verified |
| CNAME | rsend | rsend-euw1.forge.rmta.net | Verified |
| CNAME | send | send.forge.rmta.net | Failed |

Uma consulta DNS nesta tarefa confirmou NXDOMAIN para `send.pirilight.pt`.
Os NS de `pirilight.pt` são `dns1.host-redirect.com` até `dns4.host-redirect.com`.
O site estar alojado na Vercel não significa que a zona DNS esteja na Vercel.
O fornecedor confirmado pelo utilizador é Domínios.pt. A zona DNS foi inspecionada
no painel autenticado: o registo `send` não existia.

Após autorização explícita, o CNAME `send.pirilight.pt` → `send.forge.rmta.net`
foi criado com TTL de 1 hora. O painel confirmou `RECORD HAS BEEN ADDED!`, passou
de 9 para 10 registos e mostrou a nova linha (ID 11149314). Uma tentativa anterior
não tinha confirmação devido a expiração da sessão; verificou-se ausência antes
de repetir. Nenhum registo existente foi editado ou removido.

A verificação no Resend foi reiniciada; o último estado observado foi Pending.
SMTP foi apenas preparado no formulário, ainda não guardado. Falta configurar
a credencial diretamente entre Resend e Supabase. Um formulário de nova chave
está preparado com nome `PiriLight Studio Auth`, Sending access e domínio
`pirilight.pt`, ainda sem criar a chave.

Proposta concreta para revisão: criar apenas o CNAME `send` com destino
`send.forge.rmta.net` (TTL automático ou padrão do fornecedor), após verificar
no painel que não existe um registo conflituoso nesse nome. Depois, repetir
a verificação no Resend. Não alterar MX da raiz, nameservers ou registos do site.

Depois do domínio verificado, preparar SMTP no Supabase: host `smtp.resend.com`,
porta `465`, utilizador `resend`, nome de remetente `PiriLight Studio` e endereço
proposto `acesso@pirilight.pt`. A credencial será configurada diretamente entre
os serviços pelo utilizador, sem ser enviada nesta conversa ou guardada no código.
Não foi criada qualquer API key nesta tarefa.

Fonte técnica: https://resend.com/docs/send-with-supabase-smtp

O objetivo é permitir acesso apenas aos dois owners, sem registo público.
Se existirem outros utilizadores autorizados, apresentar a lista para revisão;
não apagar contas nem retirar acessos automaticamente.

## Verificação dos e-mails

O SMTP padrão do Supabase só envia para endereços da equipa do projeto e tem
limites de envio. A conta existir em Authentication > Users não significa que
o endereço esteja autorizado pelo SMTP padrão. Para utilização real, configurar
SMTP próprio, verificar o domínio remetente e testar a entrega no Gmail.

Fonte: https://supabase.com/docs/guides/auth/auth-smtp

Não assumir que esta é a causa neste projeto sem verificar configuração e logs.
A resposta genérica do formulário de recuperação evita revelar se uma conta
existe, mas também não é prova de que um e-mail foi enviado ou entregue.

## Aceitação necessária para declarar os acessos funcionais

- Sny e Bino existem em Auth e têm autorização ativa de owner.
- Registo público desativado; uma conta sem autorização não entra.
- Cada owner consegue entrar, atualizar a página e terminar sessão.
- O e-mail de recuperação chega ao Gmail de cada owner.
- O link regressa ao domínio correto, abre a definição de palavra-passe e
  permite entrar com a nova palavra-passe.
- Um link expirado ou reutilizado apresenta uma saída clara para nova recuperação.
- Dados partilhados: implementação e validação próprias, ainda pendentes.

As regras do projeto exigem inspeção, relatório, revisão e autorização explícita
antes de operações remotas críticas. Nenhuma conta, configuração de SMTP,
migração remota ou publicação foi alterada nesta preparação.

## Alterações locais e validação

- Layout de acesso adaptado a desktop e mobile, preservando os tokens e emblema.
- Recuperação com orientação para verificar Spam e usar o link mais recente.
- Lint dos componentes afetados: passou.
- Testes existentes: 328 passaram em 16 ficheiros.
- Build de produção e TypeScript: passaram.
- Login desktop e recuperação mobile (390 px) renderizados no navegador, sem
  overflow horizontal ou overlay de erro; navegação login → recuperação confirmada.
- Capturas: `auth-desktop.png` e `auth-mobile.png` na raiz da pasta.
- Teste real de credenciais, entrega de e-mails e recuperação completa: pendente.
