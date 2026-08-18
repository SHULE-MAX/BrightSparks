import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { isConfigured } from '../lib/supabase.js';
import { Button, TextInput } from '../components/Field.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const { session, checking, signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const toast = useToast();

  if (checking) return null;
  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setProblem('');
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);

    if (error) {
      setProblem(
        /invalid login/i.test(error.message)
          ? 'That email address and password do not match. Please try again.'
          : error.message
      );
    }
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      setProblem('Type your email address above first, then press this link again.');
      return;
    }
    const { error } = await resetPassword(email);
    if (error) toast.error(error.message);
    else toast.success('Check your email for a link to set a new password.');
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-navy-deep via-navy to-navy-mid p-5">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div aria-hidden="true" className="text-4xl">
            ✨
          </div>
          <h1 className="mt-2 text-2xl font-extrabold">Bright Sparks Junior School</h1>
          <p className="mt-1 text-sm text-white/70">Website Manager</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          noValidate
        >
          <h2 className="mb-1 text-lg font-bold text-navy">Sign in</h2>
          <p className="mb-5 text-sm text-ink-muted">
            Use the email address and password the school gave you.
          </p>

          {!isConfigured && (
            <p className="mb-5 rounded-xl border-l-4 border-brand-red bg-brand-red/10 px-4 py-3 text-sm font-semibold text-brand-red-dark">
              This dashboard has not been connected to its database yet. Ask whoever set it up to
              add the SUPABASE_URL and SUPABASE_ANON_KEY settings.
            </p>
          )}

          <TextInput
            label="Email address"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@brightsparksjunior.ac.ug"
          />
          <TextInput
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {problem && (
            <p
              role="alert"
              className="mb-4 rounded-xl border-l-4 border-brand-red bg-brand-red/10 px-4 py-3 text-sm font-semibold text-brand-red-dark"
            >
              {problem}
            </p>
          )}

          <Button type="submit" busy={busy} className="w-full" disabled={!isConfigured}>
            Sign in
          </Button>

          <button
            type="button"
            onClick={onForgotPassword}
            className="mt-4 w-full text-center text-xs font-bold text-navy underline"
          >
            I have forgotten my password
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-white/60">
          Only staff accounts created by the school can sign in here.
        </p>
      </div>
    </div>
  );
}
