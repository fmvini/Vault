import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { LEGAL_VERSION, SUPPORT_EMAIL } from './constants';
import { LegalFooter } from './LegalFooter';
import { useCookieConsent } from './cookieConsent';

type DocumentKind = 'terms' | 'privacy' | 'cookies';
const documents: Record<DocumentKind, { title: string; introduction: string; sections: { title: string; text: string }[] }> = {
  terms: {
    title: 'Termos de Uso',
    introduction: 'Estas são as condições para usar o Vault, uma ferramenta de organização de finanças pessoais. Leia também a Política de Privacidade antes de criar uma conta ou entrar.',
    sections: [
      { title: 'O que o Vault oferece', text: 'O Vault permite registrar receitas e despesas, organizar categorias, acompanhar limites e metas de poupança e planejar gastos recorrentes. Os registros são informados por você. O serviço não movimenta dinheiro, não conecta contas bancárias e não oferece aconselhamento financeiro, jurídico ou de investimento.' },
      { title: 'Sua conta e seu aceite', text: 'Ao se cadastrar ou fazer login, você precisa marcar o aceite dos Termos de Uso e da Política de Privacidade. Registramos a versão dos documentos e a data do aceite mais recente. Você deve fornecer dados corretos, proteger sua senha e comunicar suspeitas de acesso indevido ao suporte. Não compartilhe credenciais de outras pessoas.' },
      { title: 'Uso responsável', text: 'Use o Vault apenas para atividades lícitas. Não tente acessar dados de outras pessoas, explorar vulnerabilidades, contornar medidas de segurança ou prejudicar a disponibilidade do serviço. Cada conta permite acesso apenas aos dados do seu titular.' },
      { title: 'Registros e cálculos', text: 'Você é responsável por conferir os dados que registra. Totais e conversões cambiais auxiliam a organização e podem diferir dos valores aplicados por bancos e outros serviços. Notificações por e-mail dependem das suas preferências e da disponibilidade do provedor; não substituem o acompanhamento de vencimentos.' },
      { title: 'Disponibilidade e responsabilidade', text: 'O serviço pode passar por manutenção, atualizações ou interrupções. Guarde cópias dos registros importantes e confira as informações antes de tomar decisões. Estes termos não afastam direitos nem responsabilidades previstos na legislação aplicável.' },
      { title: 'Demonstração e encerramento', text: 'A demonstração pública usa dados fictícios em uma sessão temporária de 30 minutos. Não insira informações pessoais ou financeiras reais nessa demonstração. Para encerrar sua conta ou solicitar a eliminação de dados, contate o suporte pelo e-mail abaixo. Pedidos que afetem uma conta exigem confirmação de titularidade.' },
      { title: 'Atualizações e contato', text: 'Alterações relevantes serão refletidas na versão e na data destes documentos e apresentadas para aceite no próximo cadastro ou login. Dúvidas, problemas de acesso e solicitações relacionadas ao serviço podem ser enviadas ao suporte. Aplica-se a legislação brasileira, preservados os direitos dos usuários.' }
    ]
  },
  privacy: {
    title: 'Política de Privacidade',
    introduction: 'Aqui você encontra quais informações o Vault utiliza, para quais finalidades e como solicitar atendimento sobre seus dados pessoais.',
    sections: [
      { title: 'Dados utilizados', text: 'Utilizamos nome, e-mail, senha protegida por hash, moeda escolhida e preferências de notificação. Também armazenamos os registros financeiros que você fornece: transações, categorias, gastos fixos, limites, metas de poupança e aportes. Registramos a versão e a data do aceite mais recente dos documentos. Informações técnicas de requisições podem ser tratadas pela infraestrutura para operar e proteger o serviço.' },
      { title: 'Finalidades e bases de tratamento', text: 'Os dados de conta e os registros financeiros são usados para prestar o serviço solicitado, autenticar seu acesso, salvar seu planejamento e calcular os painéis. O envio de recuperação de senha permite recuperar o acesso, e as notificações financeiras seguem suas preferências. Conforme a finalidade, o tratamento se apoia na execução do serviço, em obrigações legais ou na proteção e segurança da aplicação. Usos opcionais baseados em consentimento exigem uma escolha específica e podem ser revogados.' },
      { title: 'Armazenamento e segurança', text: 'Os dados da conta e os registros financeiros ficam no banco de dados do serviço. A senha é armazenada como hash; o Vault não precisa conhecer sua senha original para validar o acesso. O navegador guarda o token de sessão, uma cópia do perfil e preferências necessárias. Evite manter uma sessão aberta em dispositivos compartilhados e use a opção Sair da conta ao terminar.' },
      { title: 'Serviços que participam da operação', text: 'A hospedagem utiliza Vercel, e o banco de produção utiliza PostgreSQL no Supabase. E-mails de recuperação e notificações podem ser enviados por Gmail SMTP ou Resend, conforme a configuração do serviço. Para isso, o provedor de e-mail recebe o endereço e o conteúdo da mensagem. A consulta de câmbio usa Frankfurter com códigos de moeda; não precisa receber seu perfil nem os registros individuais. Esses fornecedores podem processar dados fora do Brasil conforme sua infraestrutura e as regras aplicáveis.' },
      { title: 'Tempo de conservação', text: 'Os dados são mantidos enquanto necessários para oferecer a conta e suas funcionalidades. Ao solicitar o encerramento, o pedido de eliminação será avaliado, considerando eventuais obrigações legais, segurança e exercício de direitos. Dados em cópias de segurança podem permanecer até o fim do ciclo de retenção da infraestrutura. Consulte o suporte para informações sobre a conservação dos dados da sua conta.' },
      { title: 'Seus direitos e como pedir atendimento', text: 'Você pode solicitar confirmação de tratamento, acesso, correção, informações sobre compartilhamento e, nas hipóteses aplicáveis, eliminação, anonimização, bloqueio, portabilidade, oposição ou revogação de consentimento. Envie sua solicitação ao e-mail abaixo. Podemos pedir as informações necessárias para confirmar a titularidade e proteger seus dados. O aceite desta política não é uma autorização genérica para publicidade ou para qualquer uso dos seus dados.' },
      { title: 'Cookies, preferências e demonstração', text: 'O Vault usa armazenamento do navegador para sessão e preferências, conforme a Política de Cookies. Não há rastreadores de publicidade ou análise de navegação na aplicação atual. A demonstração tem sessão isolada e temporária; não utilize dados reais nesse ambiente. Mudanças relevantes de privacidade serão descritas em uma nova versão desta política.' }
    ]
  },
  cookies: {
    title: 'Política de Cookies',
    introduction: 'Cookies são pequenos arquivos que um site pode salvar no navegador para lembrar informações entre visitas. O armazenamento local (localStorage) e o armazenamento de sessão (sessionStorage) têm uma função parecida, mas não são enviados automaticamente em cada requisição.',
    sections: [
      { title: 'O que usamos hoje', text: 'O aplicativo Vault usa principalmente localStorage e sessionStorage. Não instala cookies de publicidade nem ferramentas de análise de navegação. Serviços de hospedagem podem processar informações técnicas necessárias à entrega e à segurança das páginas. O aviso de cookies também explica as tecnologias de armazenamento usadas pelo aplicativo.' },
      { title: 'Sessão e perfil: necessários', text: 'fintrack-token mantém a autenticação; vault-user guarda uma cópia do perfil para apresentar sua conta. Ambos são removidos ao sair da conta. O token tem validade limitada pela API; a expiração de acesso não remove automaticamente o arquivo do navegador. Esse armazenamento é necessário para entrar e usar suas informações com uma sessão autenticada.' },
      { title: 'Tema, demonstração e sua escolha', text: 'vault-theme lembra o tema escolhido. vault-preview-session e vault-preview-theme usam sessionStorage para a demonstração e são separados da sua conta real; a sessão de demonstração expira em 30 minutos. vault-cookie-consent guarda a escolha de aceitar ou rejeitar opcionais, a versão e a data. As preferências locais permanecem até você alterá-las ou limpar os dados do site.' },
      { title: 'Aceitar ou rejeitar opcionais', text: 'As duas opções do aviso são válidas e não impedem cadastro, login ou uso da conta. Rejeitar opcionais mantém somente o armazenamento necessário ao serviço e às preferências solicitadas. Atualmente não há cookies opcionais para ativar. Se novas finalidades opcionais forem adicionadas, esta política e o mecanismo de escolha deverão ser atualizados antes da ativação.' },
      { title: 'Como alterar sua escolha', text: 'Use Preferências de cookies no rodapé de qualquer página para reabrir o aviso e revisar sua decisão. Você também pode apagar dados e bloquear armazenamento pelas configurações do navegador; isso pode encerrar sua sessão, restaurar o tema padrão e fazer o aviso aparecer novamente. Se o navegador não permitir salvar a preferência, ela valerá apenas durante a visita atual.' }
    ]
  }
};

export function LegalPage({ kind }: { kind: DocumentKind }) {
  const document = documents[kind];
  const openCookies = useCookieConsent((state) => state.open);
  useEffect(() => {
    const previousTitle = window.document.title;
    window.document.title = document.title + ' | Vault';
    window.scrollTo(0, 0);
    return () => { window.document.title = previousTitle; };
  }, [document.title]);
  return <div className="public-page">
    <header className="public-header"><Link className="brand" to="/" aria-label="Vault — início"><span className="brand-mark" aria-hidden="true"><img className="brand-mark-light" src="/vault-icon.svg" alt="" /><img className="brand-mark-dark" src="/vault-icon-dark.svg" alt="" /></span>Vault</Link><Link className="secondary-button" to="/login"><ArrowLeft size={16} aria-hidden="true" />Voltar ao aplicativo</Link></header>
    <main className="legal-document"><h1>{document.title}</h1><p className="legal-updated">Versão {LEGAL_VERSION} · Atualizado em 10 de outubro de 2026</p><p className="legal-introduction">{document.introduction}</p>
      {kind === 'cookies' && <button className="secondary-button" type="button" onClick={openCookies}>Alterar preferências de cookies</button>}
      {document.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
      <section className="legal-contact"><h2>Fale com o suporte</h2><p>Para dúvidas sobre o Vault ou solicitações sobre privacidade, escreva para:</p><a href={'mailto:' + SUPPORT_EMAIL}><Mail size={17} aria-hidden="true" />{SUPPORT_EMAIL}</a></section>
    </main><LegalFooter />
  </div>;
}
