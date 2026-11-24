# Caderno do Sensei — guia para o Claude Code

Este arquivo existe para o Claude Code já começar sabendo tudo que foi feito até aqui. Leia inteiro antes de mexer. O README.md explica o básico (Supabase, GitHub Pages, banco); aqui estão o contexto, as decisões e as regras de trabalho.

## Quem usa e como trabalhar com o dono

- O dono do projeto é o Pedro. Ele escreve em **português do Brasil**, de forma direta e informal, e prefere receber a solução **pronta e testada** em vez de discussão abstrata. Responda sempre em português, em linguagem simples (ele não é programador de carreira).
- Ele trabalha de forma iterativa: pede uma mudança, testa no celular/computador, devolve com feedback direto. Quando algo "veio errado", quase sempre é porque ele está vendo uma **versão antiga publicada** — confira primeiro qual endereço ele usou e se a versão nova já está no ar (veja "Publicação").
- Os usuários finais são **professores de judô** (alguns já usando de verdade) que cuidam de alunos, turmas, mensalidades, aulas e eventos. Parte deles ainda trabalha com planilhas de Excel e digitava tudo de novo na planilha depois de preencher o app; por isso o app precisa exportar no formato que eles já usam.
- Nunca escreva dados pessoais de alunos, telefones ou chaves secretas neste repositório. **O repositório hoje é público.**

## O que é o app

Aplicativo web (PWA) estático, sem build: HTML + CSS + JavaScript puro. Cada professor tem login próprio (Supabase Auth) e só vê os próprios dados (Postgres com Row Level Security). Abas: **Alunos, Turmas, Presença, Finanças, Planejamento** (aulas, eventos, competições e exames de faixa com controle de pagamento). Sem login, o app abre em **modo exemplo** com dados de mentira.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html`, `styles.css` | Estrutura e visual (uma seção `#panel-...` por aba) |
| `app.js` | Todo o app, dentro de uma função anônima. Seções marcadas com `/* ---------- nome ---------- */` (conta e banco, entrar/sair, exemplos, renderização, presença, ficha do aluno, eventos, turmas, aulas, resumo/cópia/exportação, eventos de interface, início) |
| `planilha.js` | Gerador de planilha `.xlsx` feito à mão (sem biblioteca): monta o zip + XML. API: `MiniXLSX.build(sheets)`, `MiniXLSX.serial(iso)`, `MiniXLSX.mime` |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instalação como app e funcionamento com sinal fraco |
| `vendor/supabase.js` | Cópia local do `@supabase/supabase-js` |
| `banco/*.sql` | Esquema, presenças e faixas intermediárias. São rodados **à mão** no SQL Editor do Supabase |

Dentro do `app.js`, o trecho entre `/* PURE:START */` e `/* PURE:END */` (linhas iniciais) tem as funções puras de datas, status de mensalidade (`statusOf`, `rowsFor`, `totalsFor`) e de eventos (`evPartStatus`, `evTotals`). Reaproveite essas funções em vez de recalcular regras de pagamento em outro lugar, para a tela e a planilha nunca discordarem.

Regras importantes do domínio de pagamento:
- `statusOf(aluno, 'AAAA-MM', hoje)` devolve `pago` (existe `aluno.pay['AAAA-MM']`), `isento` (valor da mensalidade ≤ 0) ou `atrasado`/`pendente` (conforme o vencimento do mês).
- `rowsFor` decide quais alunos entram em um mês (ativo e já iniciado, ou que tenha pagamento naquele mês). O campo `inicio` é o mês em que o aluno entrou.
- Dados do usuário ficam no Supabase; há só um cache local em `localStorage` (`caderno-sensei:dados:v1`) para abrir rápido.

## Exportar para Excel (Finanças) — o que está feito e por quê

Botão **"Baixar planilha do Excel"** no **topo** da aba Finanças (`#export-btn`) e de novo no **fim** (cartão `.xl-card`, `#export-xlsx-btn`); os dois chamam `exportXLSX` em `app.js`. O botão antigo "Exportar mensalidades" (CSV) foi removido em 23/11/2026, porque o Pedro o confundia com a planilha.

O arquivo segue **o formato da planilha que o pai do Pedro já usa**:
- **Uma aba por turma**, com o nome da turma. Se uma turma estiver filtrada na tela, baixa só ela. O ano é o do mês exibido.
- Linha 1: `<Turma> <ano>` (azul, negrito) e o valor da mensalidade em vermelho (se os valores variam, mostra "menor a maior").
- Linha 2: `NOME DO ALUNO`, `jan` … `dez`, `EXA`. A coluna A é a numeração dos alunos (ordem alfabética).
- Cada mês: **`PG`** = pagou; **`X`** = ainda não pagou (inclui o mês atual); **`IS`** = isento sem pagamento; **vazio** = mês que ainda não chegou, aluno inativo ou mês anterior à entrada do aluno.
- **`EXA`**: `PG`/`X` conforme o pagamento dos eventos do tipo exame de faixa do ano em que o aluno está inscrito; vazio se não participa.
- Depois da grade vêm as abas extras **Resumo** (totais por situação, com fórmulas), **Mensalidades** (lista do mês com cores e filtro) e **Eventos** (pagamentos por inscrito). Os totais do Resumo foram conferidos com os da tela.
- **Não implementado:** o bloco "Irmãos" da planilha original (ex.: "Agatha e João R$460,00"), porque o app não tem campo de irmãos. Se o Pedro pedir, precisa de um campo novo no cadastro (e SQL em `banco/`).
- Dúvida ainda aberta: confirmar com o Pedro se `EXA` na planilha do pai significa mesmo o exame de faixa.

## Publicação (leia com atenção)

Há **dois endereços** e só um atualiza sozinho:

1. **GitHub Pages**: `https://pedroperetti-g.github.io/caderno-do-sensei/` — publica a cada push na branch `main` (1 a 2 minutos).
2. **Cloudflare Pages**: `https://caderno-do-sensei.pages.dev/` — é o endereço **oficial para os professores**. Em 23/11/2026 ele **não estava atualizando com o GitHub** (devolvia a página inicial no lugar de `planilha.js`). A pendência é ligar o projeto da Cloudflare ao repositório (Workers & Pages → projeto → conectar ao GitHub, ou fazer deploy manual da pasta raiz, sem build). Depois disso, todo push na `main` publica nos dois. **Primeira coisa a resolver, se ainda estiver assim.**

Como conferir se a versão nova está no ar: abra o arquivo alterado com um parâmetro novo, por exemplo `.../planilha.js?v=2`, para escapar do cache. Quem já tem o app instalado pode precisar abri-lo duas vezes para pegar a versão nova.

Plano de hospedagem do Pedro: tornar o repositório **privado** (para não expor código nem conteúdo) e manter só a Cloudflare como endereço. No plano gratuito, o GitHub Pages deixa de funcionar com repositório privado. Por isso: **só tornar o repositório privado depois** que a Cloudflare estiver ligada ao GitHub e os professores tiverem migrado para o endereço novo. O login continua sendo só o do próprio app (sem segunda tela de login na frente), salvo no aparelho para entrar uma vez só. Os professores **não podem perder os dados já registrados**: mudanças de banco devem ser aditivas e feitas "coisa por coisa", em etapas.

### Service worker (`sw.js`)
- Arquivo novo na raiz: acrescente em `SHELL` e **aumente o número de `CACHE`** (hoje `caderno-sensei-v5`).
- Mudou algo em `vendor/` ou `icons/`: também aumente `CACHE` (esses vêm direto do cache).
- `index.html`, `app.js`, `styles.css` e `planilha.js` tentam a internet primeiro (espera até 3 s) e só depois usam a cópia salva.

## Como testar antes de dizer que está pronto

O teste que funcionou até aqui:
1. Subir um servidor local na raiz (`python3 -m http.server 8765`).
2. Abrir `http://localhost:8765/index.html#financeiro` no Playwright (Chromium) com `service_workers='block'`. Sem login o app abre em modo exemplo, com um modal "Entrar" por cima: feche com `Escape` antes de clicar em qualquer coisa.
3. Clicar em `#export-xlsx-btn` e capturar o download.
4. Abrir o `.xlsx` com `openpyxl` (conteúdo, fórmulas e formatos) e converter no LibreOffice (`soffice --headless --convert-to pdf`) para ver como fica. Os totais do Resumo devem bater com os cartões da tela (`#kpis`).
5. Testar também: filtro de turma, mês sem dados (deve avisar), tela de celular (390 px de largura).

## Convenções

- Textos da interface em português do Brasil, simples e curtos; o público inclui pessoas mais velhas.
- Visual existente: azul-marinho `#0a2952` e amarelo nos botões, títulos em serifa; reaproveite as classes de `styles.css` (`.card`, `.btn`, `.eyebrow`, `.hint`…) em vez de criar estilos novos.
- Sem etapa de build e sem dependências novas, a menos que haja um bom motivo. Erros de rede nunca podem derrubar o app (o cache e o modo exemplo existem para isso).
- Commits em português, claros. Fazer push direto na `main` **publica o app que os professores usam**; teste antes.
- Nunca colocar a chave `service_role`/`secret` do Supabase em nenhum arquivo.

## Outros projetos relacionados (fora deste repositório)

- **Caderno do Balé** (`PedroPeretti-g/caderno-do-bale`, repositório privado): versão do mesmo app para professoras/es de balé. Melhorias gerais daqui podem precisar ser levadas para lá.
- **Programas de exame de faixa de judô (PDFs)**: material separado feito no projeto "PRojeto para o papai" do Claude (não está neste repositório).

## Histórico resumido

- Outubro/2026: primeiras versões do caderno do sensei (começaram como páginas do Claude e viraram este app).
- 03–10/11/2026: repositório público no GitHub Pages; depois publicação na Cloudflare Pages com login só do app; professores convidados para testar de graça; feedback recebido por um grupo de WhatsApp.
- 21/11/2026: botão de exportar o financeiro para Excel (versão com abas Resumo/Mensalidades/Eventos).
- 23/11/2026: planilha passou a seguir o formato da planilha do pai (grade de meses, `PG`/`X`). A versão nova ficou no GitHub Pages; a Cloudflare ainda precisa ser ligada ao GitHub.
