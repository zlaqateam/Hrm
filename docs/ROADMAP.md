# Roadmap (suggested, ranked by value ÷ effort)

## Next (high value, low effort)
✅ Done in v2: server-side timestamps, geofence, holiday calendar, notifications, kudos, standup, mood pulse, dark mode, PWA manifest.

1. **Multiple offices** for geofencing (table `offices`, pick nearest).
2. **Web push notifications** (service worker + VAPID) on top of the in-app bell.
4. **Auto check-out**: nightly Supabase cron (pg_cron) closes open records at `work_end` and flags them.
5. **Selfie retention**: cron to delete selfies older than N days.
6. **Weekly email/WhatsApp digest** per manager: attendance %, late list, OKRs at risk.

## Later
- Face-match on check-in (compare with profile photo; needs consent + DPDP review).
- Shift rosters and multiple shifts per department.
- Payroll export (attendance + leave → CSV for your payroll provider).
- PWA install + offline check-in queue.
- 360° feedback and quarterly reviews built on OKR history.
- AI summaries: "what changed this week" per team from KR check-ins and tasks.
- Push notifications (break over limit, leave approved, mention in chat).
- Chat: threads, file attachments, mentions, reactions.

## Known trade-offs in v1
- Dashboard data loads client-side per page. At 200+ employees, move aggregates to SQL views / RPC.
- Members' leaderboard uses department peers only when "members see team" is on.
- Chat is simple (no threads/files).
