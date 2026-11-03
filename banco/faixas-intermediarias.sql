-- =====================================================================
-- Caderno do Sensei: faixas intermediárias (branca e cinza, cinza e azul,
-- azul e amarela, amarela e laranja, laranja e verde)
--
-- Rode UMA vez no Supabase: SQL Editor > New query > cole e clique em Run.
-- Só amplia a lista de faixas aceitas; nenhum aluno já cadastrado muda.
-- Pode rodar antes de publicar o app novo (o app antigo continua funcionando).
-- =====================================================================
alter table public.alunos drop constraint if exists alunos_faixa_check;
alter table public.alunos add constraint alunos_faixa_check
  check (faixa in ('branca','branca-cinza','cinza','cinza-azul','azul',
                   'azul-amarela','amarela','amarela-laranja','laranja',
                   'laranja-verde','verde','roxa','marrom','preta'));
