alter table public.pagamentos
  add column if not exists confirmado_manualmente_em timestamptz,
  add column if not exists confirmado_manualmente_por text;

create index if not exists pagamentos_confirmado_manualmente_em_idx
  on public.pagamentos (confirmado_manualmente_em);
