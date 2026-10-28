# Caderno do Sensei

Aplicativo web para professores de judô: alunos, turmas, mensalidades, planejamento de aulas e eventos (competições e exames de faixa) com controle de pagamento. Cada professor tem seu próprio login e só enxerga os próprios dados. Funciona no celular e no computador e pode ser instalado na tela inicial.

## Como funciona

- Site estático (HTML, CSS e JavaScript), hospedado no GitHub Pages. Não precisa de servidor.
- Contas e banco de dados no Supabase (Auth + Postgres com Row Level Security). Cada tabela só deixa o professor ler e gravar as linhas dele.
- A chave que aparece em `app.js` (`sb_publishable_...`) é pública por projeto. Quem protege os dados são as regras do banco, não o segredo da chave. **Nunca coloque a chave `secret` / `service_role` em nenhum arquivo deste repositório.**

## Publicar no GitHub Pages

1. Crie um repositório público no GitHub (por exemplo `caderno-do-sensei`) e envie todos os arquivos desta pasta para a raiz dele.
2. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, pasta `/ (root)`. Salve.
3. Depois de 1 a 2 minutos o site abre em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Configurar o Supabase para o endereço do site

No painel do Supabase: **Authentication → URL Configuration**

- **Site URL**: o endereço do site (ex.: `https://SEU-USUARIO.github.io/caderno-do-sensei/`).
- **Redirect URLs**: adicione o mesmo endereço, terminando em `/**` (ex.: `https://SEU-USUARIO.github.io/caderno-do-sensei/**`).

### E-mails de confirmação e de recuperar senha

O serviço de e-mail padrão do Supabase só envia para membros da sua organização e no máximo 2 mensagens por hora. Serve para testar, não para professores de verdade. Duas saídas:

- **Agora (sem custo, simples):** em **Authentication → Sign In / Providers → Email**, desligue **Confirm email**. O professor entra assim que cria a conta. Em troca, o "esqueci minha senha" só vai funcionar para e-mails de membros da organização até você configurar o SMTP abaixo, e não há verificação de que o e-mail digitado é real.
- **Quando começar a divulgar:** configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (Resend, Brevo, Postmark, Amazon SES ou outro) e ligue **Confirm email** de novo. Aproveite para traduzir os modelos de e-mail em **Authentication → Emails → Templates**.

## Banco de dados

O esquema completo está em `banco/esquema-supabase.sql` (já aplicado no projeto). Para recriar em outro projeto, cole o arquivo no **SQL Editor** do Supabase e execute.

## Teste de isolamento (faça antes de cadastrar alunos de verdade)

1. Crie duas contas com e-mails diferentes (use uma janela anônima para a segunda).
2. Cadastre uma turma e um aluno na primeira conta.
3. Entre na segunda conta e confirme que ela está vazia.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html`, `styles.css` | Estrutura e visual |
| `app.js` | Telas, regras e comunicação com o Supabase |
| `vendor/supabase.js` | Biblioteca oficial `@supabase/supabase-js` 2.117.3 (cópia local) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instalação como aplicativo e abertura sem sinal (os dados continuam exigindo internet) |
| `banco/esquema-supabase.sql` | Tabelas, regras de acesso e gatilho de cadastro |

## Antes de cobrar ou divulgar

- Publique uma política de privacidade e termos de uso. O app guarda dados de menores de idade e informações de saúde, que a LGPD trata com cuidado especial. Vale uma revisão de quem entende do assunto.
- Plano gratuito do Supabase: 500 MB, e o projeto é pausado após 1 semana sem uso. Para uso comercial o plano Pro (US$ 25/mês) evita a pausa e inclui backups.
