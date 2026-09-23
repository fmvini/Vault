# Vault

Vault é uma aplicação web de finanças pessoais para registrar receitas e gastos, acompanhar o orçamento e planejar despesas recorrentes. Cada pessoa usa sua própria conta e visualiza apenas os próprios dados.

O projeto é um monorepo com uma interface React e uma API FastAPI. O frontend usa a API real por padrão; os dados ficam no banco configurado para o backend.

**Ambiente online:** [abrir o Vault](https://vault-web-alpha.vercel.app) · [saúde da API](https://vault-api-khaki.vercel.app/health) · [documentação da API](https://vault-api-khaki.vercel.app/docs). O banco de produção é PostgreSQL no Supabase. O envio real de e-mails ainda depende de um domínio remetente verificado no Resend.

## O que o aplicativo oferece

- **Contas e perfil:** cadastro, login, logout, redefinição de senha e escolha da moeda padrão.
- **Transações:** receitas e gastos em BRL, USD ou EUR, com edição, exclusão, busca, filtros, ordenação e paginação.
- **Categorias:** opções padrão protegidas e categorias personalizadas com nome, tipo, cor e ícone.
- **Gastos fixos:** cadastro e edição de recorrências, geração mensal de transações por job, data final, desativação e status pago/pendente.
- **Metas mensais:** limite por categoria, acompanhamento do progresso e alerta quando o gasto ultrapassa o valor definido.
- **Dashboard:** receitas, gastos e saldo por período, evolução temporal, distribuição por categoria e conversão para a moeda padrão.
- **Notificações:** preferências para e-mails de meta ultrapassada e de gasto fixo próximo do vencimento.
- **Interface responsiva:** layouts para desktop, tablet e smartphone, com tema claro e escuro.

## Tecnologias e estrutura

| Parte | Tecnologias principais |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query, Recharts |
| Backend | Python, FastAPI, SQLAlchemy assíncrono, Pydantic, Alembic |
| Banco | SQLite para desenvolvimento local; PostgreSQL no Supabase para produção |
| Serviços externos | Resend para e-mail e Frankfurter para câmbio |
| Testes | Pytest e Ruff no backend; ESLint, build TypeScript e Playwright no frontend |

```text
backend/   API, modelos, migrações, jobs e testes
frontend/  aplicação React, assets SVG e testes E2E
docs/      requisitos, arquitetura, API e relatórios de QA
logos/     conceitos e arquivos vetoriais da marca
```

## Executar localmente com SQLite

Requisitos: **Python 3.11 ou superior**, **Node.js com npm** e Git. O SQLite já é suportado pelo backend; Docker e PostgreSQL não são necessários para começar.

Os dois arquivos `.env.example` já vêm configurados para `127.0.0.1`, API real e SQLite. Copie cada um para `.env` e substitua `JWT_SECRET_KEY` por um valor longo e aleatório, mesmo no ambiente local.

### 1. Inicie a API

No **PowerShell**, a partir da raiz do repositório:

```powershell
cd backend
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

No **macOS ou Linux**:

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Em `ENVIRONMENT=development`, a API cria as tabelas ausentes e cadastra as categorias padrão ao iniciar. O arquivo do banco local fica em `backend/fintrack.db` e é ignorado pelo Git.

### 2. Inicie o frontend

Em **outro terminal**, a partir da raiz do repositório:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

No macOS ou Linux, troque `Copy-Item .env.example .env` por `cp .env.example .env`.

- Aplicação: <http://127.0.0.1:5173/>
- API: <http://127.0.0.1:8000/>
- Documentação interativa da API: <http://127.0.0.1:8000/docs>
- Verificação de saúde: <http://127.0.0.1:8000/health>

Abra a aplicação, crie uma conta e registre uma transação para ver os dados no dashboard. O modo demonstração é opcional: somente `VITE_DEMO_MODE=true` o ativa.

## Configuração

| Variável | Onde | Para que serve |
| --- | --- | --- |
| `DATABASE_URL` | `backend/.env` | Conexão SQLite ou PostgreSQL. |
| `ENVIRONMENT` | `backend/.env` | Em `development`, cria tabelas e categorias padrão na inicialização. |
| `JWT_SECRET_KEY` | `backend/.env` | Assina os tokens de acesso e de redefinição de senha. Defina um segredo próprio. |
| `JWT_EXPIRATION_MINUTES` | `backend/.env` | Tempo de validade do token de acesso; padrão de 60 minutos. |
| `FRONTEND_URL` | `backend/.env` | Origem permitida pelo CORS e base do link de redefinição de senha. |
| `EMAIL_PROVIDER_API_KEY` e `EMAIL_FROM` | `backend/.env` | Habilitam o envio real via Resend; o remetente precisa pertencer a um domínio verificado. |
| `SCHEDULER_ENABLED` | `backend/.env` | Ativa os jobs de recorrência, aviso de vencimento e atualização de câmbio. |
| `CRON_SECRET` | Ambiente da API na Vercel | Protege os endpoints chamados pelos cron jobs da Vercel. |
| `VITE_API_BASE_URL` | `frontend/.env` | Endereço da API, incluindo `/api/v1`. |
| `VITE_DEMO_MODE` | `frontend/.env` | Ativa explicitamente o modo demonstração quando vale `true`. |

Mantenha os arquivos `.env` fora do Git. Sem chave do Resend, a aplicação funciona localmente, mas não entrega e-mails. A conversão entre moedas consulta a API pública Frankfurter sob demanda e guarda as taxas no banco; ela depende de acesso à rede quando ainda não existe uma taxa em cache.

Um gasto fixo cadastrado **não gera imediatamente** uma transação. O job de recorrência cria o lançamento do mês quando o scheduler está ativo e o job executa. Para habilitá-lo, defina `SCHEDULER_ENABLED=true` no processo responsável pelos jobs. Evite iniciar múltiplos schedulers para a mesma implantação.

## Publicar com Vercel e Supabase

Crie **dois projetos Vercel** a partir deste repositório: um com Root Directory `backend` (FastAPI) e outro com Root Directory `frontend` (Vite). O `backend/vercel.json` configura três cron jobs diários, em UTC, e o `frontend/vercel.json` permite abrir rotas da aplicação diretamente no navegador. Na Vercel, os cron jobs só executam em produção; no plano Hobby, podem iniciar em qualquer momento da hora programada.

O banco deve ser um projeto PostgreSQL no Supabase. Em **Connect**, use a URI do **Transaction pooler** (porta 6543) para a API e troque apenas o prefixo `postgresql://` por `postgresql+psycopg://`. A API usa uma conexão por instância, SSL obrigatório e desativa prepared statements do Psycopg. Para rodar Alembic, prefira a conexão **Direct**; se a rede local não tiver IPv6, use o **Session pooler** (porta 5432). Também troque o prefixo para `postgresql+psycopg://`. Guarde as URIs como segredos: nenhuma delas deve ir para o Git ou para o frontend.

Antes do primeiro acesso à API, em `backend/`, defina temporariamente `DATABASE_URL` com a URI de migração e execute `python -m alembic upgrade head` em um ambiente com as dependências do `pyproject.toml` instaladas. Para esse comando local, deixe `ENVIRONMENT=development`; ele só executa a migração e não inicia o servidor. Isso cria as tabelas, a tabela de versão do Alembic e as categorias do sistema. `ENVIRONMENT=production` não cria tabelas na inicialização.

Variáveis do **projeto da API** na Vercel, para o ambiente Production:

| Nome | Valor esperado |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | URI `postgresql+psycopg://` do Transaction pooler do Supabase |
| `JWT_SECRET_KEY` | Segredo aleatório longo e exclusivo da produção |
| `FRONTEND_URL` | URL HTTPS final do projeto frontend, sem barra final |
| `SCHEDULER_ENABLED` | `false` (os agendamentos são os cron jobs da Vercel) |
| `CRON_SECRET` | Outro segredo aleatório, com pelo menos 16 caracteres |
| `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` | Configure quando houver domínio remetente verificado no Resend |

Variáveis do **projeto frontend** na Vercel, para Production:

| Nome | Valor esperado |
| --- | --- |
| `VITE_API_BASE_URL` | URL HTTPS final da API com `/api/v1`, sem barra final |
| `VITE_DEMO_MODE` | `false` |

Depois de configurar as variáveis, publique ambos os projetos e teste `https://<api>/health`, cadastro, login e criação de uma transação em `https://<frontend>`. Confirme a URL final do frontend em `FRONTEND_URL` e faça um novo deploy da API se ela mudou. Os endpoints de jobs exigem `Authorization: Bearer <CRON_SECRET>`; a Vercel inclui esse cabeçalho automaticamente quando a variável `CRON_SECRET` existe no projeto da API. Não ative `SCHEDULER_ENABLED` na função serverless.

Sem domínio remetente verificado, deixe `EMAIL_PROVIDER_API_KEY` vazio. O aplicativo abre, mas não entrega recuperação de senha nem alertas por e-mail; esses itens devem continuar pendentes no QA até um teste real de recebimento.

### PostgreSQL opcional

O `docker-compose.yml` sobe **somente o banco PostgreSQL**, não a aplicação completa:

```bash
docker compose up -d db
```

Depois, ajuste `backend/.env`:

```dotenv
DATABASE_URL=postgresql+asyncpg://fintrack:fintrack@localhost:5432/fintrack
```

Para criar ou atualizar o esquema com Alembic, execute em `backend/`:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

No macOS ou Linux, use `.venv/bin/python -m alembic upgrade head`.

Em implantação com `ENVIRONMENT=production`, as tabelas não são criadas automaticamente: rode as migrações antes de iniciar a API. O ambiente local usado no QA foi SQLite; o handoff registra uma incompatibilidade do `asyncpg` instalado naquele Windows com Python 3.12.

## Testes e qualidade

No diretório `backend/`:

```powershell
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest -q
```

No macOS ou Linux, use `.venv/bin/python` no lugar de `.\.venv\Scripts\python.exe`.

No diretório `frontend/`:

```bash
npm run lint -- --quiet
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes E2E **não iniciam os servidores**: mantenha API e frontend rodando nas portas 8000 e 5173 antes de executar `npm run test:e2e`. Na última revisão documentada, passaram 15 testes de backend e 5 cenários E2E em Chromium. Consulte o [relatório de QA](docs/07-relatorio-qa.md) para os cenários e limites da validação.

## Documentação e estado do projeto

- [Requisitos](docs/01-requisitos.md), [arquitetura](docs/02-arquitetura.md), [modelo de dados](docs/03-modelo-de-dados.md) e [API](docs/04-especificacao-api.md).
- [Checklist de QA](docs/06-checklist-testes-qa.md) e [relatório de QA](docs/07-relatorio-qa.md).
- [Handoff para a próxima sessão](docs/08-handoff-proxima-sessao.md) e [changelog técnico](docs/CHANGELOG-TECNICO.md).
- [Prévia dos conceitos de logo](logos/preview.html).

Na revisão de 23/09/2026, **62 de 70 itens** da checklist tinham evidência local ou de produção. O HTTPS, o banco Supabase, o fluxo principal da API e o acesso à Frankfurter foram validados no ambiente publicado. A entrega real de e-mails e a expiração da sessão pelo tempo configurado ainda precisam de validação. Consulte o relatório antes de considerar a aplicação pronta para produção.
