# Visão Geral do Projeto

## Nome do Projeto
**FinTrack** (nome provisório — pode ser alterado a qualquer momento)

## O que é
Uma aplicação web de gestão financeira pessoal que permite a múltiplos usuários controlar seus gastos e receitas, visualizar seu histórico financeiro através de um dashboard, cadastrar despesas fixas recorrentes, definir metas de gastos por categoria e receber alertas quando essas metas forem ultrapassadas.

## Problema que resolve
Pessoas frequentemente perdem o controle de suas finanças por não terem uma visão clara e centralizada de:
- Quanto estão gastando e em quais categorias.
- Quais contas fixas (recorrentes) precisam pagar todo mês.
- Se estão dentro do orçamento planejado para cada categoria de gasto.
- Como seus gastos evoluíram ao longo do tempo.

## Objetivo do Produto
Oferecer uma ferramenta simples, visual e confiável para que o usuário:
1. Registre gastos e receitas rapidamente.
2. Configure despesas recorrentes (fixas) que se repetem automaticamente todo mês.
3. Visualize um dashboard com resumo financeiro (saldo, total gasto, gastos por categoria, evolução no tempo).
4. Consulte o histórico de transações filtrando por período (último mês, período customizado, etc.).
5. Defina metas/limites de gasto por categoria e seja alertado por e-mail quando estourar o limite.

## Público-alvo
- Usuários finais individuais que querem organizar suas finanças pessoais.
- Suporta múltiplos usuários com contas independentes (autenticação obrigatória), mas cada usuário só acessa seus próprios dados — não há compartilhamento de dados entre usuários no MVP.

## Contexto de Desenvolvimento (importante para o agente de IA)
Este projeto será **construído inteiramente por agentes de IA** (não desenvolvimento manual tradicional). Por isso:
- Toda a documentação deste projeto foi escrita para ser **extremamente explícita e sem ambiguidades**.
- Convenções de nomenclatura, estrutura de pastas, contratos de API e modelo de dados devem ser seguidos à risca, pois servem como a "fonte da verdade" para qualquer agente que for implementar ou modificar o sistema.
- Sempre que uma decisão não estiver coberta pelos documentos, o agente deve preferir a alternativa mais simples e convencional (ex: seguir padrões REST convencionais, nomenclatura em inglês no código, etc.) e **documentar a decisão tomada** em um changelog técnico (ver `05-guia-para-agente-ia.md`).

## Escopo do MVP (Fase 1)
Incluído no MVP:
- Autenticação de usuários (cadastro, login, logout).
- CRUD de transações (gastos e receitas).
- Gastos fixos recorrentes com geração automática mensal.
- Categorias padrão do sistema + categorias customizadas pelo usuário.
- Dashboard com gráficos (pizza/barra por categoria, linha de evolução temporal, cards de resumo).
- Histórico de transações com filtro por período.
- Metas/limites de gasto por categoria com alerta.
- Notificações por e-mail (meta estourada, conta fixa próxima do vencimento).
- Suporte a múltiplas moedas.
- Aplicação web responsiva, com prioridade para desktop.

## Fora do escopo do MVP (Fase 2 ou além)
- Exportação de relatórios (CSV, PDF, Excel).
- Aplicativo mobile nativo.
- Notificações push/in-app.
- Compartilhamento de contas/dados entre usuários (ex: conta familiar).
- Integração bancária automática (Open Finance / importação de extratos).

## Stack Tecnológica (resumo — detalhado em `02-arquitetura.md`)
- **Frontend**: React + TypeScript + Vite
- **Backend**: Python + FastAPI
- **Banco de dados**: PostgreSQL (hospedado via Supabase)
- **Hospedagem**: Vercel (frontend) + Railway ou Render (backend) + Supabase (banco de dados)

## Documentos Relacionados
- `01-requisitos.md` — Requisitos funcionais e não-funcionais detalhados.
- `02-arquitetura.md` — Arquitetura técnica e stack detalhada.
- `03-modelo-de-dados.md` — Schema do banco de dados.
- `04-especificacao-api.md` — Especificação dos endpoints da API.
- `05-guia-para-agente-ia.md` — Diretrizes práticas de implementação para agentes de IA.
