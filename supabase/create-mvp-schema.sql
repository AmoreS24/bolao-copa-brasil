create extension if not exists pgcrypto;

create table if not exists public.perfis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  cpf text not null,
  senha_hash text not null,
  criado_em timestamptz not null default now()
);

create unique index if not exists perfis_telefone_unique_idx
  on public.perfis (telefone);

create unique index if not exists perfis_cpf_unique_idx
  on public.perfis (cpf);

create table if not exists public.jogos (
  id uuid primary key default gen_random_uuid(),
  time_da_casa text not null,
  time_visitante text not null,
  data_de_correspondencia timestamptz not null,
  apostas_encerram_em timestamptz not null,
  criado_em timestamptz not null default now()
);

create index if not exists jogos_data_de_correspondencia_idx
  on public.jogos (data_de_correspondencia);

create table if not exists public.premio_maximo (
  id uuid primary key default gen_random_uuid(),
  quantia numeric(12,2) not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  asaas_payment_id text not null,
  valor_total numeric(10,2) not null,
  valor_palpites numeric(10,2) not null,
  taxa_operacional numeric(10,2) not null default 1.99,
  status text not null default 'pending',
  pix_qr_code text not null default '',
  pix_copia_cola text not null default '',
  criado_em timestamptz not null default now(),
  expira_em timestamptz
);

create unique index if not exists pagamentos_asaas_payment_id_unique_idx
  on public.pagamentos (asaas_payment_id);

create index if not exists pagamentos_perfil_id_idx
  on public.pagamentos (perfil_id);

create index if not exists pagamentos_status_idx
  on public.pagamentos (status);

create index if not exists pagamentos_criado_em_idx
  on public.pagamentos (criado_em desc);

create table if not exists public.apostas (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references public.pagamentos (id) on delete cascade,
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  gols_brasil integer not null,
  gols_adversario integer not null,
  gols_casa integer generated always as (gols_brasil) stored,
  gols_visitante integer generated always as (gols_adversario) stored,
  status text not null default 'pending_payment',
  pontos integer not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists apostas_pagamento_id_idx
  on public.apostas (pagamento_id);

create index if not exists apostas_perfil_id_idx
  on public.apostas (perfil_id);

create index if not exists apostas_jogo_id_idx
  on public.apostas (jogo_id);

create index if not exists apostas_status_idx
  on public.apostas (status);

create table if not exists public.torcida_votos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  pagamento_id uuid references public.pagamentos (id) on delete set null,
  pontos integer not null default 0,
  jogos integer not null default 1,
  criado_em timestamptz not null default now()
);

create unique index if not exists torcida_votos_perfil_jogo_unique_idx
  on public.torcida_votos (perfil_id, jogo_id);

create index if not exists torcida_votos_jogo_id_idx
  on public.torcida_votos (jogo_id);

create index if not exists torcida_votos_pontos_idx
  on public.torcida_votos (pontos desc);

create or replace view public.ranking_torcida as
select
  tv.id,
  tv.perfil_id,
  p.nome,
  tv.jogo_id,
  tv.pagamento_id,
  tv.pontos,
  tv.jogos,
  tv.criado_em
from public.torcida_votos tv
left join public.perfis p on p.id = tv.perfil_id;

grant usage on schema public to anon, authenticated;

grant select on public.jogos to anon, authenticated;
grant select on public.premio_maximo to anon, authenticated;
grant select on public.torcida_votos to anon, authenticated;
grant select on public.ranking_torcida to anon, authenticated;
grant select on public.perfis to anon, authenticated;
grant select on public.apostas to anon, authenticated;
grant select on public.pagamentos to anon, authenticated;

grant insert on public.perfis to anon, authenticated;
grant insert on public.pagamentos to anon, authenticated;
grant insert on public.apostas to anon, authenticated;
grant insert on public.torcida_votos to anon, authenticated;

grant update on public.pagamentos to anon, authenticated;
grant update on public.apostas to anon, authenticated;
grant update on public.torcida_votos to anon, authenticated;

notify pgrst, 'reload schema';
