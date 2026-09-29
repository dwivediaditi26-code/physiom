# Connections + Following + Messaging — design doc

Status: **design + migration ready for review**. Nothing in this doc is live until
`supabase/add_conversations_and_blocks.sql` is run in the Supabase SQL Editor, and
nothing in the app changes behavior until Step 2 (client wiring) lands on top of it.

## The three systems, and why they stay separate

- **Connect** — "we have a professional relationship." Request → Accept/Ignore → Connected.
- **Follow** — "show me their posts." No approval needed, one-directional.
- **Message** — "let me talk to you." Doesn't require either of the above.

None of these ever creates or deletes another one automatically:

| Action | Does it affect the others? |
|---|---|
| Accept a message request | No — never creates a connection or a follow |
| Send/accept a connection request | No — never creates a follow or auto-accepts a message request |
| Follow / unfollow | No — connection and any conversation are untouched |
| Disconnect | Conversation stays; follow (either direction) stays |
| Block | Removes any pending connection + both follow directions between the two people, and stops new messages either way — see [Blocking](#blocking) |

This matches what was already true in the codebase (`connections` and `follows` in
`add_mvp_network_opportunities.sql` / `add_social_tables.sql` are already independent
tables with independent RLS). What's new here is giving `direct_messages` the same kind
of real state instead of being one flat, unlimited table.

## What already existed vs. what this adds

**Already there, untouched by this migration:** `connections` (state machine mostly
correct, one bug fixed below), `follows`, `notifications`, `profiles`, `reports`
(post-only — stays that way).

**New tables:** `conversations`, `user_blocks`, `user_reports`, `conversation_mutes`,
`app_settings`.

**Changed:** `direct_messages` gets three new nullable columns (`conversation_id`,
`request_round`, `client_id`) and a length check — nothing existing is renamed or
dropped, so every current query against it keeps working.

## The message-request state machine

Every pair of people has at most one `conversations` row (`user_low`/`user_high` are the
pair normalized low-to-high, unique together — same "one row per pair regardless of
direction" trick `connections` already used).

```
No conversation yet
        │  first message
        ▼
request_pending ──(3rd message from the same initiator, unanswered)──► blocked from sending a 4th
        │  recipient replies, OR taps Accept
        ▼
accepted ───────────────────────────────────────────► unlimited messages, forever
        │
        │  (from request_pending) recipient taps Decline
        ▼
declined ──(cooldown_until passes)──► request_pending again, new round, new 3-message allowance
```

If the two people are already **connected** when the first message is sent, the
conversation is created straight into `accepted` — connected people never see a request
limit.

**Everything above is enforced by a `BEFORE INSERT` trigger on `direct_messages`**
(`enforce_message_rules()`), not by the app. That's the actual fix for the security hole
found in the audit: the old 3-message cap lived only in `MessagesPage.jsx`, so a 4th
message sent via a direct API call (or an old cached build of the app) would have gone
through. Now the database itself refuses the insert — the trigger runs even for a
brand-new client that's never heard of "requests," an old cached build, or someone
calling the API directly:

- Reject if either side has blocked the other → error `MSG_BLOCKED`
- Reject the 4th unanswered message in a round → error `MSG_LIMIT_REACHED`
- Reject while in the decline cooldown → error `MSG_COOLDOWN`
- Reject if the sender is sending too fast (basic spam guard, default 20/minute) → error `MSG_RATE`
- A `pg_advisory_xact_lock` on the pair means two messages sent at the exact same
  instant (e.g. double-tapping Send, or two devices) can't both slip past the count —
  they're forced to happen one at a time.
- A failed insert never counts — Postgres rolls back the whole attempt, including any
  conversation row the trigger was about to create.

The three-strikes count is *per round, per initiator* — so if Person A sends 3 messages
and Person B never replies, A is stopped. But this can't be dodged by starting a new
conversation, unfollowing/refollowing, or sending a new connection request: the round is
tied to the `conversations` row for that pair, and there is only ever one such row.

## Blocking

`block_user(other_id)`:
1. Records the block.
2. Deletes any **pending** connection between the two (an already-accepted connection is
   left alone — blocking someone you're connected with is a separate, deliberate action
   the UI should probably prompt for, e.g. "block and disconnect?" — not built here, this
   is just the MVP block primitive).
3. Deletes the follow relationship in both directions.
4. From then on, the message trigger rejects any new message either way with
   `MSG_BLOCKED` — existing message history isn't deleted, just frozen.

`unblock_user(other_id)` removes the block; it does **not** restore the deleted
connection/follow — those would need to be re-sent, same as if the person had declined.

## Inbox: Primary vs. Requests

One RPC, `get_inbox(tab, search, limit, before)`, returns everything the inbox screen
needs in one call (other person's profile, last message, unread count, connection
status, follow status, request direction) — no N+1 queries from the client.

- **Primary** = every `accepted` conversation. This includes old conversations that
  existed before this migration (see [Backfill](#backfill-existing-conversations)) and
  new ones that got accepted.
- **Requests** = every `request_pending` conversation the signed-in user is part of,
  labeled `incoming` (someone is waiting on you) or `outgoing` (you're waiting on them) —
  **plus** `declined` conversations, but *only* rows where the signed-in user was the
  original sender. The person who declined never sees that row again, anywhere. This
  matches the agreed design: the sender sees a neutral "closed" state with no
  information about what the other person did afterward.

## Notifications

- `request_pending`, first message of a round → **one** "sent you a message request"
  notification. Messages 2 and 3 of the same round do not notify again (the old trigger
  notified on every single message, which is what "one per round, not 3" fixes).
- `accepted` → normal "sent you a message" notification on every message, same as today.
- Recipient accepts → sender gets "accepted your message request."
- A muted conversation (`conversation_mutes`) never notifies, regardless of state.
- Connection request / accepted, and new-follower notifications are unchanged — they
  already had their own triggers.

## Backfill: existing conversations

Every pair that has exchanged a `direct_messages` row before this migration runs becomes
an `accepted` conversation immediately (grouped by pair, `last_message_*` set from their
real last message). Nothing that's currently visible in Messages disappears or gets
treated as a "request." This step is safe to run twice — it only touches rows where
`conversation_id is null`.

## Security fixes bundled into this migration

1. **Connections**: today, the person sending a request could `INSERT` a row with
   `status = 'accepted'` directly (skipping the recipient's approval entirely), and
   either party could `UPDATE` any field on a shared row — including the requester
   accepting their own request. Fixed with (a) the insert policy now requires
   `status = 'pending'`, and (b) a new `BEFORE UPDATE` trigger that only allows the
   specific transitions that make sense, by the correct person:
   `pending → accepted/rejected` (recipient only), `pending → withdrawn` (requester
   only), `rejected/withdrawn → pending` (requester re-requesting only). The two user
   ids on a row can never change.
2. **Messaging**: the 3-message cap moves from the client into a database trigger (see
   above) — this was the main gap the audit flagged.
3. **Blocking bypass**: `connections` and `follows` insert policies now check
   `user_blocks` — you can no longer send a connection request or follow someone who has
   blocked you (or whom you've blocked).

## Deferred to Step 2 (client) / Step 3 (tests)

This migration is backend-only. Not included here, and not yet built:

- `db.js` changes to call `get_inbox`, `accept_message_request`,
  `decline_message_request`, `block_user`, `unblock_user`, `report_user`, and to send
  `client_id` (a generated UUID) with every message so retried sends can't double-post.
- `MessagesPage.jsx` Primary/Requests tabs, the request card (Accept/Decline/Block/
  Report), the "N of 3 left" notice, and the declined/cooldown "closed" state.
- `ProfileHeader.jsx` / `PersonCard.jsx` button logic for the "message request sent, N
  left" and "declined, on cooldown" states.
- Vitest coverage for the new UI states, and a SQL test script exercising the cap,
  concurrency (two messages at once), cooldown, blocking, and authorization directly
  against the trigger/RPCs.

## Rollback

The migration file has a commented-out block of `drop table` / `drop function` / `drop
trigger` statements at the top, in dependency order, in case this ever needs to be
undone. It's commented out on purpose — nothing runs automatically.
