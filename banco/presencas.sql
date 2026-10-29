-- Lista de presença: uma linha por aluno, turma e dia de aula.
-- Rode uma vez no SQL Editor do Supabase (depois de esquema-supabase.sql).
create table if not exists public.presencas (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  turma_id     uuid not null,
  aluno_id     uuid not null,
  data_aula    date not null,
  presente     boolean not null,
  criado_em    timestamptz not null default now(),
  unique (turma_id, aluno_id, data_aula),
  -- turma e aluno precisam ser do mesmo professor; apagar a turma ou o aluno apaga as presenças
  foreign key (turma_id, professor_id)
    references public.turmas (id, professor_id) on delete cascade,
  foreign key (aluno_id, professor_id)
    references public.alunos (id, professor_id) on delete cascade
);

create index if not exists presencas_prof_turma_data_idx on public.presencas (professor_id, turma_id, data_aula);
create index if not exists presencas_aluno_idx on public.presencas (aluno_id);

alter table public.presencas enable row level security;

drop policy if exists "o professor acessa as proprias presencas" on public.presencas;
create policy "o professor acessa as proprias presencas" on public.presencas
  for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

revoke all on public.presencas from anon;
