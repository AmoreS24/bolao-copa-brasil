alter table public.torcida_votos
  add column if not exists resposta_resultado text,
  add column if not exists resposta_gols text,
  add column if not exists resposta_primeiro_gol text,
  add column if not exists resposta_escanteios text,
  add column if not exists resposta_cartoes text;

create unique index if not exists torcida_votos_perfil_jogo_unique_idx
  on public.torcida_votos (perfil_id, jogo_id);

notify pgrst, 'reload schema';
