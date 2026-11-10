'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Crown, Heart, LogIn, Moon, Sun, Target, User, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { DATA_MODE, SHOW_DEMO_LOGINS, db } from '@/lib/data';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/data/seed';
import { errMsg } from '@/lib/format';
import { Button, ErrorNote, Field, Input } from '@/components/ui';
import { Wordmark } from '@/components/bits';

const ROLE_ICON = [Crown, Users, User];
const FEATURES = [
  { icon: Camera, text: 'Selfie check-in & breaks' },
  { icon: Target, text: 'OKRs from company to you' },
  { icon: Users, text: 'Live team tracker' },
  { icon: Heart, text: 'Kudos & daily standup' },
];

export default function LoginPage() {
  const { user, loading, signIn, settings } = useAuth();
  const { dark, toggle } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  async function go(e?: FormEvent, em = email, pw = password) {
    e?.preventDefault();
    setBusy(em);
    setErr('');
    try {
      await signIn(em, pw);
      router.replace('/dashboard');
    } catch (x) {
      setErr(errMsg(x));
      setBusy(null);
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-brand p-12 text-on-brand lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-20 top-10 h-96 w-96 animate-float rounded-full bg-emerald-400/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] animate-float rounded-full bg-violet-500/25 blur-3xl [animation-delay:-5s]" />
        <div className="pointer-events-none absolute right-24 top-1/3 h-72 w-72 animate-float rounded-full bg-amber-400/20 blur-3xl [animation-delay:-10s]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px]" />

        <Wordmark className="relative text-2xl" />
        <div className="stagger relative">
          <p className="text-sm uppercase tracking-[0.35em] text-on-brand/60">{settings.company_name} · Team OS</p>
          <h1 className="mt-4 text-6xl font-semibold leading-[1.05] tracking-tight">
            Show up.
            <br />
            Grow together.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-amber-200 to-violet-300 bg-clip-text text-transparent">Be heard.</span>
          </h1>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3 rounded-2xl bg-on-brand/10 px-4 py-3 text-sm backdrop-blur">
                <f.icon size={18} className="shrink-0" /> {f.text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-on-brand/60">{settings.tagline}</p>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <button onClick={toggle} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl text-neutral-500 hover:bg-neutral-100" aria-label="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="w-full max-w-sm animate-fade-up">
          <Wordmark className="mb-10 block text-xl lg:hidden" />
          <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-neutral-500">Sign in with your work email.</p>
          <form onSubmit={go} className="mt-6 space-y-4">
            <Field label="Email">
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
            </Field>
            <Field label="Password">
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
            </Field>
            <ErrorNote text={err} />
            <Button type="submit" className="w-full" size="lg" disabled={!!busy}>
              <LogIn size={18} /> {busy === email && busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {SHOW_DEMO_LOGINS && (
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <span className="h-px flex-1 bg-neutral-200" /> Try a demo role <span className="h-px flex-1 bg-neutral-200" />
              </div>
              <div className="stagger space-y-2">
                {DEMO_ACCOUNTS.map((a, i) => {
                  const Icon = ROLE_ICON[i] ?? User;
                  return (
                    <button
                      key={a.email}
                      type="button"
                      disabled={!!busy}
                      onClick={() => {
                        setEmail(a.email);
                        setPassword(DEMO_PASSWORD);
                        go(undefined, a.email, DEMO_PASSWORD);
                      }}
                      className="card-hover group flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-surface px-4 py-3 text-left disabled:opacity-60"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700 transition group-hover:bg-brand group-hover:text-on-brand">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{a.label}</span>
                        <span className="block truncate text-xs text-neutral-500">{a.hint}</span>
                      </span>
                      {busy === a.email ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                      ) : (
                        <ArrowRight size={16} className="text-neutral-400 transition group-hover:translate-x-1" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-xs text-neutral-400">Password for all demo users: {DEMO_PASSWORD}</p>
              {DATA_MODE === 'demo' && (
                <button
                  type="button"
                  className="mx-auto mt-1 block text-xs text-neutral-400 underline hover:text-neutral-600"
                  onClick={() => {
                    db.resetDemo?.();
                    location.reload();
                  }}
                >
                  Reset demo data
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
