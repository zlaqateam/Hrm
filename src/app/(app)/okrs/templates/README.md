# /okrs/templates — OKR Templates

**Purpose:** Reusable OKR sets per department and level, so every role starts each cycle with good OKRs in one click.

**Access:** Super Admin (any department), Manager (own department; department is locked).

**Seeded templates:** Developer, Engineering Manager, Sales pipeline, Creative audience growth, Operations excellence, Research evidence, Company north star, Personal growth (any role).

**Features:** create, edit, duplicate, delete; nested objective + KR editor; filter by department; **Use** → opens `/okrs?template=<id>` → pick people → creates objectives + KRs for each person in the chosen cycle.

**Data:** `okr_templates.objectives` is JSON: `[{ title, description, key_results: [{ title, metric_type, start_value, target_value, unit, weight }] }]`.

**Customize:** `scope` decides the level created (individual / department / company). Department-specific templates only offer people from that department.

**Migration notes:** JSON column (jsonb). Any document or SQL store works.
