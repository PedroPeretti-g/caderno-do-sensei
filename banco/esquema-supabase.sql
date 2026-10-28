-- =====================================================================
-- Caderno do Sensei: esquema do banco de dados (Supabase / PostgreSQL 15+)
--
-- Como usar:
--   1. No Supabase, abra o projeto e vá em SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em Run.
--   3. Rode uma única vez. Para recomeçar do zero, apague as tabelas antes.
--
-- Regra de ouro: toda linha tem professor_id, e o banco só mostra e só
-- aceita linhas do professor logado (RLS). Um professor nunca lê os dados
-- de outro, nem chamando a API diretamente.
-- =====================================================================


-- 1. PERFIL DO PROFESSOR ----------------------------------------------
-- O login (e-mail e senha) fica em auth.users, gerenciado pelo Supabase.
create table public.professores (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null default '' check (char_length(nome) <= 120),
  criado_em  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando o professor se cadastra.
-- O nome vem do campo "nome" enviado no cadastro (opcional).
create function public.criar_professor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.professores (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nome', ''), 120));
  return new;
end;
$$;

revoke execute on function public.criar_professor() from public, anon, authenticated;

create trigger ao_cadastrar_professor
  after insert on auth.users
  for each row execute function public.criar_professor();


-- 2. TURMAS -------------------------------------------------------------
-- dias: 0 = domingo, 1 = segunda ... 6 = sábado
create table public.turmas (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  nome         text not null check (char_length(nome) between 1 and 60),
  dias         smallint[] not null default '{}'
               check (dias <@ array[0,1,2,3,4,5,6]::smallint[]),
  hora_inicio  time,
  hora_fim     time,
  local_treino text check (char_length(local_treino) <= 120),
  obs          text check (char_length(obs) <= 500),
  criado_em    timestamptz not null default now(),
  unique (id, professor_id),
  unique (professor_id, nome),
  check (hora_inicio is null or hora_fim is null or hora_fim > hora_inicio)
);


-- 3. ALUNOS -------------------------------------------------------------
-- Contém dados pessoais de menores e dados de saúde (sensíveis na LGPD).
create table public.alunos (
  id             uuid primary key default gen_random_uuid(),
  professor_id   uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  turma_id       uuid,
  nome           text not null check (char_length(nome) between 1 and 120),
  faixa          text check (faixa in ('branca','cinza','azul','amarela','laranja',
                                       'verde','roxa','marrom','preta')),
  nascimento     date,
  nome_mae       text check (char_length(nome_mae) <= 120),
  nome_pai       text check (char_length(nome_pai) <= 120),
  telefone       text check (char_length(telefone) <= 30),
  saude          text check (char_length(saude) <= 1000),
  obs            text check (char_length(obs) <= 1000),
  mensalidade    numeric(10,2) not null default 0 check (mensalidade >= 0),
  dia_vencimento smallint not null default 5 check (dia_vencimento between 1 and 31),
  aluno_desde    date not null default date_trunc('month', current_date)::date,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  unique (id, professor_id),
  -- a turma precisa ser do mesmo professor; ao apagar a turma, o aluno fica sem turma
  foreign key (turma_id, professor_id)
    references public.turmas (id, professor_id) on delete set null (turma_id)
);


-- 4. PAGAMENTOS DE MENSALIDADE -------------------------------------------
-- Uma linha por aluno e por mês pago. Sem linha = mês ainda não pago.
-- mes é sempre o dia 1 (exemplo: 2026-10-01 = outubro de 2026).
create table public.pagamentos (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  aluno_id     uuid not null,
  mes          date not null check (extract(day from mes) = 1),
  valor        numeric(10,2) not null default 0 check (valor >= 0),
  pago_em      date not null default current_date,
  unique (aluno_id, mes),
  foreign key (aluno_id, professor_id)
    references public.alunos (id, professor_id) on delete cascade
);


-- 5. AULAS --------------------------------------------------------------
create table public.aulas (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  turma_id     uuid,
  data_aula    date not null,
  tema         text not null check (char_length(tema) between 1 and 120),
  conteudo     text check (char_length(conteudo) <= 2000),
  proxima      text check (char_length(proxima) <= 200),
  criado_em    timestamptz not null default now(),
  foreign key (turma_id, professor_id)
    references public.turmas (id, professor_id) on delete set null (turma_id)
);


-- 6. EVENTOS (competições, exames de faixa...) --------------------------
create table public.eventos (
  id               uuid primary key default gen_random_uuid(),
  professor_id     uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  titulo           text not null check (char_length(titulo) between 1 and 120),
  tipo             text not null default 'competicao'
                   check (tipo in ('competicao','exame','seminario','outro')),
  data_evento      date not null,
  hora             time,
  local_evento     text check (char_length(local_evento) <= 120),
  taxa             numeric(10,2) not null default 0 check (taxa >= 0),
  prazo_pagamento  date,
  obs              text check (char_length(obs) <= 1000),
  criado_em        timestamptz not null default now(),
  unique (id, professor_id)
);


-- 7. INSCRIÇÕES (alunos que vão a cada evento e se pagaram) -------------
create table public.inscricoes (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  evento_id    uuid not null,
  aluno_id     uuid not null,
  pago         boolean not null default false,
  pago_em      date,
  valor_pago   numeric(10,2) check (valor_pago >= 0),
  unique (evento_id, aluno_id),
  foreign key (evento_id, professor_id)
    references public.eventos (id, professor_id) on delete cascade,
  foreign key (aluno_id, professor_id)
    references public.alunos (id, professor_id) on delete cascade
);


-- 8. ÍNDICES (deixam as consultas rápidas) ------------------------------
create index on public.alunos     (professor_id, turma_id);
create index on public.pagamentos (professor_id, mes);
create index on public.aulas      (professor_id, data_aula);
create index on public.aulas      (turma_id);
create index on public.eventos    (professor_id, data_evento);
create index on public.inscricoes (aluno_id);


-- 9. SEGURANÇA: cada professor só enxerga e só grava o que é dele --------
alter table public.professores enable row level security;
alter table public.turmas      enable row level security;
alter table public.alunos      enable row level security;
alter table public.pagamentos  enable row level security;
alter table public.aulas       enable row level security;
alter table public.eventos     enable row level security;
alter table public.inscricoes  enable row level security;

create policy "o professor acessa o proprio perfil" on public.professores
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "o professor acessa as proprias turmas" on public.turmas
  for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

create policy "o professor acessa os proprios alunos" on public.alunos
  for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

create policy "o professor acessa os proprios pagamentos" on public.pagamentos
  for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

create policy "o professor acessa as proprias aulas" on public.aulas
  for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

create policy "o professor acessa os proprios eventos" on public.eventos
  for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

create policy "o professor acessa as proprias inscricoes" on public.inscricoes
  for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

-- Visitantes sem login não podem tocar em nada.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;


-- =====================================================================
-- TESTE DE ISOLAMENTO (opcional, depois de criar duas contas de teste):
-- entre no app com a conta A, cadastre um aluno, saia, entre com a conta B.
-- A lista de alunos da conta B deve aparecer vazia. Se aparecer o aluno da
-- conta A, algo está errado e você não deve usar o app com dados reais.
-- =====================================================================
