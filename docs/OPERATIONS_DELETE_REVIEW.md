# Eliminação e ações rápidas — 15 setembro 2026

Estado final: ativa no Supabase e publicada em `https://app.pirilight.pt`. Ver checkpoint de deployment para identificação e validação.

Implementado no código local: botão Apagar nos detalhes de tarefas, projetos e clientes, confirmação com nome do registo e foco inicial em Cancelar. A eliminação é definitiva. Projetos com tarefas e clientes com projetos ou tarefas não podem ser apagados; as relações existentes continuam sem cascata. A versão do registo é verificada para evitar eliminar uma edição mais recente. A atividade conserva título, autor e momento da eliminação; registos inexistentes deixam de ter links no histórico.

Da estrutura anterior, foi adaptada a ação Concluir/Reabrir tarefa para a base operacional partilhada. Ao concluir uma tarefa em espera, limpa o acompanhamento pendente. Reabrir coloca a tarefa em Por fazer.

Próxima melhoria recomendada da referência: contactos de clientes (nome, função, email, telefone), já definidos no modelo antigo. Não foram migrados contactos nem exemplos. Objetivos, comercial e finanças exigem adaptação própria; não são ativados por esta alteração.

## Alteração de base de dados para revisão

`supabase/migrations/20260915121236_organization_delete.sql` acrescenta permissão e política DELETE às três tabelas operacionais, limitada aos utilizadores ativos já autorizados por `private.studio_member()`. Acrescenta o evento `deleted` e um trigger privado para auditoria. Não elimina registos, não altera Auth e não apaga dados associados em cascata.

Validado em PostgreSQL 17 isolado: eliminação das três entidades, bloqueio por dependências, recusa de utilizador inativo, versão desatualizada e preservação de auditoria.

Ativação remota concluída em 15 setembro 2026, após autorização explícita: migração `20260915121236` aplicada e registada no projeto `puipgxpnqkcoyyxgmquq`. Confirmadas as três políticas DELETE. Teste transacional remoto passou para eliminação das três entidades, dependências, versão antiga, bloqueio anónimo e três eventos de auditoria com autor. ROLLBACK anulou integralmente os registos de teste. Nenhum registo existente foi eliminado.
