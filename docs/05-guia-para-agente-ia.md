# Guia para o Agente de IA

Este documento existe para orientar **qualquer agente de IA** (Claude Code, Cursor, Copilot Workspace, etc.) que for implementar este projeto do zero ou continuar seu desenvolvimento. Leia este arquivo **antes** de começar a escrever qualquer código.

## 1. Ordem de Leitura dos Documentos

1. `00-visao-geral.md` — entenda o "porquê" do projeto.
2. `01-requisitos.md` — entenda o "o quê" (funcionalidades e regras de negócio).
3. `02-arquitetura.md` — entenda o "como" técnico (stack, estrutura de pastas, fluxos).
4. `03-modelo-de-dados.md` — schema exato do banco de dados.
5. `04-especificacao-api.md` — contrato exato da API entre frontend e backend.
6. Este arquivo — como conduzir a implementação passo a passo.

## 2. Ordem Recomendada de Implementação

Implemente nesta ordem, validando cada etapa antes de avançar para a próxima:

### Etapa 1 — Fundação do Backend
1. Estrutura de pastas do backend conforme `02-arquitetura.md`.
2. Configuração de banco de dados (SQLAlchemy + Alembic) e conexão com PostgreSQL.
3. Modelos de dados (`app/models/`) conforme `03-modelo-de-dados.md`.
4. Primeira migration criando todas as tabelas.
5. Seed inicial das categorias padrão do sistema.

### Etapa 2 — Autenticação
1. Endpoints de `/auth` (register, login, me).
2. Middleware/dependency de autenticação (`get_current_user`).
3. Testes de autenticação (cadastro, login com senha errada, acesso sem token).

### Etapa 3 — CRUD Básico
1. Endpoints de categorias.
2. Endpoints de transações (CRUD completo + filtros).
3. Testes garantindo isolamento de dados entre usuários (usuário A não pode acessar/editar transação do usuário B).

### Etapa 4 — Gastos Fixos e Recorrência
1. Endpoints de gastos fixos.
2. Serviço de geração automática de transações recorrentes (`services/recurrence_service.py`).
3. Job agendado (APScheduler) que dispara esse serviço.
4. Testes do serviço de recorrência isoladamente (sem depender do scheduler rodar de verdade).

### Etapa 5 — Metas e Notificações
1. Endpoints de metas.
2. Serviço de verificação de metas (`services/goal_service.py`), acionado ao criar/editar transação.
3. Integração com serviço de e-mail (`services/email_service.py`).
4. Job agendado de verificação de vencimento de gastos fixos.

### Etapa 6 — Dashboard e Câmbio
1. Serviço de conversão de moeda (`services/exchange_rate_service.py`) + job de atualização periódica das taxas.
2. Endpoint de dashboard consolidando os dados (com conversão de moeda quando aplicável).

### Etapa 7 — Frontend
1. Estrutura de pastas conforme `02-arquitetura.md`.
2. Autenticação (páginas de login/cadastro, guarda de rotas privadas).
3. CRUD de transações (formulário + listagem).
4. Página de histórico com filtros.
5. Gastos fixos (formulário + listagem + marcação de pago/pendente).
6. Metas (formulário + visualização de progresso).
7. Dashboard (cards + gráficos), por último, pois consome dados de todas as outras features.

### Etapa 8 — Integração e Deploy
1. Configurar CORS no backend para aceitar o domínio do frontend.
2. Configurar variáveis de ambiente em produção (Vercel, Railway/Render, Supabase).
3. Testar fluxo completo ponta a ponta em ambiente de produção.

## 3. Convenções de Código

- **Nomenclatura**: sempre em inglês no código (variáveis, funções, nomes de tabelas/colunas), mesmo que a documentação e comunicação com o usuário sejam em português.
- **Commits**: seguir Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Backend**: seguir PEP 8, usar type hints em todas as funções, docstrings em serviços com lógica de negócio não-trivial.
- **Frontend**: componentes funcionais com hooks, tipagem estrita no TypeScript (evitar `any`), um componente por arquivo.
- **Testes**: priorizar testes de regras de negócio críticas (recorrência, metas, isolamento de dados) sobre cobertura total de UI.

## 4. Changelog Técnico (Decisões de Implementação)

Sempre que o agente de IA tomar uma decisão técnica não coberta explicitamente pela documentação (ex: escolher entre duas bibliotecas equivalentes, resolver uma das "Decisões em Aberto" da seção 5 de `02-arquitetura.md`), ele deve registrar a decisão em um arquivo `docs/CHANGELOG-TECNICO.md`, com o seguinte formato:

```markdown
## [Data] Decisão: <título curto>
**Contexto**: por que essa decisão precisou ser tomada.
**Decisão**: o que foi decidido.
**Alternativas consideradas**: outras opções e por que foram descartadas.
```

Isso garante que decisões tomadas "no meio do caminho" por um agente fiquem documentadas para agentes futuros (ou para você revisar depois).

## 5. Checklist de Qualidade Antes de Considerar uma Etapa "Pronta"

- [ ] O código segue a estrutura de pastas definida em `02-arquitetura.md`.
- [ ] Os endpoints implementados batem exatamente com o contrato de `04-especificacao-api.md` (nomes de campos, formatos de data, códigos de status HTTP).
- [ ] Regras de negócio de `01-requisitos.md` (seção "Regras de Negócio Importantes") foram implementadas corretamente.
- [ ] Existe pelo menos um teste automatizado cobrindo o caminho feliz e um caso de erro/borda de cada funcionalidade nova.
- [ ] Nenhum dado sensível (senha, token, chave de API) está exposto em logs ou respostas de API.
- [ ] Toda query que retorna dados de usuário filtra corretamente por `user_id` do usuário autenticado.

## 6. O Que Fazer Quando Algo Não Está Claro

Se, durante a implementação, o agente de IA encontrar uma ambiguidade não resolvida por nenhum dos documentos:
1. Prefira a solução mais simples e convencional para o contexto (ex: padrões REST comuns, comportamento mais comum em apps financeiros).
2. Registre a decisão no `CHANGELOG-TECNICO.md` (seção 4 acima).
3. Se a ambiguidade for sobre uma regra de negócio (não técnica) que pode impactar significativamente a experiência do usuário, sinalize isso claramente ao usuário humano antes de prosseguir, em vez de assumir silenciosamente.

## 7. Fora de Escopo — Não Implementar Sem Confirmação

Não implemente as seguintes funcionalidades a menos que explicitamente solicitado (elas estão documentadas como Fase 2 em `00-visao-geral.md`):
- Exportação de relatórios (CSV, PDF, Excel).
- Aplicativo mobile nativo.
- Notificações push/in-app.
- Compartilhamento de contas entre usuários.
- Integração bancária automática.
