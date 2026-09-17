-- Execute no SQL Editor do Supabase para ativar Adicionar receita.
begin;
create table if not exists public.receitas_manuais (
  id bigint generated always as identity primary key,
  descricao text not null check (length(trim(descricao)) between 1 and 300),
  valor numeric(12,2) not null check (valor > 0),
  data_receita date not null default current_date,
  categoria text not null check (categoria in ('Venda de placas', 'Serviços', 'Outros')),
  forma_pagamento text not null,
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists receitas_manuais_data_idx on public.receitas_manuais(data_receita);
alter table public.receitas_manuais enable row level security;
-- O financeiro é compartilhado pelos usuários autenticados da loja.
revoke all on public.receitas_manuais from anon;
grant select, insert on public.receitas_manuais to authenticated;
grant usage, select on sequence public.receitas_manuais_id_seq to authenticated;
drop policy if exists receitas_manuais_select on public.receitas_manuais;
create policy receitas_manuais_select on public.receitas_manuais for select to authenticated using (true);
drop policy if exists receitas_manuais_insert on public.receitas_manuais;
create policy receitas_manuais_insert on public.receitas_manuais for insert to authenticated with check (true);
commit;
