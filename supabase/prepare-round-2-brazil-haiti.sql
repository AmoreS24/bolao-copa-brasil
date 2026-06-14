alter table public.jogos
  add column if not exists status_jogo text not null default 'aberto',
  add column if not exists placar_casa_final integer,
  add column if not exists placar_visitante_final integer,
  add column if not exists encerrado_em timestamptz,
  add column if not exists premio_garantido numeric(10,2) not null default 200,
  add column if not exists premio_acumulado numeric(10,2) not null default 0,
  add column if not exists premio_total_exibido numeric(10,2) not null default 200,
  add column if not exists local text,
  add column if not exists cidade text,
  add column if not exists grupo text,
  add column if not exists competicao text;

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

update public.jogos
set
  status_jogo = 'encerrado',
  placar_casa_final = 1,
  placar_visitante_final = 1,
  encerrado_em = coalesce(encerrado_em, now()),
  premio_garantido = 200,
  premio_acumulado = 0,
  premio_total_exibido = 200
where lower(time_da_casa) = 'brasil'
  and lower(time_visitante) = 'marrocos';

with marrocos_game as (
  select id
  from public.jogos
  where lower(time_da_casa) = 'brasil'
    and lower(time_visitante) = 'marrocos'
  order by data_de_correspondencia desc
  limit 1
),
winner_profile as (
  select id, telefone
  from public.perfis
  where lower(nome) = lower('Lidiane Santos Barreto')
  order by criado_em desc
  limit 1
),
winner_bet as (
  select a.id, a.perfil_id
  from public.apostas a
  join marrocos_game j on j.id = a.jogo_id
  left join winner_profile p on p.id = a.perfil_id
  where a.gols_brasil = 1
    and a.gols_adversario = 1
    and (p.id is null or a.perfil_id = p.id)
  order by a.criado_em desc
  limit 1
)
insert into public.rodada_vencedores (
  jogo_id,
  aposta_id,
  perfil_id,
  nome,
  telefone_mascarado,
  palpite_casa,
  palpite_visitante,
  valor_premio
)
select
  j.id,
  wb.id,
  coalesce(wb.perfil_id, wp.id),
  'Lidiane Santos Barreto',
  case
    when wp.telefone is null or length(regexp_replace(wp.telefone, '\D', '', 'g')) < 4 then '93*****29'
    else left(regexp_replace(wp.telefone, '\D', '', 'g'), 2) || '*****' || right(regexp_replace(wp.telefone, '\D', '', 'g'), 2)
  end,
  1,
  1,
  200
from marrocos_game j
left join winner_profile wp on true
left join winner_bet wb on true
where not exists (
  select 1
  from public.rodada_vencedores rv
  where rv.jogo_id = j.id
    and lower(rv.nome) = lower('Lidiane Santos Barreto')
);

with marrocos_game as (
  select id
  from public.jogos
  where lower(time_da_casa) = 'brasil'
    and lower(time_visitante) = 'marrocos'
  order by data_de_correspondencia desc
  limit 1
),
winner_profile as (
  select id
  from public.perfis
  where lower(nome) = lower('Lidiane Santos Barreto')
  order by criado_em desc
  limit 1
)
update public.apostas a
set resultado_status = case
  when a.gols_brasil = 1 and a.gols_adversario = 1 and (
    a.perfil_id = (select id from winner_profile)
    or not exists (select 1 from winner_profile)
  ) then 'vencedor'
  else 'perdedor'
end
where a.jogo_id = (select id from marrocos_game)
  and a.status = 'confirmed';

insert into public.jogos (
  time_da_casa,
  time_visitante,
  data_de_correspondencia,
  apostas_encerram_em,
  status_jogo,
  premio_garantido,
  premio_acumulado,
  premio_total_exibido,
  local,
  cidade,
  grupo,
  competicao
)
select
  'Brasil',
  'Haiti',
  '2026-06-19 21:30:00-03'::timestamptz,
  '2026-06-19 21:15:00-03'::timestamptz,
  'aberto',
  200,
  0,
  200,
  'Lincoln Financial Field / Philadelphia Stadium',
  'Filadélfia, EUA',
  'Grupo C',
  'Copa do Mundo 2026'
where not exists (
  select 1
  from public.jogos
  where lower(time_da_casa) = 'brasil'
    and lower(time_visitante) = 'haiti'
    and data_de_correspondencia = '2026-06-19 21:30:00-03'::timestamptz
);

update public.jogos
set
  status_jogo = 'aberto',
  data_de_correspondencia = '2026-06-19 21:30:00-03'::timestamptz,
  apostas_encerram_em = '2026-06-19 21:15:00-03'::timestamptz,
  premio_garantido = 200,
  premio_acumulado = 0,
  premio_total_exibido = 200,
  local = 'Lincoln Financial Field / Philadelphia Stadium',
  cidade = 'Filadélfia, EUA',
  grupo = 'Grupo C',
  competicao = 'Copa do Mundo 2026'
where lower(time_da_casa) = 'brasil'
  and lower(time_visitante) = 'haiti';

notify pgrst, 'reload schema';
