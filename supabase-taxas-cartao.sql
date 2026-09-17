-- Execute no SQL Editor do Supabase antes de usar o novo encerramento.
-- Dados antigos ficam nulos: nao presume parcelas nem taxas historicas.
begin;
alter table public.ordens_servico
  add column if not exists parcelas smallint check (parcelas between 1 and 12),
  add column if not exists taxa_cartao_percentual numeric(5,2) check (taxa_cartao_percentual between 0 and 100),
  add column if not exists valor_taxa_cartao numeric(12,2) check (valor_taxa_cartao >= 0),
  add column if not exists valor_liquido numeric(12,2) check (valor_liquido >= 0);
notify pgrst, 'reload schema';
commit;
