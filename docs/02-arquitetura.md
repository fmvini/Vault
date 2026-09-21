# Arquitetura do Projeto

## 1. Visão Geral da Arquitetura

Arquitetura **cliente-servidor desacoplada**, com frontend SPA (Single Page Application) em React consumindo uma API REST em FastAPI (Python), banco de dados PostgreSQL, e serviços externos para e-mail e taxa de câmbio.

```
┌─────────────────────┐         HTTPS/REST          ┌──────────────────────┐
│   Frontend (React)  │ ───────────────────────────► │   Backend (FastAPI)  │
│   Vite + TypeScript │ ◄─────────────────────────── │   Python              │
│   Hospedado: Vercel │           JSON                │  Hospedado: Railway/ │
└─────────────────────┘                               │  Render               │
                                                       └──────────┬────────────┘
                                                                  │
                                  ┌───────────────────────────────┼───────────────────────┐
                                  │                                │                        │
                                  ▼                                ▼                        ▼
                        ┌──────────────────┐          ┌────────────────────┐    ┌──────────────────────┐
                        │   PostgreSQL      │          │  Provedor de Email  │    │  API de Câmbio        │
                        │   (Supabase)      │          │  (ex: Resend)       │    │  (ex: exchangerate-   │
                        └──────────────────┘          └────────────────────┘    │   api.com)            │
                                                                                  └──────────────────────┘
```

## 2. Stack Tecnológica Detalhada

### 2.1 Frontend
- **Framework**: React 18+
- **Linguagem**: TypeScript
- **Build tool**: Vite
- **Roteamento**: React Router
- **Gerenciamento de estado do servidor**: TanStack Query (React Query) — para cache e sincronização com a API
- **Gerenciamento de estado local/UI**: Context API ou Zustand (preferir Zustand para estados mais complexos, ex: filtros do dashboard)
- **Estilização**: Tailwind CSS
- **Componentes de gráfico**: Recharts
- **Formulários e validação**: React Hook Form + Zod
- **Cliente HTTP**: Axios (ou fetch nativo com wrapper próprio)

### 2.2 Backend
- **Framework**: FastAPI
- **Linguagem**: Python 3.11+
- **ORM**: SQLAlchemy 2.x (async)
- **Validação de dados**: Pydantic v2 (nativo do FastAPI)
- **Migrations**: Alembic
- **Autenticação**: JWT (biblioteca `python-jose` ou `pyjwt`), senhas com `passlib[bcrypt]`
- **Agendamento de tarefas (jobs recorrentes)**: APScheduler (para geração mensal de gastos fixos e verificação de vencimentos), rodando como processo dentro da própria aplicação ou como serviço separado, dependendo da carga (decisão pode ser revisada — ver seção 5).
- **Servidor ASGI**: Uvicorn (com Gunicorn como process manager em produção)

### 2.3 Banco de Dados
- **SGBD**: PostgreSQL 15+
- **Hospedagem**: Supabase (usado apenas como banco de dados gerenciado — a autenticação e outras features do Supabase NÃO serão usadas neste projeto, para manter a lógica de autenticação sob controle total do backend FastAPI)

### 2.4 Serviços Externos
- **E-mail transacional**: Resend (recomendado pela simplicidade de integração via API HTTP) ou SendGrid como alternativa.
- **Taxas de câmbio**: exchangerate-api.com (ou similar com camada gratuita) — taxas atualizadas e cacheadas localmente (ex: atualização diária) para evitar excesso de chamadas.

### 2.5 Infraestrutura e Deploy
- **Frontend**: Vercel (deploy automático a partir do repositório Git)
- **Backend**: Railway ou Render (deploy automático a partir do repositório Git, com variáveis de ambiente configuradas na plataforma)
- **Banco de dados**: Supabase (instância gerenciada de PostgreSQL)
- **Controle de versão**: Git, com repositório único (monorepo) contendo `/frontend` e `/backend` como pastas separadas, ou dois repositórios separados (decisão registrada em `05-guia-para-agente-ia.md` — recomendação: monorepo para simplicidade no MVP).

## 3. Estrutura de Pastas Recomendada

### 3.1 Monorepo (raiz do projeto)
```
/
├── frontend/
├── backend/
├── docs/                  <- esta pasta de documentação
└── README.md
```

### 3.2 Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── components/        # componentes reutilizáveis (Button, Card, Modal, etc.)
│   ├── features/          # organização por funcionalidade (transactions, dashboard, fixed-expenses, goals, auth)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── fixed-expenses/
│   │   ├── categories/
│   │   └── goals/
│   ├── hooks/              # hooks customizados compartilhados
│   ├── lib/                # cliente axios, utilitários, formatadores
│   ├── types/              # tipos TypeScript compartilhados
│   ├── routes/             # definição de rotas
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

### 3.3 Backend (`/backend`)
```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── transactions.py
│   │   │   ├── fixed_expenses.py
│   │   │   ├── categories.py
│   │   │   ├── goals.py
│   │   │   └── dashboard.py
│   ├── core/                # config, segurança, dependências (get_current_user, etc.)
│   ├── models/              # modelos SQLAlchemy
│   ├── schemas/             # schemas Pydantic (request/response)
│   ├── services/            # lógica de negócio (recurrence_service, goal_service, email_service, exchange_rate_service)
│   ├── jobs/                # tarefas agendadas (scheduler)
│   ├── db/                  # sessão do banco, base declarativa
│   └── main.py
├── alembic/                 # migrations
├── tests/
├── requirements.txt (ou pyproject.toml, se usar Poetry/uv)
└── .env.example
```

## 4. Fluxos Técnicos Importantes

### 4.1 Autenticação
1. Usuário faz login (`POST /api/v1/auth/login`) com e-mail/senha.
2. Backend valida credenciais, gera JWT (access token) e retorna ao frontend.
3. Frontend armazena o token (recomendação: em memória + refresh token em cookie httpOnly, para mitigar XSS; alternativa mais simples para o MVP: localStorage, com ciência do trade-off de segurança).
4. Toda requisição subsequente inclui o token no header `Authorization: Bearer <token>`.
5. Backend valida o token em cada requisição via dependency do FastAPI (`get_current_user`).

### 4.2 Geração de Gastos Fixos Recorrentes
1. Um job agendado (APScheduler) roda diariamente (ou no dia 1 de cada mês, conforme regra de negócio) verificando gastos fixos ativos de todos os usuários.
2. Para cada gasto fixo ativo cujo lançamento do mês corrente ainda não foi gerado, o sistema cria uma nova transação do tipo "gasto", vinculada ao `fixed_expense_id`.
3. O job também verifica gastos fixos com vencimento próximo (ex: 3 dias) e dispara e-mail de aviso.

### 4.3 Verificação de Metas
1. Sempre que uma transação do tipo "gasto" é criada ou atualizada, o backend recalcula o total gasto na categoria correspondente dentro do mês corrente.
2. Se o total ultrapassar o limite definido na meta daquela categoria, o sistema dispara um e-mail de alerta (respeitando as preferências de notificação do usuário) e marca a meta como "estourada" para exibição no dashboard.

### 4.4 Conversão de Moeda para Dashboard
1. O sistema mantém uma tabela local de taxas de câmbio, atualizada periodicamente (ex: 1x por dia) via job agendado que consulta a API externa de câmbio.
2. Ao calcular totais consolidados no dashboard, transações em moeda diferente da moeda padrão do usuário são convertidas usando a taxa mais recente disponível.

## 5. Decisões em Aberto (a resolver durante a implementação)

Estas decisões não bloqueiam o início da implementação, mas devem ser resolvidas pelo agente de IA no momento oportuno, e **documentadas no changelog técnico** (ver `05-guia-para-agente-ia.md`):

- Se o scheduler (APScheduler) roda embutido no mesmo processo da API ou como um serviço/worker separado (recomendação inicial: embutido, migrar para separado apenas se houver problema de performance).
- Estratégia exata de armazenamento do JWT no frontend (localStorage vs. cookie httpOnly) — recomendação: começar com localStorage para simplicidade no MVP, com plano de migração documentado.
- Se o monorepo terá CI/CD unificado ou pipelines separados por pasta.

## 6. Variáveis de Ambiente Esperadas (exemplo)

### Backend (`.env`)
```
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
EMAIL_PROVIDER_API_KEY=
EXCHANGE_RATE_API_KEY=
FRONTEND_URL=https://seuapp.vercel.app
```

### Frontend (`.env`)
```
VITE_API_BASE_URL=https://seuapp-api.up.railway.app/api/v1
```
