alter table public.jogos
  add column if not exists status_jogo text not null default 'aberto',
  add column if not exists placar_casa_final integer,
  add column if not exists placar_visitante_final integer,
  add column if not exists encerrado_em timestamptz,
  add column if not exists premio_garantido numeric(10,2) not null default 200,
  add column if not exists premio_acumulado numeric(10,2) not null default 0,
  add column if not exists premio_total_exibido numeric(10,2) not null default 200;

alter table public.apostas
  add column if not exists resultado_status text not null default 'aguardando';

create table if not exists public.rodada_vencedores (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid references public.jogos(id) on delete cascade,
  aposta_id uuid references public.apostas(id) on delete cascade,
  perfil_id uuid references public.perfis(id) on delete set null,
  nome text not null,
  telefone_mascarado text not null,
  palpite_casa integer,
  palpite_visitante integer,
  valor_premio numeric(10,2) not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists jogos_status_jogo_idx
  on public.jogos (status_jogo);

create index if not exists apostas_resultado_status_idx
  on public.apostas (resultado_status);

create index if not exists rodada_vencedores_jogo_id_idx
  on public.rodada_vencedores (jogo_id);

create index if not exists rodada_vencedores_perfil_id_idx
  on public.rodada_vencedores (perfil_id);
