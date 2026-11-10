# /performance

**Purpose:** Objective performance score per person, ranking, department averages.

**Access:** Everyone. Manager/Super Admin see their team; members see their own score (and department peers if visibility is on). CSV export for managers.

**Formula** (`userStats` in `src/lib/metrics.ts`)
| Metric | Definition |
|---|---|
| Attendance % | present days (half day = 0.5) ÷ working days in window. Excludes weekly off, approved leave, days before joining. |
| Punctuality % | non-late days ÷ present days |
| OKR % | average weighted KR progress, current cycle |
| Task % | done ÷ assigned |
| **Score** | weighted average with Settings → Performance weights (must total 100). Metrics with no data are skipped and weights re-balanced. |

**Windows:** 7 / 30 / 90 days.

**Caution:** A score is a conversation starter, not a verdict. Use it with 1:1s, not as the only input for pay or firing decisions.

**Migration notes:** For large teams, compute in SQL (materialized view refreshed nightly).
