# /kudos — Kudos & recognition

**Purpose:** Peer recognition wall. Anyone thanks anyone, tagged with a company value. Builds the culture you want to see.

**Access:** Everyone reads and sends. Delete: the sender or Super Admin.

**Features**
- Send kudos (to, value, message up to 280 chars) → recipient gets a notification + confetti for the sender
- Wall with filters: Everyone / For me / From me
- Stats: kudos this month, received, given, top value
- "Most appreciated this month" leaderboard
- Deep link `/kudos?new=1` opens the composer (used by dashboard quick actions and Ctrl K)

**Customize:** Settings → Modules → Kudos values (your culture words). Toggle the module on/off.

**Data:** `kudos` (`from_id`, `to_id`, `value`, `message`), `notifications`.

**Advice:** Keep kudos out of the performance score. Mixing recognition with ratings turns thanks into lobbying.
