# Relatório de QA — Vault

Data: 23/09/2026

## Resultado

A aplicação passou nos fluxos automatizados locais cobertos pelo checklist. O frontend usa a API real por padrão, persiste dados e funciona em desktop e smartphone sem overflow horizontal do documento.

## Correções realizadas

- Recuperação de senha completa, com token específico de 30 minutos e tela de redefinição.
- Busca, período, categoria, tipo, ordenação e paginação de transações.
- Criação, edição e exclusão de transações com moeda por lançamento.
- Marcação reversível de gasto recorrente como pago ou pendente.
- Edição de categorias personalizadas, gastos fixos e metas.
- Data final, moeda, desativação e reativação de gastos fixos.
- Seletor de período mensal, trimestral, anual e personalizado no dashboard.
- Conversão BRL/USD/EUR com cache, busca sob demanda e atualização diária.
- Mensagens de erro, estados de carregamento e layout mobile corrigidos.
- Nova identidade Vault em SVG e favicon próprio.

## Verificações automatizadas

- `npm run build`: aprovado.
- `npm run lint`: aprovado.
- `npm run test:e2e`: 5 cenários aprovados em Chromium, desktop e viewports 390 × 844 e 768 × 1024.
- `python -m ruff check .`: aprovado.
- `python -m pytest -q`: 15 cenários aprovados, cobrindo autenticação, reset, isolamento entre usuários, CRUDs, paginação, filtros, recorrência, metas, preferências, dashboard, multi-moeda, configuração de produção e autenticação dos cron jobs.

## Continuação da verificação em 23/09/2026

Os itens marcados em `06-checklist-testes-qa.md` têm evidência em testes locais de API ou E2E. A marcação indica o comportamento testado; cenários visuais não cobertos explicitamente e a entrega real de e-mail permanecem sem marcação.

- A geração recorrente agora usa a data efetiva de vencimento para respeitar `start_date` e `end_date`, inclusive o dia 31 reduzido ao último dia de fevereiro. O teste confirma idempotência, valor novo apenas em meses futuros, preservação do histórico e interrupção após desativação.
- O aviso de gasto fixo respeita início e fim da recorrência, preferências de notificação e a virada de mês/ano. Em 29 de dezembro, um vencimento em 1º de janeiro com antecedência de três dias gera o aviso no teste local.
- A exclusão de categoria vinculada a meta ou gasto fixo responde `409` com orientação, evitando erro de integridade. A exclusão funciona após remover a meta e reatribuir o gasto fixo. IDs de categoria, meta e gasto fixo de outra conta foram negados.
- O alerta de meta após editar transação agora considera a categoria, o mês e a moeda anteriores. O teste cobre entrada na categoria da meta com troca de USD para BRL sem consultar câmbio para uma contribuição anterior de zero, além da queda e nova ultrapassagem do limite após troca de moeda. Com a preferência desativada, o envio simulado não ocorre.
- O dashboard foi conferido com receita de R$ 200, gasto de R$ 30 e gasto de USD 10 a uma taxa controlada de 5 BRL/USD: receitas R$ 200, gastos R$ 80, saldo R$ 120, distribuição 37,5%/62,5% e datas em ordem. Após excluir o gasto em USD, gastos caem para R$ 30 e saldo sobe para R$ 170. Outro teste troca a moeda padrão de BRL para USD e confirma que o total de um gasto de USD 25 passa de R$ 125 para USD 25. Filtros combinados de tipo, categoria e data retornaram o registro esperado.
- O E2E confirma redirecionamento de rota interna para login, validação de valor e categoria obrigatórios no lançamento, opções BRL/USD/EUR, persistência de nome e moeda do perfil após recarga, logout/login, layout sem overflow em 390 px e 768 px e ausência de erro no console. A captura `test-results/dashboard-tablet.png` foi inspecionada visualmente.
- O primeiro cenário E2E agora também cria, edita, desativa e reativa um gasto fixo; cria uma meta, confere progresso e sinalização visual após lançar um gasto que passa do limite, aumenta o limite e confirma a volta ao estado normal, depois exclui a meta da lista e do dashboard.
- Um segundo cenário E2E prepara 12 lançamentos em duas categorias e duas datas, avança e volta páginas, testa ordenação por valor e data nos dois sentidos, combina busca/tipo/categoria/período, usa o atalho “Último mês” e confere o período personalizado no dashboard com R$ 78 de gastos, duas categorias no gráfico e dois pontos no eixo temporal.
- Um terceiro cenário E2E simula na rede uma transação recorrente e confirma a mudança visual `Pendente → Pago → Pendente`. A API real de marcação reversível foi exercitada separadamente no teste de backend; o cenário visual usa respostas simuladas para controlar o estado apresentado.
- Indicadores de carregamento foram acrescentados a consultas e ações de exclusão/alteração em transações, categorias, gastos fixos e metas, além do resumo do dashboard. O terceiro cenário segura a resposta de marcação de pagamento e verifica “Atualizando pagamento...”. Um quarto cenário simula falha de rede no histórico e verifica a mensagem compreensível; o primeiro já verifica erros de validação de valor e categoria.
- O resumo do histórico somava valores em moedas diferentes sem conversão e os apresentava como BRL. Agora mostra saldos, receitas e gastos separados por moeda, com duas casas decimais explícitas no formatador. Um quinto cenário E2E confirma BRL, USD e EUR em linhas distintas, com símbolos e centavos corretos.
- A tela de categorias foi corrigida para desenhar o ícone configurado. O E2E confirma ícone `food`, cor `#123456` e ausência dos botões de editar/excluir em uma categoria do sistema. A API agora acrescenta ID como critério final de ordenação para que a paginação seja estável quando data e criação empatam.
- O bloco de metas do dashboard agora diz “Metas deste mês”: o progresso mensal continua referente ao mês atual mesmo quando os cards e gráficos mostram outro período, como definido para metas mensais nos requisitos.

Última execução: 15 testes de backend e 5 cenários E2E aprovados; `ruff`, lint e build aprovados. O build continua avisando sobre o chunk JavaScript de aproximadamente 889 kB antes de gzip. Há dois avisos de depreciação nas dependências do `pytest`.

Permanecem para verificação integrada/manual mais detalhada: o fluxo completo de 10 passos da checklist e os casos de borda de telas não cobertos pelo E2E. A checklist pede que metas acompanhem a troca do período do dashboard, mas RF23/RF31 definem metas mensais; o produto mostra explicitamente “Metas deste mês” enquanto cards e gráficos seguem o período selecionado. Os testes locais usam mocks para entrega de e-mail, taxa de câmbio e estado visual da recorrência; o acesso à Frankfurter foi confirmado separadamente no deploy, mas a entrega em caixa postal ainda não foi comprovada.

## Verificações no ambiente publicado em 23/09/2026

- Frontend `https://vault-web-alpha.vercel.app` e API `https://vault-api-khaki.vercel.app` publicados na Vercel. `GET /` e acesso direto a `/login` no frontend responderam 200. O bundle publicado contém a URL correta da API.
- `GET /health` respondeu 200 por HTTPS, com certificado aceito pelo cliente HTTP e cabeçalho `Strict-Transport-Security`. O preflight CORS para a origem do frontend respondeu 200 e a origem esperada. O item de HTTPS foi marcado na checklist: agora são 62 de 70 itens com evidência.
- O Supabase recebeu a revisão Alembic `20260921_0001`: oito tabelas no esquema público e 11 categorias de sistema. O pool de transações e o pool de sessão aceitaram conexões com SSL.
- Um fluxo de produção com conta fictícia fez cadastro 201, login 200, listagem de categorias 200, criação de transação 201 e exclusão 204. A conta fictícia foi excluída em seguida; o banco terminou com zero usuários.
- Uma chamada de login inexistente retornou 401 após consultar o banco. O endpoint de cron sem segredo retornou 401. Recuperação de senha sem remetente configurado retornou 503 com mensagem clara, em vez de sugerir envio inexistente.
- A Vercel listou os três cron jobs diários (recorrência às 03:00, avisos às 09:00 e câmbio às 02:00, todos em UTC). As três rotas foram acionadas uma vez pela CLI. O job de recorrência criou zero registros, esperado sem usuários. O job de câmbio consultou a Frankfurter com respostas 200 e gravou seis pares no Supabase. O job de aviso foi invocado sem usuários, portanto não comprova entrega de e-mail.
- Antes do deploy, `ruff` e `pytest` passaram (15 testes); lint e build do frontend passaram. O build publicado ainda avisa sobre um chunk JavaScript de aproximadamente 889 kB antes de gzip.

## Verificações dependentes de ambiente de produção

Os itens abaixo não podem ser certificados apenas no ambiente local e devem ser confirmados no deploy:

- Chave e domínio verificado do provedor Resend, recebimento real e reputação antispam.
- Execução automática dos cron jobs no horário agendado e entrega real de avisos; a invocação manual já foi verificada. `SCHEDULER_ENABLED=false` permanece correto na Vercel.
- Expiração real da sessão após o tempo configurado.
- Teste de carga com 10.000 transações por usuário.

Esses pontos são configuração/infraestrutura; o código e os fluxos correspondentes estão implementados e cobertos nos testes locais quando aplicável.
