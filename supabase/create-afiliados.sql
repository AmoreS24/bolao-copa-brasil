create extension if not exists pgcrypto;

create table if not exists public.afiliados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text not null unique,
  link text not null,
  criado_em timestamptz not null default now()
);

create index if not exists afiliados_criado_em_idx
  on public.afiliados (criado_em desc);

grant select, insert on public.afiliados to anon, authenticated;

notify pgrst, 'reload schema';
