## 2026-10-10 — Aviso de cookies compacto e explicativo

### Implementado
- Reformulado o aviso com o título “Como usamos cookies” e explicação direta sobre armazenamento para sessão, tema e escolha de cookies, mantendo o link da política e a informação sobre ausência de publicidade/análise.
- Substituída a faixa inferior que ocupava a largura da página por um aviso no canto inferior esquerdo, limitado a 860 px, com espaçamento menor e os dois botões ao lado do texto em desktop.
- Em telas até 700 px, botões abaixo do texto; mantidos persistência, reabertura e controles equivalentes. Cor do texto explícita e foco contrastante nos temas claro/escuro.

### Arquivos principais alterados
- `frontend/src/features/legal/CookieBanner.tsx`.
- `frontend/src/features/legal/legal.css`.
- `frontend/e2e/legal.spec.ts`.
- `docs/DEVELOPMENT_LOG.md`.

### Decisões técnicas
- Texto fiel ao uso atual de localStorage/sessionStorage; nenhuma finalidade opcional nova nem alteração na versão ou no mecanismo de consentimento.
- Layout horizontal a partir de 701 px e vertical nas telas menores, preservando alvos de botão de pelo menos 44 px.

### Estado atual
- Build, ESLint, quatro testes de consentimento e oito cenários E2E legais aprovados. Persiste o aviso conhecido de bundle acima de 500 kB.
- Capturas verificadas em desktop 1440 px, tablet 768 px, mobile 390/320 px e viewport reduzido 720×450, com temas claro/escuro; nenhum overflow horizontal. Em desktop, aviso de 860×139 px com botões ao lado. Detector visual sem achados.
- A versão local exibe o texto; não foi confirmada a causa de sua ausência na visualização relatada pelo usuário. Publicação deste ajuste pendente.

### Próximos passos
- Quando solicitado, publicar o frontend com este ajuste e validar o aviso no domínio online, incluindo aceitar/rejeitar e reabrir pelo rodapé. A publicação coordenada dos aceites legais da API/frontend continua conforme o registro anterior; a migração remota já foi aplicada.

## 2026-10-10 — Migração de aceite aplicada ao PostgreSQL remoto

### Implementado
- Aplicada explicitamente a revisão Alembic `20261010_0004` ao PostgreSQL remoto do projeto Supabase, após autorização do usuário.
- Criadas `users.legal_version` (VARCHAR(32)) e `users.legal_accepted_at` (timestamp com timezone), ambas nullable e sem default ou preenchimento retroativo.

### Arquivos principais alterados
- `docs/DEVELOPMENT_LOG.md`.
- Migração existente executada, sem alteração do arquivo: `backend/alembic/versions/20261010_0004_legal_acceptance.py`.

### Decisões técnicas
- Utilizada `MIGRATION_DATABASE_URL` de `backend/.env.deploy.local`, via Session pooler na porta 5432; confirmado o mesmo host, banco e usuário da conexão de publicação. Credenciais e URLs não foram exibidas nem adicionadas ao Git.
- Executado `alembic upgrade 20261010_0004`, limitado à revisão solicitada, com TLS, DDL transacional, statement timeout de 30 segundos e lock timeout de 5 segundos.
- Verificações antes/depois em conexões somente leitura; nenhum servidor da aplicação foi iniciado e nenhum teste com dados sintéticos foi executado no banco remoto.

### Estado atual
- Precondição confirmada: revisão remota `20261003_0003`, sem as colunas de aceite.
- Upgrade concluído. Nova conexão confirmou revisão `20261010_0004`, os tipos, timezone, nulabilidade e ausência de defaults das colunas.
- A única conta normal existente foi preservada, com contagem e hash dos identificadores iguais antes/depois; nenhum aceite foi presumido ou preenchido.
- Banco preparado para a implementação do commit `81f0bb3`. Esta execução não publicou API/frontend nem enviou commits ao remoto.

### Próximos passos
- Publicar API e frontend do commit `81f0bb3` de forma coordenada quando solicitado; a migração do banco já está concluída.
- Após publicar, validar cadastro/login com os dois aceites, documentos legais, preferências de cookies, 404 e contato de suporte no domínio online.

## 2026-10-10 — Termos, privacidade, cookies, suporte e página 404

### Implementado
- Páginas públicas `/termos-de-uso`, `/politica-de-privacidade` e `/politica-de-cookies`, com conteúdo baseado nas funcionalidades, fornecedores e formas de armazenamento existentes.
- Dois aceites obrigatórios e inicialmente desmarcados no cadastro e no login; abertura dos documentos em outra aba preserva o formulário. Validação no frontend e na API de booleanos estritos e versão vigente `2026-10-10`.
- Registro da versão e do timestamp UTC do último aceite bem-sucedido em `users.legal_version` e `users.legal_accepted_at`; falhas de autenticação não atualizam o registro.
- Banner de cookies com explicação breve, aceitar/rejeitar opcionais com controles equivalentes, preferência persistida e versionada, reabertura pelo rodapé e aviso quando o navegador bloqueia a persistência.
- Política descreve localStorage/sessionStorage usados para sessão, perfil, tema, demonstração e escolha. Nenhum rastreador opcional foi adicionado; aceitar/rejeitar não controla o acesso à conta.
- Página 404 para URLs desconhecidas, preservando o endereço e oferecendo retorno ao login, à conta ou ao preview. URLs inexistentes de preview não iniciam sessão de demonstração.
- Suporte por `mailto:viniciusfmarrocos@gmail.com`, rodapé nas telas normais, autenticação, documentos, 404 e estados de carregamento/erro/expiração do preview.
- Testes de consentimento, API e E2E adicionados; chamadas de autenticação dos testes existentes atualizadas para o novo contrato.

### Arquivos principais alterados
- `frontend/src/features/legal/constants.ts`, `frontend/src/features/legal/cookieConsent.ts`, `frontend/src/features/legal/CookieBanner.tsx`, `frontend/src/features/legal/LegalFooter.tsx`, `frontend/src/features/legal/LegalPage.tsx`, `frontend/src/features/legal/NotFoundPage.tsx`, `frontend/src/features/legal/legal.css`.
- `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/components/AppShell.tsx`, `frontend/src/features/auth/AuthPage.tsx`, `frontend/src/features/auth/ResetPasswordPage.tsx`, `frontend/src/features/preview/PreviewLayout.tsx`.
- `backend/app/core/legal.py`, `backend/app/schemas/api.py`, `backend/app/api/v1/auth.py`, `backend/app/models/entities.py`, `backend/alembic/versions/20261010_0004_legal_acceptance.py`.
- `backend/tests/test_legal.py`, `backend/tests/test_api.py`, `backend/tests/test_preview.py`, `backend/tests/test_preview_db.py`, `backend/tests/test_preview_jobs.py`, `frontend/tests/cookieConsent.test.cjs`, `frontend/e2e/legal.spec.ts`, `frontend/e2e/vault.spec.ts`, `frontend/e2e/preview.spec.ts`, `frontend/package.json`.
- `README.md`, `docs/03-modelo-de-dados.md`, `docs/04-especificacao-api.md`, `docs/DEVELOPMENT_LOG.md`.

### Decisões técnicas
- Migração aditiva e nullable, sem preenchimento retroativo: contas antigas não recebem aceite presumido. O upgrade verifica colunas já presentes porque a migração inicial usa metadados ORM atuais. Não há histórico imutável de todos os aceites; o registro representa o mais recente.
- Aceite dos documentos e preferência de cookies são independentes; sessões já abertas não são invalidadas por esta implementação.
- `optionalCookiesAllowed()` permanece falso sem decisão ou após rejeição. Futuros rastreadores precisam consultar esse gate, atualizar política/versão e oferecer consentimento por finalidade antes de carregar; o aceite atual não autoriza novas finalidades.
- Preservados os tokens claros/escuros, Basic, Spline Sans Mono, marca e botões existentes. Corrigido o foco por teclado dos novos checkboxes com outline sólido contrastante em ambos os temas.
- Nenhuma dependência, alteração de infraestrutura, migração automática ou publicação foi executada.

### Estado atual
- Implementação concluída e validada localmente; publicação pendente. Build oficial `npm run build`, ESLint e Ruff passaram. Permanece o aviso conhecido de chunk JavaScript acima de 500 kB.
- `npm run test:consent`: quatro testes aprovados pelo runner Node, cobrindo decisão padrão, persistência, recarga, revogação, valores inválidos/antigos e armazenamento bloqueado.
- Pytest completo: 68 testes aprovados e 10 skips previstos (oito casos PostgreSQL sem URL de teste configurada e dois casos de concorrência específicos desse banco); dois avisos de depreciação de dependências.
- Migrações validadas com SQLite FK ON/OFF: banco novo, downgrade até `20260924_0002`, upgrade para `20261010_0004`, `alembic check`, preservação da conta sintética existente e campos de aceite nulos sem preenchimento retroativo.
- Playwright: 25 cenários aprovados em Chromium contra Vite/API reais em 5173/8000 e banco exclusivo `test-results/legal-e2e.db`, incluindo os oito novos cenários legais. Cenário de isolamento conta/preview repetido e aprovado após retirar campos desnecessários do payload de categoria.
- Capturas de desktop 1440px e mobile 390/320px, temas claro/escuro, em `.impeccable/review/legal/`: sete telas sem overflow horizontal nem erros JavaScript. Aceites required e desmarcados confirmados nas capturas. Revisão independente final: `ship`, sem defeito visual material; detector da skill nos novos componentes retornou lista vazia.
- Bloqueio de terminal da primeira rodada superado após a autorização adicional do usuário. Git diff/status revisados; implementação, testes e documentação constituem uma única unidade de commit local.
- A conexão padrão aponta para PostgreSQL remoto. A migração desse banco não foi aplicada nesta tarefa; nenhum push ou deploy foi executado.

### Próximos passos
- Antes da publicação, aplicar `python -m alembic upgrade head` ao PostgreSQL remoto pelo acesso de migração, confirmando revisão `20261010_0004` e preservação das contas. Os oito cenários PostgreSQL requerem banco descartável e URL explícita de testes.
- Publicar API e frontend com o novo contrato de aceite de forma coordenada, pois a API nova rejeita clientes antigos sem os dois aceites e a versão. Fazer push/deploy somente quando solicitado.
- Após publicar, validar cadastro/login, páginas legais, rejeição/recarga/reabertura de cookies, 404 e mailto de suporte no domínio online.

## 2026-10-03 — Preview recuperado em produção e acesso pelo login

### Implementado
- Link **Explorar demonstração** no canto superior direito do login, direcionando para `/preview` sem preencher credenciais; layout e navegação por teclado verificados em 1280, 390 e 320 px.
- Correção da saída do preview: o início automático ocorre na montagem da rota, evitando criar outra sessão quando a saída limpa o estado antes de concluir a navegação.
- Recuperação do preview publicado pela aplicação explícita da migração existente `20261003_0003` ao banco de produção.
- Teste do link de login, ajuste do seletor acessível de categoria e regressão que verifica ausência de bootstrap e token após sair da demonstração.

### Arquivos principais alterados
- `frontend/src/features/auth/AuthPage.tsx`, `frontend/src/feature.css`.
- `frontend/src/features/preview/PreviewLayout.tsx`, `frontend/e2e/preview.spec.ts`.
- `README.md`, `docs/DEVELOPMENT_LOG.md`.
- Migração existente aplicada: `backend/alembic/versions/20261003_0003_preview_expiration.py` (sem alteração do arquivo).

### Decisões técnicas
- Logs Vercel confirmaram `UndefinedColumn: users.preview_expires_at`: API nova publicada com banco ainda na revisão `20260924_0002`. O POST 500 sem cabeçalho CORS era consequência dessa exceção.
- Agente Banco de Dados aplicou somente `20261003_0003`, com precondições, TLS e limites de espera, em transação PostgreSQL. Coluna nullable sem default e índice válido foram confirmados por nova conexão somente leitura; a conta normal existente foi preservada.
- Nenhuma migração automática no startup, alteração de segredo ou novo deploy da API foi necessária. Cada agente manteve documentação e commit centralizados no Maestro, usando a skill Maestri.

### Estado atual
- Produção: POST `/api/v1/preview/session` 201 com `Cache-Control: no-store` e CORS da origem frontend; GET `auth/me`, categorias, transações e resumo do dashboard 200 usando exclusivamente sessão sintética própria. Seed de 42 transações confirmado.
- Maestro confirmou o POST publicado e verificou no portal o dashboard e as transações; abertura direta de `/preview/goals` em 390 px carregou três metas, sem overflow ou mensagem de indisponibilidade. Frontend, API e PostgreSQL estão se comunicando nesses fluxos verificados.
- Nove testes Playwright aprovados contra Vite real em 5191 e API SQLite isolada em 8014, incluindo CRUD, restauração, conta normal isolada, falha/retry, expiração e mobile. Dois cenários inicialmente falhos foram corrigidos e a suíte completa repetida com sucesso.
- ESLint e `npm run build` aprovados; permanece apenas o aviso conhecido de chunk JavaScript acima de 500 kB. Backend não sofreu alterações nesta etapa; sua suíte anterior permanece registrada abaixo.
- A recuperação do banco já está em produção. O botão de login e a correção de saída ainda dependem da publicação deste novo commit local. Nenhum push ou deploy foi executado pelos agentes nesta etapa.

### Próximos passos
- Após o push pelo usuário e deploy do frontend, abrir `/login`, acionar **Explorar demonstração** e confirmar a saída sem recriar sessão.
- Compartilhar `https://vault-web-alpha.vercel.app/preview`; manter a aplicação explícita de migrações antes de futuras publicações da API que alterem o schema.

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
