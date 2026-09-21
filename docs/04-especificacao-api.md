# Especificação da API

> Todas as rotas (exceto autenticação) exigem header `Authorization: Bearer <token>`.
> Prefixo base: `/api/v1`
> Formato de dados: JSON
> Todas as respostas de erro devem seguir o formato: `{ "detail": "mensagem de erro" }` (padrão FastAPI).

## 1. Autenticação (`/auth`)

### `POST /auth/register`
Cria um novo usuário.
**Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "default_currency": "BRL"
}
```
**Resposta 201:**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "default_currency": "BRL"
}
```
**Erros**: `400` (e-mail já cadastrado), `422` (dados inválidos).

### `POST /auth/login`
**Body:**
```json
{ "email": "string", "password": "string" }
```
**Resposta 200:**
```json
{ "access_token": "string", "token_type": "bearer" }
```
**Erros**: `401` (credenciais inválidas).

### `POST /auth/forgot-password`
**Body:** `{ "email": "string" }`
**Resposta 200:** `{ "message": "Se o e-mail existir, um link de recuperação será enviado." }`
*(resposta genérica por segurança, para não revelar se o e-mail existe)*

### `GET /auth/me`
Retorna os dados do usuário autenticado.
**Resposta 200:**
```json
{ "id": "uuid", "name": "string", "email": "string", "default_currency": "BRL" }
```

### `PATCH /auth/me`
Atualiza dados do perfil do usuário autenticado.
**Body (campos opcionais):**
```json
{ "name": "string", "default_currency": "BRL" }
```

## 2. Categorias (`/categories`)

### `GET /categories`
Lista todas as categorias visíveis para o usuário (padrão do sistema + customizadas).
**Query params opcionais**: `type=expense|income`
**Resposta 200:**
```json
[
  { "id": "uuid", "name": "Alimentação", "type": "expense", "icon": "utensils", "color": "#FF5733", "is_system": true }
]
```

### `POST /categories`
Cria categoria customizada.
**Body:**
```json
{ "name": "string", "type": "expense", "icon": "string", "color": "#000000" }
```

### `PATCH /categories/{category_id}`
Edita categoria customizada do usuário (bloqueado se `is_system = true` → retornar `403`).

### `DELETE /categories/{category_id}`
Exclui categoria customizada (bloqueado se `is_system = true` ou se houver transações associadas → retornar `409 Conflict`).

## 3. Transações (`/transactions`)

### `GET /transactions`
Lista transações do usuário autenticado.
**Query params**:
- `start_date` (YYYY-MM-DD, opcional)
- `end_date` (YYYY-MM-DD, opcional)
- `type` (`expense` | `income`, opcional)
- `category_id` (uuid, opcional)
- `page` (default 1)
- `page_size` (default 20, max 100)
- `sort_by` (`transaction_date` | `amount`, default `transaction_date`)
- `sort_order` (`asc` | `desc`, default `desc`)

**Resposta 200:**
```json
{
  "items": [
    {
      "id": "uuid",
      "category_id": "uuid",
      "category_name": "Alimentação",
      "fixed_expense_id": null,
      "type": "expense",
      "amount": 150.00,
      "currency": "BRL",
      "description": "Supermercado",
      "transaction_date": "2026-09-15",
      "is_paid": true
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

### `POST /transactions`
Cria uma nova transação.
**Body:**
```json
{
  "category_id": "uuid",
  "type": "expense",
  "amount": 150.00,
  "currency": "BRL",
  "description": "Supermercado",
  "transaction_date": "2026-09-15"
}
```
**Resposta 201**: objeto da transação criada.
*Efeito colateral*: dispara verificação de meta (ver `02-arquitetura.md`, seção 4.3).

### `PATCH /transactions/{transaction_id}`
Edita uma transação existente (deve validar que pertence ao usuário autenticado → `404` se não pertencer, para não vazar existência do recurso).

### `DELETE /transactions/{transaction_id}`
Exclui uma transação.

## 4. Gastos Fixos (`/fixed-expenses`)

### `GET /fixed-expenses`
Lista gastos fixos do usuário.
**Query params opcionais**: `is_active=true|false`

### `POST /fixed-expenses`
**Body:**
```json
{
  "category_id": "uuid",
  "description": "Aluguel",
  "amount": 1500.00,
  "currency": "BRL",
  "due_day": 5,
  "start_date": "2026-09-01",
  "end_date": null
}
```

### `PATCH /fixed-expenses/{fixed_expense_id}`
Edita um gasto fixo (afeta apenas gerações futuras — ver RN02 em `01-requisitos.md`).

### `DELETE /fixed-expenses/{fixed_expense_id}`
Desativa o gasto fixo (soft delete via `is_active = false`, preservando histórico de transações já geradas).

### `PATCH /fixed-expenses/{fixed_expense_id}/transactions/{transaction_id}/mark-paid`
Marca uma transação gerada a partir de um gasto fixo como paga.
**Body:** `{ "is_paid": true }`

## 5. Metas (`/goals`)

### `GET /goals`
Lista metas do usuário, incluindo progresso calculado do mês corrente.
**Resposta 200:**
```json
[
  {
    "id": "uuid",
    "category_id": "uuid",
    "category_name": "Lazer",
    "monthly_limit": 500.00,
    "currency": "BRL",
    "current_month_spent": 320.00,
    "is_exceeded": false,
    "is_active": true
  }
]
```

### `POST /goals`
**Body:**
```json
{ "category_id": "uuid", "monthly_limit": 500.00, "currency": "BRL" }
```
**Erros**: `409 Conflict` se já existir meta ativa para essa categoria.

### `PATCH /goals/{goal_id}`
Edita limite ou status da meta.

### `DELETE /goals/{goal_id}`
Remove a meta.

## 6. Dashboard (`/dashboard`)

### `GET /dashboard/summary`
**Query params**: `start_date`, `end_date` (obrigatórios)
**Resposta 200:**
```json
{
  "total_income": 5000.00,
  "total_expense": 3200.00,
  "balance": 1800.00,
  "currency": "BRL",
  "expenses_by_category": [
    { "category_id": "uuid", "category_name": "Alimentação", "total": 800.00, "percentage": 25.0 }
  ],
  "timeline": [
    { "date": "2026-09-01", "total_income": 0, "total_expense": 150.00 }
  ]
}
```

## 7. Preferências de Notificação (`/notification-preferences`)

### `GET /notification-preferences`
Retorna as preferências do usuário autenticado.

### `PATCH /notification-preferences`
**Body (campos opcionais):**
```json
{
  "notify_goal_exceeded": true,
  "notify_fixed_expense_due": true,
  "fixed_expense_due_days_before": 3
}
```

## 8. Convenções Gerais da API

- Todos os campos de data usam formato ISO 8601 (`YYYY-MM-DD` para datas, `YYYY-MM-DDTHH:MM:SSZ` para timestamps).
- Valores monetários são sempre números decimais (nunca strings), com 2 casas decimais.
- Paginação segue o padrão `page` + `page_size`, com resposta incluindo `total`.
- Todos os endpoints que recebem `category_id`, `fixed_expense_id` etc. devem validar que o recurso pertence ao usuário autenticado (ou é uma categoria de sistema, no caso de categorias) antes de prosseguir.
- Erros de validação devem retornar `422` com o formato padrão de erro do FastAPI/Pydantic.
- Erros de autorização (recurso de outro usuário) devem retornar `404` (não `403`), para não revelar a existência do recurso a quem não tem acesso a ele.
