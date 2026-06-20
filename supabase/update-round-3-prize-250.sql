update public.jogos
set
  premio_garantido = 250,
  premio_total_exibido = greatest(coalesce(premio_total_exibido, 0), 250)
where status_jogo = 'aberto'
  and lower(time_da_casa) in ('escócia', 'escocia')
  and lower(time_visitante) = 'brasil';

notify pgrst, 'reload schema';
