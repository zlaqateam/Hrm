# /departments

**Purpose:** Organisation structure and per-department dashboards.

**Access:** Super Admin only.

**Features**
- Create / edit / delete (delete blocked while people are inside)
- Name, colour (used across the app), description, head
- Live stats: people, present today %, OKR progress
- **Custom dashboard**: pick widgets for this department; overrides the role dashboard for its managers and members
- Creating a department auto-creates its chat channel

**Data:** `departments` (`dashboard_widgets text[]`, null = role default), `channels`.
