// Small moments of delight: confetti burst and haptic tap. Both respect reduced-motion.

const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function confetti(opts: { x?: number; y?: number; count?: number } = {}) {
  if (typeof window === 'undefined' || reduced()) return;
  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  if (!ctx) return c.remove();
  ctx.scale(dpr, dpr);
  const colors = ['#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#ec4899'];
  const x0 = opts.x ?? innerWidth / 2;
  const y0 = opts.y ?? innerHeight / 3;
  const ps = Array.from({ length: opts.count ?? 130 }, () => ({
    x: x0, y: y0, vx: (Math.random() - 0.5) * 15, vy: Math.random() * -13 - 3, r: Math.random() * 7 + 4,
    c: colors[Math.floor(Math.random() * colors.length)], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
  }));
  let frame = 0;
  const total = 120;
  const tick = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    frame++;
    for (const p of ps) {
      p.vy += 0.33;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - frame / total);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    }
    if (frame < total) requestAnimationFrame(tick);
    else c.remove();
  };
  requestAnimationFrame(tick);
}

export function buzz(ms = 25) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}
