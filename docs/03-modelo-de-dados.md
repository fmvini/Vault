# Modelo de Dados

## 1. Diagrama de Entidades (visão textual)

```
User ──< Transaction >── Category
  │                          ▲
  │                          │
  ├──< FixedExpense >────────┤
  │
  ├──< Goal >─────────────────┤
  │
  └──< NotificationPreference

ExchangeRate (tabela independente, sem FK para User)
```

## 2. Tabelas

### 2.1 `users`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| name | VARCHAR(255) | NOT NULL | Nome do usuário |
| email | VARCHAR(255) | NOT NULL, UNIQUE | E-mail (usado para login) |
| password_hash | VARCHAR(255) | NOT NULL | Hash da senha (bcrypt) |
| default_currency | VARCHAR(3) | NOT NULL, DEFAULT 'BRL' | Moeda padrão (código ISO 4217) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de atualização |

### 2.2 `categories`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK -> users.id, NULLABLE | NULL se for categoria padrão do sistema |
| name | VARCHAR(100) | NOT NULL | Nome da categoria |
| type | ENUM('expense', 'income') | NOT NULL | Tipo de categoria |
| icon | VARCHAR(50) | NULLABLE | Identificador do ícone (ex: nome do ícone da lib usada no frontend) |
| color | VARCHAR(7) | NULLABLE | Cor em hexadecimal (ex: #FF5733) |
| is_system | BOOLEAN | NOT NULL, DEFAULT false | Se `true`, é categoria padrão (não editável/removível pelo usuário) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de criação |

> Nota: categorias padrão (`is_system = true`) têm `user_id = NULL` e são visíveis para todos os usuários. Categorias customizadas têm `user_id` preenchido e são visíveis apenas para o dono.

### 2.3 `transactions`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK -> users.id, NOT NULL | Dono da transação |
| category_id | UUID | FK -> categories.id, NOT NULL | Categoria associada |
| fixed_expense_id | UUID | FK -> fixed_expenses.id, NULLABLE | Preenchido se a transação foi gerada a partir de um gasto fixo |
| type | ENUM('expense', 'income') | NOT NULL | Tipo da transação |
| amount | NUMERIC(12,2) | NOT NULL | Valor (sempre positivo; o tipo define se é entrada ou saída) |
| currency | VARCHAR(3) | NOT NULL | Moeda da transação (código ISO 4217) |
| description | VARCHAR(500) | NULLABLE | Descrição livre |
| transaction_date | DATE | NOT NULL | Data em que a transação ocorreu |
| is_paid | BOOLEAN | NOT NULL, DEFAULT true | Relevante principalmente para transações geradas de gastos fixos (paga/pendente) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de criação do registro |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de atualização do registro |

**Índices recomendados**: `(user_id, transaction_date)`, `(user_id, category_id)`.

### 2.4 `fixed_expenses`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK -> users.id, NOT NULL | Dono do gasto fixo |
| category_id | UUID | FK -> categories.id, NOT NULL | Categoria associada |
| description | VARCHAR(255) | NOT NULL | Descrição (ex: "Aluguel") |
| amount | NUMERIC(12,2) | NOT NULL | Valor do gasto fixo |
| currency | VARCHAR(3) | NOT NULL | Moeda |
| due_day | INTEGER | NOT NULL, CHECK (due_day BETWEEN 1 AND 31) | Dia do mês de vencimento |
| start_date | DATE | NOT NULL | Data de início da recorrência |
| end_date | DATE | NULLABLE | Data final da recorrência (NULL = indefinida) |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Se `false`, não gera mais transações futuras |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de atualização |

### 2.5 `goals`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK -> users.id, NOT NULL | Dono da meta |
| category_id | UUID | FK -> categories.id, NOT NULL | Categoria da meta |
| monthly_limit | NUMERIC(12,2) | NOT NULL | Limite mensal de gasto |
| currency | VARCHAR(3) | NOT NULL | Moeda do limite |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Se a meta está ativa |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Data de atualização |

**Restrição de negócio**: um usuário não deve ter duas metas ativas para a mesma categoria simultaneamente (garantir via constraint de aplicação ou índice único parcial `UNIQUE(user_id, category_id) WHERE is_active = true`).

### 2.6 `notification_preferences`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK -> users.id, NOT NULL, UNIQUE | Dono da preferência |
| notify_goal_exceeded | BOOLEAN | NOT NULL, DEFAULT true | Notificar quando meta for ultrapassada |
| notify_fixed_expense_due | BOOLEAN | NOT NULL, DEFAULT true | Notificar quando gasto fixo estiver próximo do vencimento |
| fixed_expense_due_days_before | INTEGER | NOT NULL, DEFAULT 3 | Quantos dias antes do vencimento notificar |

### 2.7 `exchange_rates`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| base_currency | VARCHAR(3) | NOT NULL | Moeda base (ex: USD) |
| target_currency | VARCHAR(3) | NOT NULL | Moeda de destino (ex: BRL) |
| rate | NUMERIC(18,8) | NOT NULL | Taxa de conversão |
| fetched_at | TIMESTAMP | NOT NULL, DEFAULT now() | Quando a taxa foi obtida |

**Índice recomendado**: `(base_currency, target_currency, fetched_at DESC)` para busca rápida da taxa mais recente.

## 3. Categorias Padrão Sugeridas (seed inicial)

| Nome | Tipo | Ícone sugerido |
|---|---|---|
| Alimentação | expense | utensils |
| Transporte | expense | car |
| Moradia | expense | home |
| Lazer | expense | film |
| Saúde | expense | heart-pulse |
| Educação | expense | book |
| Compras | expense | shopping-bag |
| Outros (gasto) | expense | more-horizontal |
| Salário | income | wallet |
| Renda Extra | income | trending-up |
| Outros (receita) | income | more-horizontal |

## 4. Observações para o Agente de IA

- Todos os IDs devem ser UUID (v4), gerados no backend (ou via `gen_random_uuid()` do PostgreSQL, se disponível a extensão `pgcrypto`).
- Usar `NUMERIC(12,2)` para valores monetários — **nunca usar `FLOAT` ou `DOUBLE`** para dinheiro, para evitar erros de arredondamento.
- Todas as tabelas com `user_id` devem ter esse campo indexado, pois praticamente toda query filtra por usuário.
- As migrations devem ser criadas incrementalmente via Alembic, uma por entidade/funcionalidade, para manter histórico claro de evolução do schema.
