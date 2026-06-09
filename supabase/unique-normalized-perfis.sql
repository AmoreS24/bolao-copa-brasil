update public.perfis
set
  cpf = regexp_replace(coalesce(cpf, ''), '\D', '', 'g'),
  telefone = regexp_replace(coalesce(telefone, ''), '\D', '', 'g');

create unique index if not exists perfis_cpf_normalizado_unique_idx
  on public.perfis ((regexp_replace(coalesce(cpf, ''), '\D', '', 'g')))
  where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') <> '';

create unique index if not exists perfis_telefone_normalizado_unique_idx
  on public.perfis ((regexp_replace(coalesce(telefone, ''), '\D', '', 'g')))
  where regexp_replace(coalesce(telefone, ''), '\D', '', 'g') <> '';

notify pgrst, 'reload schema';
