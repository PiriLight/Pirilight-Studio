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

Até sincronizar este trabalho com o repositório remoto correto, futuras publicações devem usar esta pasta revista. Não presumir que o Git remoto já contém esta versão.
