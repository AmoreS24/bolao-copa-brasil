begin;

alter table public.jogos
  add column if not exists valor_palpite numeric(10,2) not null default 10;

-- Fecha a Rodada 2 e registra o placar oficial.
update public.jogos
set
  status_jogo = 'encerrado',
  placar_casa_final = 3,
  placar_visitante_final = 0,
  encerrado_em = coalesce(encerrado_em, now()),
  premio_garantido = greatest(coalesce(premio_garantido, 200), 200),
  premio_total_exibido = greatest(coalesce(premio_total_exibido, premio_garantido, 200), 200)
where id = (
  select id
  from public.jogos
  where lower(time_da_casa) = 'brasil'
    and lower(time_visitante) = 'haiti'
  order by data_de_correspondencia desc
  limit 1
);

-- Apura todos os palpites confirmados da Rodada 2.
with haiti_game as (
  select id
  from public.jogos
  where lower(time_da_casa) = 'brasil'
    and lower(time_visitante) = 'haiti'
  order by data_de_correspondencia desc
  limit 1
)
update public.apostas a
set resultado_status = case
  when a.gols_brasil = 3 and a.gols_adversario = 0 then 'vencedor'
  else 'perdedor'
end
where a.jogo_id = (select id from haiti_game)
  and a.status in ('confirmed', 'paid', 'received', 'PAYMENT_RECEIVED');

-- Recria a lista oficial de vencedores da rodada de forma idempotente.
delete from public.rodada_vencedores
where jogo_id = (
  select id
  from public.jogos
  where lower(time_da_casa) = 'brasil'
    and lower(time_visitante) = 'haiti'
  order by data_de_correspondencia desc
  limit 1
);

with haiti_game as (
  select id, greatest(coalesce(premio_total_exibido, premio_garantido, 200), 200) as premio
  from public.jogos
  where lower(time_da_casa) = 'brasil'
    and lower(time_visitante) = 'haiti'
  order by data_de_correspondencia desc
  limit 1
),
winning_bets as (
  select a.*, count(*) over () as total_vencedores
  from public.apostas a
  join haiti_game j on j.id = a.jogo_id
  where a.status in ('confirmed', 'paid', 'received', 'PAYMENT_RECEIVED')
    and a.gols_brasil = 3
    and a.gols_adversario = 0
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
  a.id,
  a.perfil_id,
  coalesce(p.nome, 'Vencedor'),
  case
    when p.telefone is null or length(regexp_replace(p.telefone, '\D', '', 'g')) < 4 then '*****'
    else left(regexp_replace(p.telefone, '\D', '', 'g'), 2)
      || '*****'
      || right(regexp_replace(p.telefone, '\D', '', 'g'), 2)
  end,
  a.gols_brasil,
  a.gols_adversario,
  round(j.premio / nullif(a.total_vencedores, 0), 2)
from winning_bets a
join haiti_game j on true
left join public.perfis p on p.id = a.perfil_id;

-- Apura os três critérios já conhecidos. Escanteios e cartões ficam para o Admin.
with haiti_game as (
  select id
  from public.jogos
  where lower(time_da_casa) = 'brasil'
    and lower(time_visitante) = 'haiti'
  order by data_de_correspondencia desc
  limit 1
)
update public.torcida_votos tv
set
  resultado_oficial = 'Brasil vence',
  resultado_faixa_gols = '2 a 3',
  resultado_primeiro_gol = 'Brasil',
  pontos_resultado = case when tv.resposta_resultado = 'Brasil vence' then 10 else 0 end,
  pontos_gols = case when tv.resposta_gols in ('2 a 3', '3-4') then 5 else 0 end,
  pontos_primeiro_gol = case when tv.resposta_primeiro_gol = 'Brasil' then 5 else 0 end
where tv.jogo_id = (select id from haiti_game);

-- Garante que nenhuma rodada anterior permaneça aberta.
update public.jogos
set status_jogo = 'aguardando'
where status_jogo = 'aberto';

-- Cria a Rodada 3 se ainda não existir.
insert into public.jogos (
  time_da_casa,
  time_visitante,
  data_de_correspondencia,
  apostas_encerram_em,
  status_jogo,
  premio_garantido,
  premio_acumulado,
  premio_total_exibido,
  valor_palpite,
  local,
  cidade,
  grupo,
  competicao
)
select
  'Escócia',
  'Brasil',
  '2026-06-24 19:00:00-03'::timestamptz,
  '2026-06-24 18:45:00-03'::timestamptz,
  'aberto',
  250,
  0,
  250,
  10,
  'A confirmar',
  '',
  'Grupo C',
  'Copa do Mundo 2026'
where not exists (
  select 1
  from public.jogos
  where lower(time_da_casa) in ('escócia', 'escocia')
    and lower(time_visitante) = 'brasil'
    and data_de_correspondencia = '2026-06-24 19:00:00-03'::timestamptz
);

-- Atualiza e abre somente o registro mais recente de Escócia x Brasil.
with scotland_game as (
  select id
  from public.jogos
  where lower(time_da_casa) in ('escócia', 'escocia')
    and lower(time_visitante) = 'brasil'
  order by data_de_correspondencia desc
  limit 1
)
update public.jogos
set
  time_da_casa = 'Escócia',
  time_visitante = 'Brasil',
  data_de_correspondencia = '2026-06-24 19:00:00-03'::timestamptz,
  apostas_encerram_em = '2026-06-24 18:45:00-03'::timestamptz,
  status_jogo = 'aberto',
  premio_garantido = 250,
  premio_acumulado = 0,
  premio_total_exibido = greatest(coalesce(premio_total_exibido, 0), 250),
  valor_palpite = 10,
  grupo = 'Grupo C',
  competicao = 'Copa do Mundo 2026',
  placar_casa_final = null,
  placar_visitante_final = null,
  encerrado_em = null
where id = (select id from scotland_game);

notify pgrst, 'reload schema';

commit;
