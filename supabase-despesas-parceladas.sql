-- Execute uma vez no SQL Editor do Supabase.
-- Adiciona os dados de pagamento e parcelamento das despesas do Financeiro.
begin;

alter table public.despesas
  add column if not exists forma_pagamento text,
  add column if not exists numero_parcela integer,
  add column if not exists total_parcelas integer,
  add column if not exists grupo_parcelamento text;

create index if not exists despesas_grupo_parcelamento_idx
  on public.despesas (grupo_parcelamento)
  where grupo_parcelamento is not null;

-- Mantém a edição das despesas, incluindo a forma de pagamento.
grant insert (descricao, valor, categoria, data_despesa, forma_pagamento, numero_parcela, total_parcelas, grupo_parcelamento)
  on public.despesas to authenticated;

grant update (descricao, valor, categoria, data_despesa, forma_pagamento, numero_parcela, total_parcelas, grupo_parcelamento)
  on public.despesas to authenticated;

drop policy if exists despesas_update_financeiro on public.despesas;
create policy despesas_update_financeiro on public.despesas
  for update to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
commit;
