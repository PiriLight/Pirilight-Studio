# Centro de Organização — iteração local de 14/09/2026

## Estado de entrega

**Correção posterior de acesso:** logs do servidor mostraram `PGRST303: JWT issued at future` na consulta da allowlist. Foi acrescentada repetição apenas para esse erro exato, após 1 e 2 segundos, mantendo validação remota e negação de acesso se persistir. Sem alterações às policies ou credenciais. Quatro testes cobrem recuperação, limite, outros erros JWT e membro não autorizado; suite com 347 testes passou, tal como TypeScript e ESLint dos ficheiros alterados. Centro, tarefas e projetos reabertos com a sessão existente sem o erro. Isto trata um desfasamento transitório; não corrige um relógio persistentemente desalinhado do fornecedor.

**Atualização — ativação autorizada em 14/09/2026:** após o pedido “aplica essas alterações”, a migration preparada foi aplicada transacionalmente no projeto `puipgxpnqkcoyyxgmquq`, pelo SQL Editor autenticado. A inspeção prévia confirmou apenas `app_users` e os dois owners ativos. As quatro novas tabelas têm RLS ativo e nenhum acesso `anon`. A flag foi ativada apenas nesta instalação local. O Centro carrega através do cliente Supabase real, apresenta Sny/Bino e abre a captura. Criação, atualização e histórico foram verificados como `authenticated` numa transação anulada; confirmado zero tarefas/eventos de teste depois. Não foi gravado um registo permanente através do formulário, nem testada a sessão de Bino. Sem deploy ou alterações Auth. O restante relatório abaixo documenta a entrega anterior à autorização.

Interface e implementação Supabase preparadas. Fluxo de utilização validado com PostgreSQL 17 isolado e adaptador de teste. **A base operacional remota não foi ativada.** Não houve migrations, policies, criação de utilizadores, alterações de dados, push, merge ou deploy remotos.

A aplicação final usa apenas o cliente Supabase existente para os novos dados. `PIRILIGHT_OPERATIONS_ENABLED` fica desligado por omissão. Sem ativação mostra um aviso explícito, sem exemplos, métricas ou falsa gravação. A autenticação, recuperação de palavra-passe, cookies, allowlist e ações Auth não foram reescritas.

## Inspeção e proveniência

Checkpoint da ativação: versão `20260914141357`, `organization_core`, registada em `supabase_migrations.schema_migrations` após aplicação pelo painel (o conector não tinha permissão neste projeto). Advisor revisto: índices ainda sem uso numa base nova; proteção contra passwords comprometidas desativada em Auth, fora desta alteração; aviso [função SECURITY DEFINER acessível a authenticated](https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable) em `studio_members`. Esta chamada é intencional: verifica a allowlist ativa, rejeita sessões anónimas, devolve apenas ID/nome e tem search_path vazio. Nenhum aviso de RLS ausente nas novas tabelas.

- A pasta `E:\PiriLight-Studio-main` não tinha `.git`. Não foi possível identificar a branch original ou alterações face a um upstream. Foi criado um repositório local, sem remote, na branch `codex/centro-organizacao`; commit `dc1d076` preserva o ponto de partida, incluindo os fixes de login anteriores.
- A cópia aninhada `Pirilight-Studio-main/` foi preservada e excluída de TypeScript/ESLint/Git nesta raiz: o compilador estava a misturar as duas cópias.
- Instruções lidas: AGENTS.md, CLAUDE.md, guias locais Next.js para Client Components e Server Actions, orientações de frontend e Supabase.
- Graphify executado primeiro: `graphify extract src --code-only --no-cluster --out docs/architecture --max-workers 2`. Resultado: **1070 nós e 4528 relações**. Consultas `query` e `explain getMockData` mostraram os consumidores comuns de dados mock. Extração local AST; sem envio a um LLM. Artefacto regenerável em `docs/architecture/graphify-out/graph.json`, excluído do Git.
- O grafo cobre o código. SQL, configurações, invariantes e fluxos foram lidos diretamente; Graphify não prova o schema remoto.
- Neste checkout as migrations anteriores só definem a allowlist. A existência de outra evolução do Studio noutro checkout não foi tratada como implementação desta pasta.

## Auditoria do ponto de partida

| Estado | Constatação e evidência | Prioridade |
|---|---|---|
| IMPLEMENTADO E FUNCIONAL | Sessão autorizada abre o Studio; proxy/layout e verificação server-side existentes. | Preservar |
| IMPLEMENTADO E FUNCIONAL | Regras puras de urgência, filtros de tarefas, vistas de projetos e relação visual com cliente existem. Confirmados pelo código e navegação. | Preservar conceito |
| IMPLEMENTADO MAS INCOMPLETO | `lib/data/internal.ts` e getters devolvem `getMockData`; stores de tarefas/projetos/objetivos/manutenção/renovações usam `persist` do Zustand. Refresh local não equivale a partilha entre owners. | P0 |
| BUG | Ação urgente de tarefa no dashboard abre `/tasks`, sem ID nem seleção da tarefa. Fluxo confirmado no browser. | P1 |
| IMPLEMENTADO MAS INCOMPLETO | Nova tarefa exige vários campos logo à entrada; estado de espera não tem data própria de revisão. Formulário inspecionado sem modificar registos anteriores. | P1 |
| IMPLEMENTADO MAS INCOMPLETO | Projetos só aceitam website/piricard; não têm responsável/prioridade próprios. Detalhe mostra uma próxima tarefa, mas o conceito fica limitado aos dois produtos. | P1 |
| PLACEHOLDER | A identidade de perfil é alternada localmente entre perfis fixos, sem mudar a sessão Auth. Substituída no cabeçalho pela identidade autorizada real. | P0 |
| EM FALTA | Camada operacional partilhada, FKs reais, histórico persistente, proteção contra edição concorrente. | P0 |
| EM FALTA | Pesquisa transversal por contexto e endereço estável de cada tarefa. | P1 |
| NÃO VERIFICADO | CRUD remoto, policies operacionais remotas e partilha efetiva por duas sessões Supabase nesta iteração. Não foram ativados nem testados em produção. | Bloqueio de ativação |
| NÃO VERIFICADO | Todos os fluxos de finanças, comercial, manutenção e materiais. Ficaram fora desta entrega operacional, preservados como protótipo. | P2/futuro |

## Modelo escolhido

**Cliente → projetos → tarefas**, com tarefas diretamente ligadas a um cliente quando não há projeto e tarefas internas sem cliente/projeto.

- `businesses`: identidade e notas do cliente. Não cria um CRM/ERP completo.
- `projects`: cliente (ou tipo interno sem cliente), tipo de trabalho, estado, prioridade, responsável, prazo, notas.
- `tasks`: ação concreta, contexto, responsável opcional, estado, prioridade, prazo, notas, motivo de espera/bloqueio e data de revisão.
- `operation_activity`: eventos reais de criação/edição, gerados na mesma transação da escrita. Só leitura para a aplicação.
- `app_users`: fonte existente de membros autorizados; nenhuma nova tabela de utilizadores. RPC `studio_members` devolve apenas ID e nome dos membros ativos para atribuição; a policy própria de `app_users` permanece igual.

Não há entidade “próxima ação” nem campo de texto duplicado no projeto: a próxima ação é uma tarefa existente, executável e com ligação direta. Não foram criadas entidades de follow-up, notas ou trabalho interno separadas.

### Regras de atenção

- Tarefa aberta: prazo anterior ao dia de Lisboa, bloqueio, revisão vencida/hoje, ausência de responsável, ou trabalho aberto num projeto concluído.
- Projeto aberto: prazo vencido, bloqueio, sem responsável ou sem tarefa executável.
- Cada item aparece uma vez com todas as razões; tarefas vencidas primeiro, restantes tarefas depois, projetos por último; desempate estável por título/ID.
- A seguir: tarefas `todo`/`in_progress`, excluindo projetos concluídos. Prazo mais cedo, prioridade, antiguidade, ID. Sem data depois das tarefas datadas.
- Espera/bloqueio exige motivo e data de acompanhamento. Ao concluir ou retomar, esses campos deixam de estar ativos.
- Concluir um projeto com tarefas abertas não esconde o problema: essas tarefas passam a ter um alerta explícito.

## Alterações e simplificação

1. Centro principal passa a mostrar atenção, hoje, a seguir e a aguardar, com regras consultáveis e links diretos.
2. Captura com apenas o título obrigatório; contexto, responsável e prazo próximos, detalhes secundários recolhidos. Edição, conclusão e reabertura no mesmo formulário.
3. Clientes/projetos/tarefas com páginas próprias e navegação contextual. Projeto herda contexto do cliente; tarefa herda cliente do projeto por FK, sem cópia.
4. Pesquisa por nome/notas/contexto, sem acentos; filtros reais de estado, responsável e tipo de projeto. Filtros ficam no URL para refresh e partilha de endereços internos.
5. Backend Supabase com validação server-side, RLS por allowlist ativa, FKs, índices, histórico por trigger e atualização condicionada a `updated_at`.

Navegação diária reduzida a Centro, Tarefas, Projetos e Clientes. Websites e PiriCards são tipos de projeto. Não há gráficos nem contadores financeiros fabricados. O antigo trabalho foi preservado em “Estrutura anterior”, incluindo `/reference/tasks` e `/reference/dashboard`; não é importado silenciosamente. Esses módulos continuam a usar os dados anteriores e têm aviso explícito. **Não existe dual-write entre as duas camadas.**

Visual: preservados navy `#092634`, branco `#F9F9F9`, azul `#168CFF`, secundário `#004E72`, laranja de ação `#FF6E42`, Geist/Geist Mono e marca existentes. A hierarquia destaca a fila de decisões, não uma grelha de indicadores. Mobile: título em largura completa, vistas em duas linhas, filtros recolhidos e formulários com scroll próprio.

## Fluxo principal

Abrir Centro → perceber a razão do alerta → abrir a tarefa → ver cliente/projeto → editar responsável/estado/prazo/contexto → guardar → voltar ao Centro. Para trabalho novo: registar cliente se necessário → criar projeto → adicionar tarefa já associada. Captura interna pode começar só com um título e ser organizada mais tarde.

## Testes e limites da evidência

- Graphify + leitura direta + navegação do dashboard anterior, tarefas, formulário e detalhe de website. Confirmado o salto sem contexto das ações do dashboard.
- PostgreSQL 17 em Docker isolado: migrations executadas apenas aí; FKs, contexto exclusivo, espera obrigatória, atribuição a membro ativo, acesso partilhado de dois fixtures autorizados, negação a desativado/externo/anónimo, diretório protegido, audit sem falsificação, proibição de DELETE e conflito de versão. Resultado PASS.
- Browser com autenticação real existente e **adaptador temporário de dados para essa base de teste**: criar cliente, criar projeto associado, criar tarefa, editar espera/motivo/revisão/notas, concluir, navegar, refresh e persistência; captura interna só com título; pesquisa por “clinica” encontra tarefa por relação, filtro de responsável exclui-a, empty state, validação obrigatória, loading de gravação, falha de leitura simulada.
- Desktop 1440×1000 e mobile 390×844; medida DOM mobile sem overflow horizontal do documento; título e filtros corrigidos após inspeção visual.
- Pedido HTTP sem cookies a `/projects` devolve 307 para `/login`; browser autorizado continua a abrir o Centro.
- Adaptadores temporários retirados no final. `tests/operations/review-adapter.ts` é só um auxiliar de laboratório e não é importado por `src`.
- Capturas em `docs/organization-captures/` identificam claramente os dados de laboratório. Não provam ativação remota.
- Não se testou o CRUD pelo endpoint HTTP Supabase real, envio de e-mails novamente, duas sessões reais concorrentes, nem uma migration remota. A evidência SQL e UI local não substitui esse teste de integração antes da ativação.

Checks finais: **343 testes em 18 ficheiros passaram**, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` e `git diff --check` sem erros. O script reproduzível `tests/operations/run-database-tests.ps1` terminou com exit code 0 e PASS das verificações SQL numa instância PostgreSQL nova, isolada e removida automaticamente no fim. Os contentores anteriores de laboratório foram parados após a validação. O servidor local do Studio permanece disponível.

## Revisão e ativação futura (não executada)

1. Confirmar o schema atual do projeto Supabase autorizado, incluindo eventuais tabelas criadas fora deste checkout. A migration cria tabelas e falhará se houver conflito; não é uma migration de conversão universal.
2. Rever `20260914141357_organization_core.sql`: grants/RLS, funções definer com search_path vazio, diretório de membros, triggers e FKs. Nenhuma policy Auth existente é removida.
3. Validar primeiro numa instância Supabase de teste autorizada, sem criar utilizadores ou usar dados reais sem autorização específica. Testar via SDK/HTTP como os dois owners e como conta sem allowlist.
4. Só após autorização explícita aplicar ao ambiente remoto correto. Não executar `db push` automaticamente.
5. Definir `PIRILIGHT_OPERATIONS_ENABLED=true` no ambiente escolhido e testar criar → associar → editar → refresh → verificar nas duas sessões. Se houver falha, desligar a flag preserva os registos; não fazer rollback destrutivo automático.
6. Decidir que apontamentos locais são reais e merecem importação revista. Não importar mocks nem reclassificar exemplos como clientes reais.

### Próximas prioridades

- P0: revisão/ativação controlada e integração Supabase de ponta a ponta.
- P1: importar apenas trabalho real validado pela equipa, de forma única e auditável.
- P2: histórico específico paginado por entidade; atualmente a vista mostra no máximo seis eventos dos últimos trinta globais. Leitura operacional pagina 500 linhas por pedido, com limite explícito de 20 mil por entidade e erro em vez de truncagem silenciosa.
- P2: atualizar automaticamente quando a outra pessoa altera trabalho; atualmente Atualizar dados/refresh e navegação obtêm a versão guardada, e conflitos de edição são detetados.
- P3: command palette. Pesquisa e captura atuais resolvem primeiro a necessidade concreta, sem outra camada de navegação.

Sem ERP, gamificação, automações comerciais, módulos financeiros novos ou alterações à identidade PiriLight.
