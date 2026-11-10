# /okrs — Objectives & Key Results

**Purpose:** Set, align and track OKRs from company → department → individual.

**Access**
- Super Admin: create any level for anyone, see everything
- Manager: department + individual OKRs for their team; apply templates
- Member: own individual OKRs (if Settings → OKRs → "Members can create" is on); update own KRs

**Features**
- Cycle selector (Settings → OKRs), tabs: My OKRs / My team / Company & departments / Everything
- Objective: title, why, level, owner, department, parent alignment, due date, status (on track / at risk / off track / done)
- Key results: number, %, currency, yes/no; start, target, current, unit, weight. Target below start = lower is better.
- KR check-ins with notes (`kr_updates`) + history
- **Apply template** to many people at once (`?template=<id>` deep link from Templates)

**Progress:** `krProgress` / `objectiveProgress` in `src/lib/metrics.ts` (weighted).

**Data:** `objectives`, `key_results`, `kr_updates`, `okr_templates`, `profiles`, `departments`.

**Migration notes:** RLS `can_edit_objective()` mirrors `canEditObjective()` in `src/lib/permissions.ts`.
