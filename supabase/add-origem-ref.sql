alter table public.perfis
  add column if not exists origem_ref text;

alter table public.pagamentos
  add column if not exists origem_ref text;

create index if not exists perfis_origem_ref_idx
  on public.perfis (origem_ref);

create index if not exists pagamentos_origem_ref_idx
  on public.pagamentos (origem_ref);

notify pgrst, 'reload schema';
