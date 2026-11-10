# v2: what changed

## Experience
- **Dark mode** (light / dark / follows system). Every neutral colour is a CSS variable, so the whole UI flips with no flash on load.
- **Motion everywhere**: page transitions, staggered card entrances, count-up numbers, animated progress bars and score rings, sheet-style modals that slide up on phones, pop-in notification badges, shimmering skeleton loaders. All motion is disabled for people with "reduce motion" switched on.
- **Confetti + haptics** for on-time check-ins, key results achieved, tasks done and kudos sent.
- **Toasts** confirm every important action.
- **Top bar**: live shift pill (Check in / working time / on break / day done), search, theme toggle, notifications.
- **Command palette** (Ctrl K / ⌘K): jump to any page, person or action.
- **Mobile**: bottom tab bar with a raised Attendance button, card-style history list, safe-area aware, installable as an app (PWA manifest).
- New login screen with animated brand panel and role cards.

## Features
| Feature | Where |
|---|---|
| Daily standup: focus at check-in, wrap-up at check-out | Attendance, Team Tracker, Records, Standup widget |
| Mood pulse (optional emoji, managers see averages only) | Attendance, Team pulse widget |
| Geofence: off / flag / block with office location + radius | Settings → Attendance, Records shows "Outside · 1.2 km" |
| On-time streaks | Attendance, Welcome banner |
| Smart insights (late patterns, missing check-outs, long breaks, OKRs at risk, pending leave, perfect week) | Dashboard |
| Kudos wall with company values | `/kudos`, Kudos widget |
| Calendar with holidays, leave, anniversaries | `/calendar`, Celebrations widget |
| In-app notifications (kudos, tasks, leave requests/decisions, DMs, @mentions) | Bell in top bar |
| Holidays excluded from attendance %, score and streaks | everywhere |
| **Server-side timestamps** (check-in/out, breaks, late status use the database clock) | `supabase/migrations/0003_v2_features.sql` |

## Upgrading an existing Supabase project
Run `supabase/migrations/0003_v2_features.sql`. It is additive and safe to re-run.
Demo mode: data was reseeded automatically (storage key `zlaqa_os_demo_v2`).
