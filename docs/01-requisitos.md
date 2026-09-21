# Análise de Requisitos

## 1. Requisitos Funcionais (RF)

### 1.1 Autenticação e Usuários
- **RF01**: O sistema deve permitir cadastro de novo usuário com nome, e-mail e senha.
- **RF02**: O sistema deve permitir login via e-mail e senha.
- **RF03**: O sistema deve permitir logout.
- **RF04**: O sistema deve permitir recuperação de senha via e-mail.
- **RF05**: Senhas devem ser armazenadas com hash seguro (nunca em texto puro).
- **RF06**: Cada usuário só pode visualizar e manipular seus próprios dados (isolamento total entre contas).
- **RF07**: O sistema deve permitir que o usuário edite seus dados de perfil (nome, e-mail, moeda padrão).

### 1.2 Transações (Gastos e Receitas)
- **RF08**: O usuário deve poder criar uma transação informando: tipo (gasto ou receita), valor, moeda, categoria, data, descrição opcional.
- **RF09**: O usuário deve poder editar uma transação existente.
- **RF10**: O usuário deve poder excluir uma transação existente.
- **RF11**: O usuário deve poder listar suas transações com filtros por: período (data inicial e final), tipo (gasto/receita), categoria.
- **RF12**: O sistema deve calcular e exibir o saldo (receitas - gastos) para o período selecionado.

### 1.3 Gastos Fixos Recorrentes
- **RF13**: O usuário deve poder cadastrar um gasto fixo recorrente informando: descrição, valor, categoria, dia do mês de vencimento, moeda, e se é recorrência indefinida ou com data final.
- **RF14**: O sistema deve gerar automaticamente, no início de cada mês (ou de acordo com a regra definida em `02-arquitetura.md`), uma transação do tipo "gasto" a partir de cada gasto fixo ativo do usuário.
- **RF15**: O usuário deve poder marcar manualmente uma transação gerada a partir de um gasto fixo como "paga" ou "pendente".
- **RF16**: O usuário deve poder editar um gasto fixo (isso não deve alterar retroativamente transações já geradas, apenas as futuras).
- **RF17**: O usuário deve poder desativar/excluir um gasto fixo (isso interrompe a geração de novas transações futuras a partir dele).
- **RF18**: O sistema deve enviar um e-mail de notificação alertando quando um gasto fixo estiver próximo do vencimento (prazo configurável, com padrão de 3 dias antes).

### 1.4 Categorias
- **RF19**: O sistema deve prover um conjunto de categorias padrão pré-cadastradas (ex: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Salário, Outros).
- **RF20**: O usuário deve poder criar categorias customizadas próprias.
- **RF21**: O usuário deve poder editar e excluir suas categorias customizadas (não pode excluir categorias padrão do sistema).
- **RF22**: Cada categoria deve ter um nome, um ícone/cor (para exibição visual) e um tipo (gasto ou receita).

### 1.5 Metas de Gasto
- **RF23**: O usuário deve poder definir uma meta de limite de gasto mensal por categoria (ex: "Lazer: até R$500/mês").
- **RF24**: O sistema deve calcular, a cada novo gasto lançado, se a meta da categoria correspondente foi ultrapassada no mês corrente.
- **RF25**: O sistema deve enviar um e-mail de alerta ao usuário quando uma meta for ultrapassada.
- **RF26**: O usuário deve poder visualizar o progresso de cada meta (quanto já gastou vs. limite definido) no dashboard.

### 1.6 Dashboard
- **RF27**: O dashboard deve exibir cards de resumo: total de receitas, total de gastos, saldo do período selecionado.
- **RF28**: O dashboard deve exibir um gráfico de pizza ou barra mostrando a distribuição de gastos por categoria no período selecionado.
- **RF29**: O dashboard deve exibir um gráfico de linha mostrando a evolução de gastos (e/ou receitas) ao longo do tempo.
- **RF30**: O dashboard deve permitir ao usuário escolher o período de análise (ex: último mês, últimos 3 meses, ano corrente, período customizado).
- **RF31**: O dashboard deve exibir o progresso das metas de gastos ativas.

### 1.7 Histórico
- **RF32**: Deve existir uma página de histórico completo de transações, com paginação.
- **RF33**: A página de histórico deve permitir filtrar por período (com atalho para "último mês" e opção de período customizado), categoria e tipo.
- **RF34**: A página de histórico deve permitir ordenar as transações por data ou valor.

### 1.8 Multi-moeda
- **RF35**: Cada transação deve ter uma moeda associada (ex: BRL, USD, EUR).
- **RF36**: O usuário deve poder definir uma moeda padrão em seu perfil, usada para exibição consolidada nos dashboards.
- **RF37**: Quando houver transações em moedas diferentes da moeda padrão, o sistema deve converter os valores para a moeda padrão ao calcular totais consolidados, usando uma taxa de câmbio (ver RNF de integração externa).

### 1.9 Notificações
- **RF38**: O sistema deve enviar e-mails transacionais para: alerta de meta de gasto estourada, aviso de gasto fixo próximo do vencimento.
- **RF39**: O usuário deve poder desativar cada tipo de notificação individualmente em suas configurações.

## 2. Requisitos Não-Funcionais (RNF)

### 2.1 Segurança
- **RNF01**: Toda comunicação entre frontend e backend deve ser via HTTPS.
- **RNF02**: A autenticação deve usar tokens JWT (ou similar) com expiração configurável.
- **RNF03**: Senhas devem ser hasheadas com bcrypt ou argon2.
- **RNF04**: A API deve validar que o usuário autenticado só acessa recursos (transações, metas, categorias, gastos fixos) que pertencem a ele — verificação obrigatória em todos os endpoints.
- **RNF05**: Dados sensíveis (senha, tokens) nunca devem ser logados em texto puro.

### 2.2 Performance
- **RNF06**: Listagens de transações e o dashboard devem responder em até 1 segundo para volumes de até 10.000 transações por usuário.
- **RNF07**: A geração automática de gastos fixos recorrentes deve ser feita via job agendado (scheduler), sem impacto perceptível na experiência do usuário.

### 2.3 Usabilidade
- **RNF08**: A interface deve ser responsiva, com prioridade de design para desktop, mas funcional em tablets e smartphones.
- **RNF09**: A aplicação deve fornecer feedback visual claro para ações assíncronas (loading states, mensagens de sucesso/erro).

### 2.4 Disponibilidade e Confiabilidade
- **RNF10**: O sistema deve ter mecanismo de retry/log de falhas no envio de e-mails, para não perder notificações importantes silenciosamente.
- **RNF11**: Toda operação de escrita crítica (criação de transação, geração de gasto fixo) deve ser transacional (all-or-nothing) no banco de dados.

### 2.5 Integração Externa
- **RNF12**: O sistema deve integrar-se a um provedor de e-mail transacional (ex: Resend, SendGrid ou similar — decisão final documentada em `02-arquitetura.md`).
- **RNF13**: O sistema deve integrar-se a uma API de taxas de câmbio para conversão entre moedas (ex: exchangerate-api.com ou similar).

### 2.6 Manutenibilidade
- **RNF14**: O código deve seguir convenções de lint e formatação consistentes (ESLint + Prettier no frontend; Ruff/Black no backend).
- **RNF15**: A API deve ser documentada automaticamente (FastAPI gera OpenAPI/Swagger nativamente — deve ser mantido acessível em ambiente de desenvolvimento).
- **RNF16**: O sistema deve ter testes automatizados cobrindo as regras de negócio críticas (geração de recorrência, cálculo de metas, isolamento de dados entre usuários).

### 2.7 Escalabilidade (visão futura, não bloqueante para o MVP)
- **RNF17**: A arquitetura deve permitir evolução futura para suportar contas compartilhadas (família/casal) sem redesenho completo do modelo de dados.

## 3. Regras de Negócio Importantes

- **RN01**: Uma transação gerada automaticamente a partir de um gasto fixo mantém uma referência (`fixed_expense_id`) ao gasto fixo que a originou, mas pode ser editada individualmente sem afetar o cadastro do gasto fixo.
- **RN02**: Ao editar um gasto fixo, apenas as transações futuras (ainda não geradas) são afetadas pela mudança. Transações passadas já geradas permanecem inalteradas.
- **RN03**: O cálculo de "meta ultrapassada" considera apenas transações do tipo "gasto" na categoria da meta, dentro do mês corrente (baseado na data da transação, não na data de criação do registro).
- **RN04**: Categorias padrão do sistema (`is_system = true`) não podem ser excluídas ou editadas pelo usuário, apenas ocultadas/desativadas para exibição, se necessário.
- **RN05**: A exclusão de uma categoria customizada que já possui transações associadas deve ser bloqueada, ou as transações devem ser reatribuídas a uma categoria "Outros" (decisão de implementação a ser registrada no changelog técnico — recomendação: bloquear exclusão e exigir reatribuição manual primeiro).
