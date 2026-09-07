# Migração progressiva de Comercial e Clientes

## Inventário atual

As fixtures contêm 15 Businesses, 17 contactos e 10 Deals. São cenários de demonstração: os contactos usam emails `example.pt`, telefones fictícios e responsáveis legados `sny`/`bino`.

## Regra de importação

Não importar estas fixtures automaticamente para produção. Antes de qualquer import remoto:

1. classificar cada Business como `real`, `substituir` ou `ignorar`;
2. substituir dados fictícios por dados confirmados;
3. resolver `sny`/`bino` para `app_users.user_id` por identidade, nunca por UUID hardcoded;
4. atribuir UUIDs uma única vez e guardar um manifesto `legacy_id -> uuid` para preservar relações;
5. importar por ordem `businesses -> contacts -> deals`, usando upsert pelos UUIDs do manifesto;
6. executar primeiro em ambiente local, comparar contagens e relações e só depois pedir aprovação remota.

Enquanto este processo não for aprovado, `PIRILIGHT_OPERATIONAL_DATA_SOURCE` fica ausente em produção e os mocks permanecem apenas como modo de demonstração. Quando definido como `supabase`, Comercial, Clientes e Contactos leem e escrevem exclusivamente em Supabase; não existe dual-write.
