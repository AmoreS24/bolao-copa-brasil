alter table public.jogos
  add column if not exists status_jogo text default 'aguardando',
  add column if not exists local text,
  add column if not exists cidade text,
  add column if not exists grupo text,
  add column if not exists premio_garantido numeric(10,2) default 200,
  add column if not exists premio_total_exibido numeric(10,2) default 200,
  add column if not exists valor_palpite numeric(10,2) default 10,
  add column if not exists encerrado_em timestamptz;

create index if not exists jogos_status_jogo_idx on public.jogos(status_jogo);
create index if not exists jogos_data_de_correspondencia_idx on public.jogos(data_de_correspondencia);
