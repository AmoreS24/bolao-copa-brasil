alter table public.jogos
  add column if not exists aberto_em timestamptz;

update public.jogos atual
set aberto_em = coalesce(
  atual.aberto_em,
  (
    select max(coalesce(anterior.encerrado_em, anterior.data_de_correspondencia))
    from public.jogos anterior
    where anterior.status_jogo = 'encerrado'
      and anterior.data_de_correspondencia < atual.data_de_correspondencia
  ),
  now()
)
where atual.status_jogo = 'aberto';

create table if not exists public.rodada_visitantes (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogos(id) on delete cascade,
  visitante_id text not null,
  criado_em timestamptz not null default now(),
  unique (jogo_id, visitante_id)
);

create index if not exists rodada_visitantes_jogo_id_idx
  on public.rodada_visitantes(jogo_id);

update public.jogos
set
  local = 'Hard Rock Stadium',
  cidade = 'Miami, EUA'
where lower(time_da_casa) in ('escócia', 'escocia')
  and lower(time_visitante) = 'brasil'
  and data_de_correspondencia = '2026-06-24 19:00:00-03'::timestamptz;

notify pgrst, 'reload schema';
