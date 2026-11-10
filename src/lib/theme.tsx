'use client';
// Light / dark / system theme + brand colour variables.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { hexToRgb } from './format';

export type ThemeMode = 'light' | 'dark' | 'system';
const KEY = 'zlaqa_theme';

/** Inline script in <head>: applies the theme before paint (no flash). */
export const themeScript = `(function(){try{var m=localStorage.getItem('${KEY}')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

const Ctx = createContext<{ mode: ThemeMode; dark: boolean; setMode(m: ThemeMode): void; toggle(): void }>({
  mode: 'system', dark: false, setMode: () => {}, toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setModeState((localStorage.getItem(KEY) as ThemeMode) || 'system');
  }, []);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const d = mode === 'dark' || (mode === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', d);
      setDark(d);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const setMode = (m: ThemeMode) => {
    localStorage.setItem(KEY, m);
    setModeState(m);
  };

  return <Ctx.Provider value={{ mode, dark, setMode, toggle: () => setMode(dark ? 'light' : 'dark') }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

function luminance(rgb: string) {
  const [r, g, b] = rgb.split(' ').map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Writes --brand / --on-brand. A very dark brand flips to near-white in dark mode. */
export function BrandVars() {
  const { settings } = useAuth();
  const { dark } = useTheme();
  useEffect(() => {
    let brand = hexToRgb(settings.primary_color);
    if (dark && luminance(brand) < 0.3) brand = '244 244 245';
    const on = luminance(brand) > 0.62 ? '24 24 27' : '255 255 255';
    const root = document.documentElement.style;
    root.setProperty('--brand', brand);
    root.setProperty('--on-brand', on);
  }, [settings.primary_color, dark]);
  return null;
}
