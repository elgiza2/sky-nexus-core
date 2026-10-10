# Megsy — Agent Handbook

Read before editing.

## 1. What this project is

Megsy AI (megsyai.com): an imported React SPA inside a TanStack Start shell.

- `src/routes/__root.tsx` — the HTML shell (head, fonts, boot styles, snapshot
  restore, speculation rules). Do not put page UI here.
- `src/routes/$.tsx` — catch-all that mounts the SPA for every non-API path.
- `src/lib/SpaApp.tsx` + `src/lib/spaBoot.ts` — SPA bootstrap (client only).
- `src/App.tsx` + `src/routes-app/*` — the real router, layouts and page tree.
- `src/pages/**`, `src/components/**` — the application itself.
- `src/routes/api/**` — thin TanStack server routes used in local dev only.

Rule: new pages go in `src/pages` and get wired in `src/routes-app/AppRoutes.tsx`.
Do NOT create new files under `src/routes/` except real API endpoints.

## 2. Where the provider keys live (important)

Legacy provider keys live encrypted in `service_keys` (`key_cipher`, `key_iv`), decrypted only in deployed Supabase Edge Functions; never expose them to the app.

Current providers:

| Purpose            | Provider    |
| ------------------ | ----------- |
| Text / chat        | Cerebras    |
| Images + video     | DeAPI, Renderful |
| Computer / agent   | Browser Use |
| Code sandbox       | Freestyle   |

Rotation happens in Postgres via `take_service_key(provider)` (least recently
used, `FOR UPDATE SKIP LOCKED`).

- Chat stays free. Credits use daily, bonus, plan, and purchased buckets; image costs 2, video 25, and agent work 1–50.
- The local `/api/chat` proxy (`src/lib/chat/proxyCore.ts`,
  `src/lib/keys/abliterationKey.ts`) is **off by default**. Enable only for
  offline provider work with `VITE_LOCAL_CHAT_PROXY=1`.
- Never add a provider key to `.env` or to the client bundle.
- Admins can add keys at `/k` (RPC `store_provider_key`, admin-only; counts via
  `provider_key_counts`).

## 3. Backend rules

- External Supabase project `qdnqxjzjecaieuavagvq`. Schema changes go through
  migrations; never edit `src/integrations/supabase/types.ts` by hand.
- Roles live in `user_roles` + `has_role()`. Never trust a client-side role.
- Anything privileged happens in an edge function or a server function, never
  in the browser.

## 4. Front-end rules

- Media runs require a live paid-plan check in both authenticated media routes and signed MCP tools; Higgsfield clones only a configured Hypit template, never substitutes a harness. Why: UI locks alone do not prevent free media spending or misrepresent the requested agent.
- Auth reuses existing handlers; Chat aliases use ProtectedRoute with guest Welcome before mount. Why: prevent guest chat exposure.

- Agent pages and guided creation use original ChatPage/AppSidebar; see src/lib/agentsky/AGENTS.md. Why: one transcript and explicit approval.
- AgentSky turn subscriptions stop on fresh session.status_idle/session.error events, with persisted-event reconciliation and baseline IDs. Why: the standing SSE feed may omit terminal frames or remain open after completion.
- Provider catalogue uses only explicitly named `Chat · ` templates, cloned into user-owned agents before use; subscription checks cover new sessions and follow-up messages. Why: shared templates must not expose other users' agents or bypass paid switching.
- Greeting and transcript share AgentOrb states; prior turns suppress repeat awakening. Why: consistent character.

- Light chat follows `loving-bonds-app`; empty desktop chat is cinematic and isolated from mobile.
- Localize English and Egyptian Arabic (`ar-eg`) through `useUserLang()`.
- Public landing and time-bound promotion rules: see src/pages/marketing/AGENTS.md. Why: consistent safe public entry.
- Snapshots use `#snapshot-preview`; never write into `#root` before hydration.
- Lazy-load browser-only libraries; read `localStorage` only in effects.

## 5. Checks before shipping

```bash
bunx tsgo --noEmit     # types
bun run build          # production build
```

Then smoke the routes (`/`, `/pricing`, `/chat`, `/settings`, `/usage`,
`/referrals`) signed in, on mobile width and desktop width.

## 6. Known open items

See `roadmap.md`.

## 7. Restructure rules (Sep 2026)
- New edge functions can't be created from this project; the agent (`kind: "agent"`) and the fixed image model (`kind: "image"`) live inside `media-video`. Why: it is the only function whose deployed code matches the repo.
- Do not redeploy `anything-api` from this repo: its deployed version has modules missing here. Why: redeploying would break live features.
- Agent creates tasks/goals by ending replies with [[TASK|ALARM|GOAL: title | local time]]; ComputerTaskCard saves them via src/lib/life/agentActions.ts. Why: the agent runs on Browser Use and cannot write to our DB.
- Phone alarms/reminders go through the `MegsyAndroid` WebView bridge (src/lib/native/bridge.ts, docs/android-bridge.md); background push + morning plan via pg_cron → /api/public/reminders-tick (FCM connector, key in public.cron_secrets). Why: the Android app wraps the site, so web push doesn't work inside it.
