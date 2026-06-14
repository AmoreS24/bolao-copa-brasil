alter table public.torcida_votos
  add column if not exists pontos_resultado integer not null default 0,
  add column if not exists pontos_gols integer not null default 0,
  add column if not exists pontos_primeiro_gol integer not null default 0,
  add column if not exists pontos_escanteios integer not null default 0,
  add column if not exists pontos_cartoes integer not null default 0,
  add column if not exists pontos_total_rodada integer not null default 0,
  add column if not exists pontos_total_acumulado integer not null default 0,
  add column if not exists resultado_oficial text,
  add column if not exists resultado_faixa_gols text,
  add column if not exists resultado_primeiro_gol text,
  add column if not exists resultado_faixa_escanteios text,
  add column if not exists resultado_faixa_cartoes text,
  add column if not exists apurado_em timestamptz;

create index if not exists torcida_votos_apurado_em_idx
  on public.torcida_votos (apurado_em);

create index if not exists torcida_votos_pontos_total_rodada_idx
  on public.torcida_votos (pontos_total_rodada desc);

notify pgrst, 'reload schema';
