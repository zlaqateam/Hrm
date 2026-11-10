# /chat — Team Chat

**Purpose:** Team communication: public channels, auto department channels, private groups and direct messages. Realtime.

**Access**
- Public channels: everyone
- Department channels: members of that department (auto-created with each department)
- Private / DM: listed members only
- Create public/department channels: Manager+. Anyone can create private groups and DMs.
- Delete: own messages; channel creator or Super Admin for channels

**Data:** `channels` (`type`, `department_id`, `member_ids[]`), `messages`. DMs are private channels named `dm` with 2 members. RLS: `can_see_channel()`.

**Realtime:** Supabase `postgres_changes` on `messages` (enabled in migration). Demo: syncs across tabs.

**Toggle:** Settings → Modules → Team Chat.

**Roadmap:** threads, mentions, attachments, reactions, unread counts.
