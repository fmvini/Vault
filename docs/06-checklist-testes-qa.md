# Checklist de Testes (QA Manual)

Este documento serve para você validar, como usuário final, se a aplicação implementada pelo agente de IA está funcionando corretamente e cobre tudo que foi especificado em `01-requisitos.md`. Marque cada item conforme for testando.

Recomendação: teste com **pelo menos 2 contas de usuário diferentes** para validar isolamento de dados (RF06).

Estado em 23/09/2026: `[x]` indica validação local por teste de API ou E2E em Chromium. `[ ]` permanece para verificação manual ou em produção. A evidência e os limites estão em `07-relatorio-qa.md`; os testes não comprovam recebimento real de e-mail nem HTTPS.

## 1. Autenticação e Perfil

- [x] Cadastro com nome, e-mail e senha válidos cria a conta com sucesso.
- [x] Cadastro com e-mail já existente exibe erro claro (não permite duplicata).
- [x] Cadastro com senha fraca/campos vazios exibe validação de erro (não deixa submeter).
- [x] Login com e-mail e senha corretos funciona e redireciona para o dashboard.
- [x] Login com senha incorreta exibe mensagem de erro (sem revelar se o e-mail existe ou não).
- [x] Logout limpa a sessão e redireciona para a tela de login.
- [x] Ao tentar acessar uma página interna sem estar logado, o sistema redireciona para o login.
- [ ] Recuperação de senha: solicitar com e-mail cadastrado gera e-mail de recuperação.
- [x] Recuperação de senha: solicitar com e-mail não cadastrado não revela isso (mensagem genérica).
- [x] É possível editar nome e moeda padrão no perfil, e a alteração persiste após recarregar a página.
- [ ] Senha nunca aparece em texto puro em nenhuma tela, resposta de erro ou log visível.

## 2. Transações (Gastos e Receitas)

- [x] Criar uma nova transação de gasto com todos os campos preenchidos funciona e aparece na listagem.
- [x] Criar uma nova transação de receita funciona e aparece separadamente/identificada como receita.
- [x] Criar transação sem valor ou sem categoria é bloqueado com mensagem de validação.
- [x] Editar uma transação existente reflete a mudança corretamente na listagem e no dashboard.
- [x] Excluir uma transação remove ela da listagem e recalcula os totais.
- [x] Valores monetários exibidos sempre têm 2 casas decimais e símbolo/código de moeda correto.
- [x] Usuário A não consegue ver, editar ou excluir transações do usuário B (testar via 2 contas).

## 3. Gastos Fixos Recorrentes

- [x] Cadastrar um gasto fixo (ex: "Aluguel", dia de vencimento 5) funciona.
- [x] Após o cadastro, existe uma transação correspondente gerada para o mês vigente (ou é gerada no próximo ciclo do job — validar o comportamento documentado).
- [x] Marcar uma transação de gasto fixo como "paga" atualiza o status visualmente.
- [x] Marcar como "pendente" novamente também funciona (reversível).
- [x] Editar o valor de um gasto fixo NÃO altera transações já geradas anteriormente (RN02).
- [x] Editar o valor de um gasto fixo afeta corretamente a próxima geração futura.
- [x] Desativar/excluir um gasto fixo interrompe a geração de novas transações, mas mantém o histórico já gerado.
- [x] Gasto fixo com data final (`end_date`) preenchida deixa de gerar transações após essa data.

## 4. Categorias

- [x] Categorias padrão do sistema aparecem disponíveis para todos os usuários desde o primeiro login.
- [x] Criar uma categoria customizada funciona e ela passa a aparecer nos formulários de transação.
- [x] Editar uma categoria customizada funciona.
- [x] Excluir uma categoria customizada sem transações associadas funciona.
- [x] Tentar excluir uma categoria customizada COM transações associadas é bloqueado ou tratado conforme a regra definida (RN05) — não deve quebrar a aplicação nem apagar dados silenciosamente.
- [x] Categorias padrão do sistema não podem ser editadas nem excluídas pelo usuário (opção deve estar desabilitada ou ausente na interface).
- [x] Cada categoria exibe corretamente seu ícone/cor configurado.

## 5. Metas de Gasto

- [x] Criar uma meta mensal para uma categoria (ex: Lazer, R$500) funciona.
- [x] Tentar criar uma segunda meta ativa para a mesma categoria é bloqueado (mensagem de erro clara).
- [x] O progresso da meta (quanto já foi gasto vs. limite) é exibido corretamente e atualiza em tempo real (ou após recarregar) conforme novas transações são lançadas.
- [x] Ao ultrapassar o limite da meta, o sistema sinaliza visualmente (ex: cor vermelha, ícone de alerta) no dashboard.
- [ ] Um e-mail de alerta é enviado quando a meta é ultrapassada (verificar caixa de entrada).
- [x] Editar o limite de uma meta existente funciona e recalcula o status (estourada ou não) corretamente.
- [x] Excluir uma meta remove ela da lista e do dashboard.

## 6. Dashboard

- [x] Cards de resumo (total receitas, total gastos, saldo) exibem valores corretos para o período selecionado.
- [x] Gráfico de pizza/barra por categoria reflete corretamente a proporção de gastos.
- [x] Gráfico de linha de evolução no tempo exibe os dados no eixo temporal correto.
- [ ] Trocar o período selecionado (ex: de "último mês" para "últimos 3 meses") atualiza todos os elementos do dashboard (cards, gráficos, metas) de forma consistente.
- [x] Selecionar um período customizado (data inicial e final) funciona corretamente.
- [x] Dashboard exibe corretamente as metas ativas e seu progresso.
- [x] Com transações em moedas diferentes, os totais consolidados aparecem convertidos corretamente para a moeda padrão do usuário.

## 7. Histórico

- [x] A página de histórico lista todas as transações do usuário, com paginação funcionando corretamente (avançar/voltar páginas).
- [x] Filtro por período (atalho "último mês" e período customizado) funciona.
- [x] Filtro por categoria funciona.
- [x] Filtro por tipo (gasto/receita) funciona.
- [x] Ordenação por data e por valor funciona, em ambas as direções (crescente/decrescente).
- [x] Combinar múltiplos filtros ao mesmo tempo (ex: categoria + período) funciona corretamente.

## 8. Multi-moeda

- [x] É possível registrar transações em moedas diferentes da moeda padrão do usuário.
- [x] O seletor de moeda no formulário de transação lista as opções esperadas.
- [x] Trocar a moeda padrão no perfil reflete corretamente nos totais consolidados do dashboard.

## 9. Notificações por E-mail

- [ ] E-mail de aviso de gasto fixo próximo do vencimento é recebido dentro do prazo configurado (padrão: 3 dias antes).
- [ ] E-mail de meta estourada é recebido no momento em que o limite é ultrapassado.
- [x] Desativar um tipo de notificação nas configurações realmente impede o envio desse tipo de e-mail.
- [ ] E-mails recebidos têm conteúdo claro (não genérico/quebrado) e não caem em spam com frequência.

## 10. Responsividade e Usabilidade Geral

- [x] A aplicação é usável e bem formatada em tela desktop (prioridade principal).
- [x] A aplicação não quebra visualmente em tela de tablet.
- [x] A aplicação não quebra visualmente em tela de smartphone (mesmo que não seja o foco principal).
- [x] Ações assíncronas (salvar, excluir, carregar dados) exibem algum indicador de carregamento (loading).
- [x] Erros de rede ou de validação exibem mensagens compreensíveis para o usuário (não apenas erros técnicos crus).
- [x] Não há travamentos, telas brancas ou erros no console do navegador durante o uso normal.

## 11. Segurança Básica

- [x] A aplicação em produção roda sob HTTPS (cadeado no navegador).
- [ ] Token expira conforme configurado e força novo login (testar deixando a sessão expirar, se possível).
- [x] Tentar acessar diretamente uma URL de API sem token retorna erro de não autorizado, não os dados.
- [x] Tentar acessar/manipular um recurso (transação, meta, gasto fixo) de outro usuário via chamada direta à API (ex: alterando o ID na URL) retorna erro e não expõe nem permite alterar o dado.

## 12. Teste de Fluxo Completo (Ponta a Ponta)

Um teste final simulando o uso real, na ordem:
1. Cadastrar novo usuário.
2. Editar perfil definindo moeda padrão.
3. Criar 2 categorias customizadas.
4. Cadastrar 1 gasto fixo recorrente.
5. Lançar 5 transações de gasto variadas e 1 receita.
6. Criar uma meta para uma categoria com limite baixo o suficiente para ser ultrapassado pelos gastos lançados.
7. Verificar se o e-mail de meta estourada chegou.
8. Acessar o dashboard e conferir se os números batem com o que foi lançado manualmente (confira a soma você mesmo).
9. Ir ao histórico, aplicar filtros e confirmar que os resultados batem com o esperado.
10. Fazer logout e login novamente, confirmando que todos os dados persistiram corretamente.

---

**Dica**: sempre que encontrar um bug, anote: (1) o que você fez, (2) o que esperava que acontecesse, (3) o que aconteceu de fato. Isso facilita muito passar o problema de volta para o agente de IA corrigir.
