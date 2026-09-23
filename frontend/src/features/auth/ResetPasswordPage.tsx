import axios from 'axios';
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from './store';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const sessionToken = useAuthStore((state) => state.token);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (sessionToken) return <Navigate to='/' replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!token) { setError('O link de recuperação está incompleto. Solicite um novo link.'); return; }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
    } catch (cause) {
      const detail = axios.isAxiosError<{ detail?: string }>(cause) ? cause.response?.data?.detail : undefined;
      setError(detail || 'Não foi possível redefinir a senha. Solicite um novo link.');
    } finally {
      setSaving(false);
    }
  }

  return <main className='auth-page'>
    <section className='auth-story'><Link className='auth-brand' to='/'><img src='/vault-icon.svg' alt='' />Vault</Link><div><span className='auth-spectrum' /><h1>Uma nova senha. A mesma clareza para seguir em frente.</h1><p>Escolha uma senha exclusiva e mantenha o acesso ao seu dinheiro protegido.</p></div><blockquote>Segurança sem ruído.</blockquote></section>
    <section className='auth-form-wrap'>{done ? <div className='auth-form auth-success' role='status'><MailCheck /><h2>Senha atualizada</h2><p>Seu acesso está pronto novamente.</p><Link className='secondary-button' to='/login'><ArrowLeft size={16} />Entrar no Vault</Link></div> : <form className='auth-form' onSubmit={submit}><div className='auth-form-heading'><KeyRound /><h2>Crie uma nova senha</h2><p>O link é válido por 30 minutos.</p></div><label>Nova senha<input type='password' autoComplete='new-password' minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Confirmar nova senha<input type='password' autoComplete='new-password' minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error && <p className='form-error' role='alert'>{error}</p>}<button className='primary-button' disabled={saving}>{saving ? 'Salvando...' : 'Redefinir senha'}</button><p className='auth-switch'><Link to='/forgot-password'><ArrowLeft size={14} />Solicitar outro link</Link></p></form>}</section>
  </main>;
}
