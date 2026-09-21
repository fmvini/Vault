import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleDollarSign, Leaf } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api, isDemoMode } from "../../lib/api";
import { useAuthStore } from "./store";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres")
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Informe seu nome"),
  default_currency: z.string().length(3)
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [serverError, setServerError] = useState("");
  const schema = isRegister ? registerSchema : loginSchema;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { default_currency: "BRL" }
  });

  const onSubmit = async (values: RegisterValues) => {
    setServerError("");
    try {
      if (isDemoMode) {
        setToken("demo-token");
      } else if (isRegister) {
        await api.post("/auth/register", values);
        const { data } = await api.post("/auth/login", { email: values.email, password: values.password });
        setToken(data.access_token);
      } else {
        const { data } = await api.post("/auth/login", values as LoginValues);
        setToken(data.access_token);
      }
      navigate("/");
    } catch (error) {
      setServerError("Não foi possível entrar. Confira seus dados e tente novamente.");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="auth-brand" to="/"><Leaf fill="currentColor" />FinTrack</Link>
        <div>
          <span className="auth-spectrum" />
          <h1>Seu dinheiro fica mais leve quando cada escolha encontra o seu lugar.</h1>
          <p>Registre o presente, enxergue o mês e antecipe o que vem depois — sem ruído e sem julgamento.</p>
        </div>
        <blockquote>Clareza hoje.<br />Mais liberdade amanhã.</blockquote>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth-form-heading"><CircleDollarSign /><h2>{isRegister ? "Crie sua conta" : "Que bom ter você de volta"}</h2><p>{isRegister ? "Comece organizando o mês atual." : "Entre para continuar de onde parou."}</p></div>
          {isRegister && <label>Nome<input autoComplete="name" {...register("name")} />{errors.name && <small>{errors.name.message}</small>}</label>}
          <label>E-mail<input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...register("email")} />{errors.email && <small>{errors.email.message}</small>}</label>
          <label>Senha<input type="password" autoComplete={isRegister ? "new-password" : "current-password"} {...register("password")} />{errors.password && <small>{errors.password.message}</small>}</label>
          {isRegister && <label>Moeda padrão<select {...register("default_currency")}><option value="BRL">Real brasileiro (BRL)</option><option value="USD">Dólar americano (USD)</option><option value="EUR">Euro (EUR)</option></select></label>}
          {serverError && <p className="form-error" role="alert">{serverError}</p>}
          <button className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}<ArrowRight size={17} /></button>
          <p className="auth-switch">{isRegister ? "Já possui uma conta?" : "Ainda não tem uma conta?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Entrar" : "Criar conta"}</Link></p>
        </form>
      </section>
    </main>
  );
}
