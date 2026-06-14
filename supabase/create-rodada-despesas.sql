create table if not exists public.rodada_despesas (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid references public.jogos(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null,
  criado_em timestamptz not null default now()
);

create index if not exists rodada_despesas_jogo_id_idx
  on public.rodada_despesas (jogo_id);

create index if not exists rodada_despesas_criado_em_idx
  on public.rodada_despesas (criado_em desc);

notify pgrst, 'reload schema';
