# Changelog Técnico

## [2026-09-22] Decisão: Persistência da sessão no frontend
**Contexto**: A documentação exige autenticação, guarda de rotas privadas e integração com `GET /auth/me`, mas não define como o frontend deve preservar a sessão entre recarregamentos.
**Decisão**: Manter o token JWT no `localStorage`, concentrar o estado de sessão em Zustand e persistir apenas o perfil mínimo da conta para evitar oscilações visuais enquanto `/auth/me` é consultado. Respostas HTTP 401 encerram a sessão de forma centralizada no interceptor do Axios. No modo demonstrativo, o mesmo contrato de estado é preenchido com dados explicitamente sintéticos.
**Alternativas consideradas**: Cookies HTTP-only exigiriam uma mudança no contrato de autenticação do backend; manter tudo somente em memória encerraria a sessão a cada recarregamento. Ambas foram descartadas para preservar o contrato atual e a experiência esperada no MVP.

## [2026-09-22] Decisão: Configuração flat do ESLint 9
**Contexto**: O frontend já declarava ESLint 9 e um script `npm run lint`, mas não possuía `eslint.config.js`, fazendo o comando falhar antes de analisar qualquer arquivo.
**Decisão**: Adotar a configuração flat oficial para TypeScript, React Hooks e React Refresh usando apenas as dependências já declaradas pelo projeto.
**Alternativas consideradas**: Rebaixar o ESLint para uma versão compatível com `.eslintrc` ou remover o script. As duas opções foram descartadas por introduzirem regressão de dependência ou eliminarem uma verificação exigida pelos requisitos de manutenibilidade.
