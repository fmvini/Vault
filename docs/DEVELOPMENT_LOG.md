## 2026-10-03 — Validação final e commit local do preview

### Implementado
- Revisão e registro da implementação de preview em uma única unidade lógica de commit local, conforme solicitação após alteração das permissões.
- Build oficial do frontend executado com sucesso, substituindo a pendência de compilação da etapa anterior.

### Arquivos principais alterados
- `docs/DEVELOPMENT_LOG.md` e os arquivos de implementação, testes e README listados na entrada anterior.

### Decisões técnicas
- A escrita no Git e os subprocessos de build/testes continuam bloqueados no sandbox; a execução autorizada fora dele permitiu concluir as verificações e o commit.
- Artefatos gerados pelo build, bancos de teste e arquivos de cache não integram o commit. Nenhum push ou deploy foi realizado.

### Estado atual
- Suíte completa do backend: 51 testes aprovados e 10 skips previstos (oito casos PostgreSQL sem URL de teste configurada e dois casos de concorrência que não se aplicam ao SQLite); dois avisos de depreciação de dependências.
- Ruff e ESLint aprovados. `npm run build` aprovado, com 2.350 módulos compilados e apenas o aviso de chunk JavaScript acima de 500 kB.
- A validação PostgreSQL da etapa anterior permanece registrada abaixo. A suíte Playwright completa e os smoke tests em produção ainda estão pendentes.

### Próximos passos
- Executar os E2E de preview e login com frontend/API isolados do Vault e permissões para subprocessos.
- Aplicar a migração `20261003_0003` antes de publicar a API; publicar API antes do frontend e testar `/preview` e o login normal em produção.
- Fazer push somente quando solicitado pelo usuário.

## 2026-10-03 — Preview público isolado para recrutadores

### Implementado
- Rota `/preview` e subrotas com acesso sem login manual às telas existentes, usando API real e dados fictícios exclusivos por visitante.
- Sessão de 30 minutos criada por `POST /api/v1/preview/session`, com token JWT de tipo `preview`, resposta sem cache e expiração persistida no banco, validada a cada acesso.
- Seed privado: 12 categorias, 42 transações em três meses, três gastos fixos, três limites e três metas de poupança com cinco movimentos consistentes.
- CRUD financeiro reutilizado; banner de demonstração, restauração, saída, recarga/deep links, erros de inicialização e expiração. Perfil/notificações ficam somente leitura.
- Sessão, HTTP, cache React Query e preferência de tema separados da conta real. Consultas financeiras aceitam cancelamento ao trocar/restaurar sessões.
- Tema claro escolhido no preview também persiste após recarga quando a conta normal prefere tema escuro.
- Contas preview bloqueadas em login, recuperação e redefinição de senha; domínio fictício reservado; notificações desativadas e jobs ignoram visitantes.
- Limpeza transacional limitada de visitantes expirados e filhos, com `SKIP LOCKED` no PostgreSQL; acionada na criação de preview e no job de recorrência.
- Fixture de API limpa os dados entre cenários, corrigindo falha preexistente na contagem de recorrências causada por contas de testes anteriores.

### Arquivos principais alterados
- `backend/app/api/v1/preview.py`, `backend/app/api/v1/auth.py`, `backend/app/core/deps.py`, `backend/app/core/security.py`, `backend/app/main.py`, `backend/app/schemas/api.py`.
- `backend/app/models/entities.py`, `backend/app/db/preview.py`, `backend/alembic/versions/20261003_0003_preview_expiration.py`.
- `backend/app/jobs/scheduler.py`, `backend/app/services/recurrence_service.py`.
- `backend/tests/conftest.py`, `backend/tests/test_preview.py`, `backend/tests/test_preview_db.py`, `backend/tests/test_preview_jobs.py`.
- `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/components/AppShell.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/workspace.tsx`, `frontend/src/lib/queryClient.ts`.
- `frontend/src/features/preview/PreviewLayout.tsx`, `frontend/src/features/preview/PreviewBanner.tsx`, `frontend/src/features/preview/store.ts`, `frontend/src/features/preview/preview.css`.
- `frontend/src/features/dashboard/DashboardPage.tsx`, `frontend/src/features/transactions/TransactionsPage.tsx`, `frontend/src/features/categories/CategoriesPage.tsx`, `frontend/src/features/fixed-expenses/FixedExpensesPage.tsx`, `frontend/src/features/goals/GoalsPage.tsx`, `frontend/src/features/savings-goals/SavingsGoalsPage.tsx`, `frontend/src/features/settings/SettingsPage.tsx`.
- `frontend/e2e/preview.spec.ts`, `README.md`.

### Decisões técnicas
- A coluna nullable/indexada `User.preview_expires_at` distingue visitantes de contas normais; não se inferem permissões pelo domínio de e-mail ou por senha.
- Cada sessão usa conta exclusiva com senha aleatória desconhecida, descartada depois do hash. Não se expõem credenciais nem se compartilham contas/dados entre recrutadores.
- Helpers do banco fazem flush sem commit; o endpoint valida o contrato e confirma seed/limpeza em uma única transação.
- Expiração não depende de remoção física ou scheduler. A limpeza remove filhos explicitamente também quando SQLite não aplica foreign keys.
- A migração inicial usa metadados ORM atuais; a revisão `0003` verifica coluna/índice existentes para funcionar tanto em bancos novos quanto em instalações na revisão `0002`.
- Nenhuma dependência, migração automática de produção ou configuração de hospedagem foi adicionada. A API atualizada e a migração são necessárias antes de publicar o frontend.

### Estado atual
- Maestro repetiu os 37 testes de API/configuração/e-mail/jobs, incluindo 16 novos de preview: todos aprovados; Ruff completo, ESLint quiet e TypeScript aprovados. Dois avisos de depreciação vêm de dependências de testes.
- Agente Banco de Dados reportou 22 testes aprovados e dois skips previstos (concorrência PostgreSQL não se aplica ao SQLite), com SQLite FK ON/OFF e PostgreSQL 18 isolado com TLS. Confirmou fresh upgrade, downgrade/upgrade preservando conta normal, `alembic check`, índice e revisão. Nenhum dado ou segredo de produção foi usado.
- Maestro aplicou `upgrade head` em SQLite descartável e PostgreSQL descartável e confirmou TLS no PostgreSQL. A primeira inspeção de `/preview` no navegador carregou o seed do PostgreSQL pela API.
- QA adicional pelo portal Maestri, com bundle local compilado diretamente por esbuild/Tailwind e SQLite isolado: transação de R$ 123,45 salva e retornada pela API, dashboard recalculado, navegação em todas as telas, configurações desabilitadas, restauração com nova sessão e ausência da transação antiga, sem token normal no localStorage e sem erros JS observados. Viewport mobile 390px sem overflow horizontal.
- Cadastro/login automático de uma conta normal também passou pelo navegador; ao abrir preview, nome/token da conta normal permaneceram intactos e o retorno restaurou a conta correta. Expiração armazenada no cliente foi exercitada por recarga, exibindo a tela de reinício; expiração real no servidor é coberta pelos testes de API.
- Tema foi verificado no bundle atualizado: preview claro com preferência da conta escura, seguido de retorno à conta com o tema escuro preservado.
- Build oficial Vite e execução dos oito cenários Playwright de preview estão pendentes: o sandbox bloqueou subprocessos com `spawn EPERM`. O bundle alternativo verifica a interface, mas não substitui o build oficial nem a suíte E2E.
- Tentativa do Maestro de repetir a suíte de persistência foi bloqueada por permissões nas pastas temporárias do pytest; usar ambiente com permissões adequadas. A evidência de persistência aprovada é a execução reportada pelo agente Banco de Dados.
- Relatórios mantém o placeholder anterior; não foi implementado relatório financeiro novo. Novas recorrências do preview não são geradas pelos jobs, que excluem visitantes; o seed fornece lançamentos recorrentes para demonstração.
- Nenhum deploy ou push foi realizado. A publicação e o smoke test em Vercel/Supabase ainda não foram executados nesta tarefa.
- Commit local tentado após revisão e testes, mas `git add` foi bloqueado por `Permission denied` ao criar `.git/index.lock`. Nenhum arquivo foi staged e nenhum commit desta tarefa foi criado; os arquivos revisados permanecem na árvore de trabalho.

### Próximos passos
- Em ambiente que permita subprocessos, executar `npm run build` e `npm run test:e2e -- e2e/preview.spec.ts` apontando `E2E_BASE_URL`/`E2E_API_BASE_URL` para servidores isolados do Vault. Executar também a suíte de login existente com servidores nas URLs configuradas para ela.
- A etapa de revisão e commit local foi retomada após ajuste de permissões; consultar a entrada mais recente deste arquivo.
- Antes do deploy da API, aplicar `python -m alembic upgrade head` com a URI de migração de produção; confirmar revisão `20261003_0003`.
- Publicar API, depois frontend, mantendo `VITE_DEMO_MODE=false`, URL real da API e origem frontend correta em `FRONTEND_URL`.
- Testar `/preview` e uma subrota aberta diretamente em produção, criar/editar transação, conferir dashboard, restaurar demonstração, testar conta normal e confirmar expiração/isolamento. Só depois compartilhar o link publicado com recrutadores.
