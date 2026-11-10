'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface T {
  id: number;
  msg: string;
  tone: Tone;
  sub?: string;
}

const Ctx = createContext<(msg: string, tone?: Tone, sub?: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const push = useCallback((msg: string, tone: Tone = 'success', sub?: string) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-3), { id, msg, tone, sub }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6" aria-live="polite">
        {list.map((t) => {
          const Icon = t.tone === 'success' ? CircleCheck : t.tone === 'error' ? CircleAlert : Info;
          const color = t.tone === 'success' ? 'text-emerald-500' : t.tone === 'error' ? 'text-rose-500' : 'text-violet-500';
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl border border-neutral-200 bg-surface p-3.5 shadow-xl">
              <Icon size={20} className={`mt-0.5 shrink-0 ${color}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium">{t.msg}</div>
                {t.sub && <div className="text-xs text-neutral-500">{t.sub}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
