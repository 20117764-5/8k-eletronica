-- Execute no SQL Editor do Supabase. Preserva todos os itens existentes.
-- Itens antigos ficam com estado nao informado ate serem editados.
begin;
alter table public.estoque_pecas_venda
  add column if not exists estado text
  constraint estoque_pecas_venda_estado_check check (estado in ('Boa', 'Ruim'));
notify pgrst, 'reload schema';
commit;
