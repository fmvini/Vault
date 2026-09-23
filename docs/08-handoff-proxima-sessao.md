# Handoff para a próxima sessão — Vault

Data da última revisão: 23/09/2026

## Estado atual

O checklist de QA foi revisado e os fluxos que podiam ser comprovados localmente foram implementados e testados. A aplicação agora usa a API real por padrão, mantém os dados no backend e passou nos testes automatizados de backend, frontend e navegador.

Não declarar o produto como “100% validado em produção” antes de concluir os itens de infraestrutura listados no fim deste documento.

## Identidade visual

- Três conceitos vetoriais foram criados em `logos/concepts/`.
- O comparador visual está em `logos/preview.html`.
- O usuário escolheu o conceito 2, “Portal seguro”, como identidade oficial.
- A versão para fundos claros está em `frontend/public/vault-logo.svg`; a versão escura está em `frontend/public/vault-logo-dark.svg`.
- Os ícones correspondentes estão em `frontend/public/vault-icon.svg` e `frontend/public/vault-icon-dark.svg`.
- A sidebar alterna automaticamente entre os ícones conforme o tema.
- A autenticação usa a variante de alto contraste para fundo escuro.
- O favicon acompanha o tema ativo por meio de `frontend/src/lib/theme.ts`.
- Os SVGs finais para reutilização estão em `logos/export/`; as duas iterações ficam em `logos/iterations/`.
- O preview inclui comparação claro/escuro e verificação do ícone em 64, 32 e 16 px.
- A exportação PNG não foi gerada porque este Windows não possui Bash/conversor SVG; os SVGs são os assets oficiais e estão completamente funcionais no navegador.

## Funcionalidades e correções implementadas

### Autenticação

- O frontend deixou de iniciar em modo demonstração por padrão; `VITE_DEMO_MODE=true` passa a ser uma opção explícita.
- Tokens de acesso e de recuperação de senha têm tipos diferentes.
- O token de recuperação expira em 30 minutos e não funciona como token de autenticação.
- A solicitação de recuperação sempre retorna resposta genérica, evitando revelar se um e-mail existe.
- Foi criado o endpoint de redefinição de senha e a rota/tela `/reset-password`.
- O envio do link usa Resend quando a chave está configurada.

Arquivos principais: `backend/app/api/v1/auth.py`, `backend/app/core/security.py`, `backend/app/services/email_service.py`, `frontend/src/features/auth/ResetPasswordPage.tsx` e `frontend/src/App.tsx`.

### Transações

- CRUD completo no frontend.
- Busca por descrição no backend.
- Filtros por tipo, categoria e intervalo de datas.
- Atalho para o último mês e limpeza dos filtros.
- Ordenação por data ou valor, crescente e decrescente.
- Paginação de 10 registros.
- Moeda por transação: BRL, USD ou EUR.
- Alternância de recorrência entre pago e pendente.
- Confirmação de exclusão, estados de carregamento e mensagens de erro.

Arquivos principais: `backend/app/api/v1/transactions.py` e `frontend/src/features/transactions/TransactionsPage.tsx`.

### Categorias, gastos fixos e metas

- Categorias personalizadas podem ser criadas e editadas com nome, ícone, cor e tipo.
- Categorias de sistema permanecem protegidas.
- Gastos fixos ganharam edição, moeda, data final, desativação e reativação.
- Metas ganharam criação, edição, exclusão, limite, moeda e indicação visual quando ultrapassadas.
- O cálculo mensal das metas converte cada transação para a moeda da meta.

Arquivos principais: `frontend/src/features/categories/CategoriesPage.tsx`, `frontend/src/features/fixed-expenses/FixedExpensesPage.tsx`, `frontend/src/features/goals/GoalsPage.tsx`, `backend/app/api/v1/goals.py` e `backend/app/services/goal_service.py`.

### Dashboard, câmbio e responsividade

- O dashboard aceita mês, últimos três meses, ano e período personalizado.
- Os valores respeitam a moeda escolhida.
- Gráficos possuem estado vazio e o link “Ver todas” navega corretamente.
- A conversão BRL/USD/EUR usa cache no banco e busca sob demanda na API pública Frankfurter.
- Um job atualiza diariamente os seis pares direcionais quando `SCHEDULER_ENABLED=true`.
- O layout mobile foi corrigido para 390 × 844 sem overflow horizontal do documento.
- Filtros, tabela, modais e controles receberam ajustes de usabilidade e acessibilidade.

Arquivos principais: `frontend/src/features/dashboard/DashboardPage.tsx`, `frontend/src/enhancements.css`, `backend/app/services/exchange_rate_service.py` e `backend/app/jobs/scheduler.py`.

## Testes adicionados

- Backend: `backend/tests/conftest.py` e `backend/tests/test_api.py`.
- E2E: `frontend/e2e/vault.spec.ts` e `frontend/playwright.config.ts`.
- O E2E cobre cadastro, categoria, criação e edição de transação, busca, período do dashboard, persistência de configurações, logout/login, navegação mobile e ausência de erros no console.
- Playwright foi adicionado às dependências de desenvolvimento e o script `test:e2e` foi incluído no `package.json`.

Últimos resultados confirmados em 23/09/2026:

- `backend: python -m ruff check .` — aprovado.
- `backend: python -m pytest -q` — 12 testes aprovados; 2 avisos de depreciação em dependências de teste.
- `frontend: npm run lint -- --quiet` — aprovado.
- `frontend: npm run build` — aprovado; há apenas o aviso do Vite sobre um chunk JavaScript maior que 500 kB.
- `frontend: npm run test:e2e` — 5 cenários aprovados em Chromium, incluindo desktop, mobile e tablet.
- O E2E também valida a variante escura da logo, a troca de favicon e o ícone de alto contraste da autenticação.

## Continuação da sessão em 23/09/2026

O usuário pediu para continuar a checklist de `docs/06-checklist-testes-qa.md` e registrar tudo neste handoff. Há 61 dos 70 itens marcados com `[x]` por evidência local; os 9 restantes dependem de inspeção manual adicional, decisão sobre a semântica do período ou produção. A explicação de cada evidência está em `docs/07-relatorio-qa.md`.

### Correções e testes feitos

- `backend/app/services/recurrence_service.py`: a geração mensal confere o vencimento real contra `start_date` e `end_date`. Isso evita lançamentos datados antes do início ou depois do fim, inclusive em meses com menos de 31 dias.
- `backend/app/jobs/scheduler.py`: o aviso de vencimento usa a próxima data devida quando o dia deste mês já passou, inclusive na virada do ano, e ignora vencimentos fora do intervalo da recorrência.
- `backend/app/api/v1/categories.py`: exclusão de categoria vinculada a gasto fixo ou meta retorna `409` com instrução de reatribuição/remoção. Antes, a exclusão podia resultar em erro de integridade do banco.
- `backend/app/api/v1/transactions.py` e `backend/app/services/goal_service.py`: ao editar uma transação, o alerta de meta considera a categoria, o mês e a moeda anteriores. A troca de categoria ou moeda pode disparar corretamente o aviso quando o limite é cruzado. A listagem usa ID como desempate final da ordenação para estabilizar a paginação.
- `backend/app/services/exchange_rate_service.py`: conversão de valor zero retorna zero sem consultar o provedor de câmbio; isso evita dependência de rede ao mover uma transação de categoria quando a contribuição anterior para a meta é zero.
- `backend/tests/test_api.py`: passou de 6 para 12 cenários. Foram acrescentados testes de limites da recorrência, valor futuro e histórico, notificação de vencimento e preferências, vínculos de categoria, isolamento entre contas, alerta após edição, filtros combinados, distribuição e totais do dashboard, troca da moeda padrão com novo total, exclusão com recálculo, cadastro inválido e reversão pago/pendente pela API.
- `frontend/src/features/categories/CategoriesPage.tsx`: categorias mostram o ícone configurado; antes todas usavam o ícone genérico. Cor e ícone foram conferidos no navegador.
- `frontend/src/features/dashboard/DashboardPage.tsx`: o título “Metas deste mês” explicita que o progresso mensal das metas é independente do período escolhido para cards e gráficos.
- `frontend/src/features/transactions/TransactionsPage.tsx` e `frontend/src/lib/format.ts`: o resumo do histórico não soma mais BRL, USD e EUR sem conversão; mostra subtotais separados por moeda, com exatamente duas casas decimais. Mensagens de loading e erro de marcação de pagamento foram adicionadas.
- `frontend/src/features/categories/CategoriesPage.tsx`, `frontend/src/features/fixed-expenses/FixedExpensesPage.tsx`, `frontend/src/features/goals/GoalsPage.tsx` e `frontend/src/features/dashboard/DashboardPage.tsx`: consultas e ações assíncronas agora exibem texto de progresso quando necessário.
- `frontend/e2e/vault.spec.ts`: agora tem 5 cenários. O primeiro confirma redirecionamento sem sessão, validação de valor/categoria da transação, moedas BRL/USD/EUR, persistência do perfil após recarga, gasto fixo criar/editar/desativar/reativar, meta criar/estourar/editar/excluir, proteção visual de categoria do sistema, ícone/cor de categoria customizada e layout de tablet (768 × 1024), além do fluxo de desktop/mobile existente. O segundo prepara 12 lançamentos e confirma paginação, filtros combinados, ordenação por data/valor e dashboard com duas categorias e datas. O terceiro confirma `Pendente → Pago → Pendente` visualmente com respostas de rede simuladas; a API real foi testada separadamente. O quarto verifica erro de rede compreensível; o quinto verifica subtotais e formatação BRL/USD/EUR. Captura gerada: `test-results/dashboard-tablet.png` (inspecionada visualmente).
- `docs/06-checklist-testes-qa.md` e `docs/07-relatorio-qa.md`: status local e evidências atualizados. Entrega real de e-mail, HTTPS e verificações visuais ainda não exercitadas continuam pendentes.

### Resultado da última rodada

- Backend: `python -m pytest -q` — 12 aprovados; 2 avisos de depreciação de dependências.
- Backend: `python -m ruff check .` — aprovado.
- Frontend: `npm run lint -- --quiet` — aprovado.
- Frontend: `npm run build` — aprovado; aviso de chunk JS de aproximadamente 889 kB antes de gzip.
- Frontend: `npm run test:e2e` — 5 cenários aprovados em Chromium, sem erros de console no fluxo principal; desktop, 390 × 844 e 768 × 1024.

Para o E2E foi criada uma base local ignorada pelo Git em `backend/qa-session.db`, com `DATABASE_URL=sqlite+aiosqlite:///./qa-session.db`; ela contém somente contas e transações fictícias de QA. Os servidores locais usaram as portas 8000 e 5173 e foram encerrados ao fim da sessão. O projeto ainda possui muitas alterações prévias não commitadas; não fazer reset ou limpeza geral sem revisar `git status --short`.

### Próxima verificação sugerida

Se for necessária uma validação integrada de pago/pendente, executar o job real de recorrência e repetir a marcação no navegador; os testes atuais cobrem API real e interface simulada separadamente. Executar o roteiro de 10 passos da seção 12 da checklist. O item sobre metas acompanharem o período do dashboard conflita com a definição mensal de RF23/RF31; elas estão rotuladas como “Metas deste mês” e permanecem no mês corrente. Em produção, confirmar entrega real de e-mails, HTTPS, scheduler ativo, acesso à Frankfurter, expiração temporal da sessão e carga de 10.000 transações. Não declarar esses itens como validados até haver evidência do ambiente publicado.

## Como retomar

1. Ler `docs/06-checklist-testes-qa.md` e `docs/07-relatorio-qa.md`.
2. Conferir o estado local com `git status --short` antes de editar; as alterações desta rodada ainda podem não estar commitadas.
3. Subir o backend:

   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   $env:DATABASE_URL = "sqlite+aiosqlite:///./fintrack.db"
   uvicorn app.main:app --reload
   ```

4. Em outro terminal, subir o frontend:

   ```powershell
   cd frontend
   npm run dev
   ```

5. Rodar a verificação completa:

   ```powershell
   cd backend
   .\.venv\Scripts\python.exe -m ruff check .
   .\.venv\Scripts\python.exe -m pytest -q

   cd ..\frontend
   npm run lint -- --quiet
   npm run build
   npm run test:e2e
   ```

Endereços locais usados nesta revisão:

- Aplicação: `http://127.0.0.1:5173/`
- API: `http://127.0.0.1:8000/`
- Documentação interativa da API: `http://127.0.0.1:8000/docs`

## Configuração local e segredos

- `backend/.env` e `frontend/.env` são arquivos locais e estão ignorados pelo Git.
- Não copiar valores secretos para documentação ou commits.
- O `backend/.env` atual aponta para PostgreSQL, mas o driver `asyncpg` instalado localmente falhou ao carregar. Nesta revisão o backend foi iniciado com a variável `DATABASE_URL` temporariamente apontada para SQLite, como no comando acima.
- Para retomar com PostgreSQL, reinstalar um build de `asyncpg` compatível com o Python 3.12 e confirmar que o serviço PostgreSQL está disponível.
- Para entrega real do e-mail de recuperação, configurar a chave e o remetente/domínio verificado do Resend.
- O banco SQLite local, a virtualenv, resultados de teste, builds, perfis temporários do Chromium e `*.egg-info` também estão ignorados.

## Pendências que exigem produção ou decisão do usuário

- Validar HTTPS e o certificado no domínio final.
- Confirmar recebimento real do e-mail de recuperação e a reputação antispam do domínio.
- Ativar `SCHEDULER_ENABLED=true` no processo escolhido para executar jobs.
- Confirmar acesso de rede à Frankfurter no ambiente publicado.
- Validar expiração da sessão pelo tempo real configurado.
- Executar teste de carga com 10.000 transações por usuário.
- Se performance de carregamento virar prioridade, dividir o bundle do frontend; o build atual gera um chunk de aproximadamente 885 kB antes de gzip.
- Instalar Bash e um conversor SVG compatível apenas se forem necessários arquivos PNG da marca; o app consome SVG diretamente.

## Documentos relacionados

- `docs/06-checklist-testes-qa.md`: checklist original.
- `docs/07-relatorio-qa.md`: resultado de QA e limites da validação local.
- `docs/CHANGELOG-TECNICO.md`: histórico técnico resumido.
- `logos/preview.html`: comparação visual dos conceitos de logo.
