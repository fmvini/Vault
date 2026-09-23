# Changelog Técnico

## [2026-09-23] Identidade final: Portal seguro com suporte a tema
**Contexto**: Entre os três conceitos apresentados, o usuário escolheu o conceito 02, “Portal seguro”, e pediu legibilidade equivalente no modo escuro.
**Decisão**: Tornar o arco de cofre com moeda ascendente a identidade oficial. Foram produzidas versões separadas para fundos claros e escuros, além de ícones quadrados. A sidebar alterna os assets com o tema, a autenticação usa a variante para fundo escuro e o favicon é atualizado pela preferência ativa. O E2E verifica a troca de logo e favicon.
**Artefatos**: Os SVGs finais estão em `logos/export/`; as iterações comparáveis estão em `logos/iterations/`; os assets usados pelo app estão em `frontend/public/`.

## [2026-09-23] Decisão: Taxas cambiais com cache e atualização sob demanda
**Contexto**: O dashboard já convertia valores quando existia uma taxa no banco, mas não havia processo para obter nem atualizar essas taxas, o que fazia lançamentos multi-moeda retornarem erro em uma instalação nova.
**Decisão**: Usar a API pública Frankfurter v2 para BRL, USD e EUR. A primeira conversão sem cache busca e persiste a taxa; o scheduler também renova diariamente os seis pares direcionais. Falhas externas retornam erro compreensível sem fabricar cotação.
**Alternativas consideradas**: Exigir uma chave do ExchangeRate-API aumentaria a configuração inicial; manter taxas estáticas criaria risco de totais incorretos. Ambas foram descartadas para o MVP.

## [2026-09-23] QA funcional e identidade Vault
**Contexto**: O checklist manual expunha recursos presentes na API, porém ausentes na interface, além de não existir suíte automatizada nem teste real de navegador.
**Decisão**: Completar os fluxos de transações, categorias, gastos fixos, metas, períodos, recuperação de senha e responsividade; adicionar Pytest e Playwright; integrar uma marca geométrica de cofre em SVG. O modo real passa a ser o padrão, e o modo demo só é ativado explicitamente por `VITE_DEMO_MODE=true`.

## [2026-09-22] Decisão: Persistência da sessão no frontend
**Contexto**: A documentação exige autenticação, guarda de rotas privadas e integração com `GET /auth/me`, mas não define como o frontend deve preservar a sessão entre recarregamentos.
**Decisão**: Manter o token JWT no `localStorage`, concentrar o estado de sessão em Zustand e persistir apenas o perfil mínimo da conta para evitar oscilações visuais enquanto `/auth/me` é consultado. Respostas HTTP 401 encerram a sessão de forma centralizada no interceptor do Axios. No modo demonstrativo, o mesmo contrato de estado é preenchido com dados explicitamente sintéticos.
**Alternativas consideradas**: Cookies HTTP-only exigiriam uma mudança no contrato de autenticação do backend; manter tudo somente em memória encerraria a sessão a cada recarregamento. Ambas foram descartadas para preservar o contrato atual e a experiência esperada no MVP.

## [2026-09-22] Decisão: Configuração flat do ESLint 9
**Contexto**: O frontend já declarava ESLint 9 e um script `npm run lint`, mas não possuía `eslint.config.js`, fazendo o comando falhar antes de analisar qualquer arquivo.
**Decisão**: Adotar a configuração flat oficial para TypeScript, React Hooks e React Refresh usando apenas as dependências já declaradas pelo projeto.
**Alternativas consideradas**: Rebaixar o ESLint para uma versão compatível com `.eslintrc` ou remover o script. As duas opções foram descartadas por introduzirem regressão de dependência ou eliminarem uma verificação exigida pelos requisitos de manutenibilidade.
