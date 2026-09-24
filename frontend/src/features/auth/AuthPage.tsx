import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { ArrowLeft, ArrowRight, CircleDollarSign, MailCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api, isDemoMode } from "../../lib/api";
import { useAuthStore } from "./store";

const baseSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().optional(),
  name: z.string().optional(),
  default_currency: z.string().length(3)
});

type AuthValues = z.infer<typeof baseSchema>;

export function AuthPage({ mode }: { mode: "login" | "register" | "forgot" }) {
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const schema = useMemo(() => baseSchema.superRefine((values, context) => {
    if (!isForgot && (!values.password || values.password.length < 8)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "A senha deve ter pelo menos 8 caracteres" });
    }
    if (isRegister && (!values.name || values.name.trim().length < 2)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "Informe seu nome" });
    }
  }), [isForgot, isRegister]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthValues>({
    resolver: zodResolver(schema),
    defaultValues: { default_currency: "BRL", email: "", password: "", name: "" }
  });

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (values: AuthValues) => {
    setServerError("");
    try {
      if (isForgot) {
        if (!isDemoMode) await api.post("/auth/forgot-password", { email: values.email });
        setRecoverySent(true);
        return;
      }
      if (isDemoMode) {
        setSession("demo-token", {
          name: isRegister ? values.name!.trim() : "Marina Ribeiro",
          email: values.email,
          default_currency: values.default_currency
        });
      } else if (isRegister) {
        await api.post("/auth/register", values);
        const { data } = await api.post("/auth/login", { email: values.email, password: values.password });
        setSession(data.access_token);
      } else {
        const { data } = await api.post("/auth/login", { email: values.email, password: values.password });
        setSession(data.access_token);
      }
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";
      navigate(destination, { replace: true });
    } catch (error) {
      const detail = axios.isAxiosError<{ detail?: string }>(error) ? error.response?.data?.detail : undefined;
      setServerError(detail || (isRegister ? "Não foi possível criar sua conta. Tente novamente." : "Não foi possível entrar. Confira seus dados e tente novamente."));
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="auth-brand" to="/">
          <span className="brand-mark" aria-hidden="true"><img src="/vault-icon-dark.svg" alt="" /></span>
          Vault
        </Link>
        <div>
          <span className="auth-spectrum" />
          <h1>Seu dinheiro fica mais leve quando cada escolha encontra o seu lugar.</h1>
          <p>Registre o presente, enxergue o mês e antecipe o que vem depois — sem ruído e sem julgamento.</p>
        </div>
        <blockquote>Clareza hoje.<br />Mais liberdade amanhã.</blockquote>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {recoverySent ? <div className="auth-success" role="status"><MailCheck /><h2>Confira seu e-mail</h2><p>Se existir uma conta para esse endereço, você receberá as instruções de recuperação.</p><p className="auth-spam-hint">Não encontrou o e-mail? Verifique também a caixa de spam ou lixo eletrônico.</p><Link className="secondary-button" to="/login"><ArrowLeft size={16} />Voltar para o login</Link></div> : <>
            <div className="auth-form-heading"><CircleDollarSign /><h2>{isForgot ? "Recupere seu acesso" : isRegister ? "Crie sua conta" : "Que bom ter você de volta"}</h2><p>{isForgot ? "Enviaremos instruções seguras para o seu e-mail." : isRegister ? "Comece organizando o mês atual." : "Entre para continuar de onde parou."}</p></div>
            {isDemoMode && !isForgot && <p className="demo-notice">Ambiente demonstrativo: use qualquer e-mail e uma senha com 8 caracteres.</p>}
            {isRegister && <label>Nome<input autoComplete="name" {...register("name")} />{errors.name && <small>{errors.name.message}</small>}</label>}
            <label>E-mail<input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...register("email")} />{errors.email && <small>{errors.email.message}</small>}</label>
            {!isForgot && <label>Senha<input type="password" autoComplete={isRegister ? "new-password" : "current-password"} {...register("password")} />{errors.password && <small>{errors.password.message}</small>}{!isRegister && <Link className="forgot-link" to="/forgot-password">Esqueci minha senha</Link>}</label>}
            {isRegister && <label>Moeda padrão<select {...register("default_currency")}><option value="BRL">Real brasileiro (BRL)</option><option value="USD">Dólar americano (USD)</option><option value="EUR">Euro (EUR)</option></select></label>}
            {serverError && <p className="form-error" role="alert">{serverError}</p>}
            <button className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Aguarde..." : isForgot ? "Enviar instruções" : isRegister ? "Criar conta" : "Entrar"}<ArrowRight size={17} /></button>
            {isForgot ? <p className="auth-switch"><Link to="/login"><ArrowLeft size={14} />Voltar para o login</Link></p> : <p className="auth-switch">{isRegister ? "Já possui uma conta?" : "Ainda não tem uma conta?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Entrar" : "Criar conta"}</Link></p>}
          </>}
        </form>
      </section>
    </main>
  );
}
