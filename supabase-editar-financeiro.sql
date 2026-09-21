-- Execute uma vez no SQL Editor do Supabase.
-- Libera a edicao dos campos dos lancamentos para os usuarios autenticados da loja.
begin;
grant update (descricao, valor, categoria, data_receita, forma_pagamento, observacoes)
  on public.receitas_manuais to authenticated;
drop policy if exists receitas_manuais_update on public.receitas_manuais;
create policy receitas_manuais_update on public.receitas_manuais
  for update to authenticated using (true) with check (true);

grant update (descricao, valor, categoria, data_despesa)
  on public.despesas to authenticated;
drop policy if exists despesas_update_financeiro on public.despesas;
create policy despesas_update_financeiro on public.despesas
  for update to authenticated using (true) with check (true);
notify pgrst, 'reload schema';
commit;
