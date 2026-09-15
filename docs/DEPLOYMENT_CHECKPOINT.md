# Publicação do PiriLight Studio — 14/09/2026

## Estado atual

Deployment de produção pronto e promovido na conta CLI `vexastudio1`, equipa `vexas-stud1o`, projeto existente `pirilight-studio` (`prj_7lUSznIjDGTbKsytknsT2ctXKBRO`).

- Deployment: `dpl_FytMnUVvcz5G4Bq4KGKQpfqkhhFf`.
- URL: https://pirilight-studio-bdfq6g34j-vexas-stud1o.vercel.app
- Domínio pretendido, já associado ao projeto: https://app.pirilight.pt
- CNAME gravado na Dominios.pt (registo `11151418`), após retomar a sessão no Chrome. Vercel confirmou `configured_correctly` e resolução pública 1.1.1.1 confirmou o destino. Certificado HTTPS emitido e validado, sem ignorar erros TLS. Alias do domínio final aponta explicitamente para esta deployment.

## Configuração aplicada

Produção usa o Supabase `puipgxpnqkcoyyxgmquq`, a chave pública existente, `NEXT_PUBLIC_SITE_URL=https://app.pirilight.pt` e `PIRILIGHT_OPERATIONS_ENABLED=true`.

Supabase Site URL atualizado para `https://app.pirilight.pt`. Callback exato `https://app.pirilight.pt/auth/callback?next=/reset-password` adicionado; callback local anterior preservado. Não foram criadas contas ou alteradas palavras-passe.

CNAME recomendado pela Vercel, sem conflitos detetados: `app` → `db5b00b53c6b7132.vercel-dns-017.com.`. Restantes registos DNS devem permanecer iguais.

## Validação

Build local e build Vercel passaram. No domínio final, `/login` respondeu 200 por HTTPS; `/projects` sem sessão respondeu 307 para `/login`. O utilizador entrou no Chrome e confirmou-se a sessão de Sny em `https://app.pirilight.pt/`, com Centro ativo e Sny/Bino carregados do Supabase. A validação da deployment protegida usou `vercel curl`, sem desativar a proteção. Recuperação configurada para o domínio final, mas não foi feito novo reset de palavra-passe nem validada a sessão de Bino neste checkpoint.

O primeiro build remoto falhou por exclusão acidental de `src/lib/supabase`; `.vercelignore` foi corrigido para excluir apenas as pastas da raiz. O dry-run seguinte confirmou os módulos Supabase e os logos incluídos. `.env.local`, cópia aninhada, documentos e ficheiros de laboratório não foram enviados.

## Origem e manutenção

Publicação feita por CLI a partir desta pasta e das alterações locais, sem push ou merge Git. `.vercel/project.json` identifica o projeto correto. O comando `vercel link` acrescentou automaticamente a configuração OIDC à `.env.local`; esse ficheiro permanece ignorado.

## Atualização de 15 setembro 2026

Código sincronizado com `PiriLight/Pirilight-Studio`, branch main, commit `0e35374`. Migração `20260915121236_organization_delete.sql` aplicada e registada no Supabase após autorização; testes remotos de eliminação, dependências, concorrência, anonimato e auditoria passaram numa transação anulada.

Publicação `dpl_8oN5QbQeaHHVKS5dj4tbnf87jwBQ` concluída, promovida e associada a `https://app.pirilight.pt`. URL de deployment: `https://pirilight-studio-kr762hk2i-vexas-stud1o.vercel.app`. Compilação e TypeScript passaram na Vercel. Sessão Sny no domínio final mostra Concluir tarefa e Apagar; diálogo de confirmação verificado e cancelado sem eliminar trabalho existente.

O GitHub está atualizado; a publicação continua a ser feita por CLI, sem configuração nova de publicação automática.
