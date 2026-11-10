# Components

| File | Contents |
|---|---|
| `ui.tsx` | Design system: Card, Button, Input, Select, Textarea, Field, Badge, Progress, Modal, Stat, Empty, PageHeader, Avatar, Tabs, Toggle, Table, RequireRole |
| `bits.tsx` | LiveBadge, AttendanceBadge, OkrStatusBadge, SelfieImg, Bars, HBars, Ring, Wordmark |
| `SelfieCamera.tsx` | Camera capture with timestamp watermark + upload fallback |
| `Shell.tsx` | Sidebar navigation (filtered by role + enabled modules), mobile menu |
| `widgets.tsx` | Dashboard widgets registry |
| `okr.tsx` | KR editor, New objective, KR check-in, Apply template |
| `CommandPalette.tsx` | Ctrl/⌘ K launcher for pages, people and actions |
| `NotificationBell.tsx` | In-app notifications dropdown |

Motion: `useMounted` (animate bars/rings from 0), `CountUp`, `Skeleton`/`PageSkeleton`, `.stagger` and `.card-hover` utilities in `globals.css`, Tailwind animations in `tailwind.config.ts`. Theme: `src/lib/theme.tsx`. Toasts: `src/lib/toast.tsx`. Confetti/haptics: `src/lib/delight.ts`.

Brand: white-first, colour from `--brand` (Settings → General). Wordmark uses the `Nasi` font if you add `/public/fonts/Nasi.woff2` (see `globals.css`).
