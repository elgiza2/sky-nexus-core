# Megsy — roadmap

## Current request (October 6, 2026)
- [x] Restrict the October announcement to authenticated sessions; Welcome and registration never show it.
- [x] Replace October announcement with a clean bottom sheet using the uploaded artwork; hide Microsoft and guard Chat aliases. Verified guest /chat → Welcome → /auth, no Microsoft button, and phone/desktop layout.
- [x] Redesign Agents in English and wire guided creation through the main chat with an explicit proposal approval.
- [x] Hide Tasks page from navigation and direct page entry without deleting reminder data.
- [x] Audit cleanup candidates and remove five confirmed unused modules; preserve uncertain/shared dependencies.
- [x] Redesign legal/company pages using existing company records, without claiming government verification or guaranteed compliance.
- [x] Build and visually verify one immersive landing, Arabic content, Vodafone Cash, working video transitions and unknown-path fallback.
- [x] Configure the 24-hour promotion and first-visit announcement; test expiry boundaries and paid-media exclusion.
- [ ] Verify real signed-in agent creation and live promotional usage: blocked by external unmanaged authentication; no automatic authenticated checks available.
- [ ] Owner/legal review of company records and policies: blocked on external verification and qualified legal review.

## Fixed in the QA pass
- Computer tasks: terminal state (done/failed + result text) is written only after the
  external environment confirms it (`src/lib/computer/client.ts`, `persistTerminalState`).
- Browser steps in the agent tool runtime really execute on the cloud computer instead of
  returning a fake `BROWSER_STEP:` string (`src/lib/agentTools/runtime.ts`).
- The agent cannot declare completion while external work is still running
  (`src/lib/agentkernel/kernel.ts`).
- Execution events are no longer chat messages: one status line while running, steps in a
  collapsed list, only the final report as a message.
- Stale `running` computer rows (>10 min) are reconciled once on load
  (`src/lib/computer/taskIndicators.ts`).
- Desktop blank screen: `src/styles/deferred.css` shipped `@tailwind utilities`, emitting an
  unlayered copy of every utility that beat the responsive variants.
- `/` rendered the template placeholder instead of the SPA (`src/routes/index.tsx`).
- Code blocks vanished from answers: `stripLearnBlocks` had an optional fence flag
  (`src/components/chat/ChatMessage.tsx`).
- Image edit follow-ups ("now make the bicycle red") went to the text model and produced
  nothing; they now route to the image pipeline with the previous image as reference
  (`src/lib/media/autoMediaIntent.ts`, `detectImageEditIntent`).
- Cost: the mandatory reviewer round-trip was removed; the higher reviewer runs only when
  self-review finds a real gap.
- Unstyled/broken first paint: every stylesheet was imported from `src/lib/spaBoot.ts`, a
  client-only dynamic chunk, so the server HTML carried no stylesheet. All render-critical
  CSS now lives in `src/styles/app.css`, imported by `src/routes/__root.tsx`, so it ships as
  a `<link>` with the document. Import order preserved.
- Dark flash before the light UI: the boot shell was hard-coded dark while the default theme
  is light. `THEME_BOOT_SCRIPT` in `__root.tsx` resolves the stored theme before first paint
  and `BOOT_STYLE` is theme-aware (auth screens stay dark).
- Dead code: 60 unreachable modules deleted (unused shadcn primitives, `serviceRouter`,
  `intentDetector`, `openManus`, `coderStackBlitz`, `persistentCache`, …), the leftover
  template `src/styles.css` removed, and 26 unused npm packages dropped (antd, recharts,
  `@lobehub/ui`, `@imgly/background-removal`, unused Radix packages, …).
- Visual QA: auth videos now cover every tested viewport, long labels and settings rows wrap,
  the chat composer stays visually stable on focus, and narrow-phone loading no longer goes blank.
- React 19 nested-router warning removed by seeding browser history before React mounts.

## QA pass (September 2026)
- [ ] Real Runway image and video verification blocked: both provider requests now return "You do not have enough credits to run this task". The test account's Megsy balance is separate from Runway's provider balance. Image request schema and aspect ratio were corrected; re-test after the Runway account is funded.
- [x] Re-deployed Runway video creation and repaired the video polling deployment;
  removed duplicate client-side video quota reservation.
- [ ] Video output cannot be visually verified until Runway provider credits are restored; the service returns a 502 and refunds the app credits.
- [ ] Plus AI provenance and PPTX output remain unverified: four authenticated `chat-slides-stream` jobs completed with `output.deck` rather than `output.standardSlides`/PPTX. Two contrasting templates produced some different layouts but identical stored palettes; chat applies the selected palette before display. Verify deployed provider integration and visual variety in actual chat decks.
- Seedance offer dialog: no focus ring on the CTA (`SeedanceOfferDialog.tsx`).
- Computer surface: collapsed pill only, no reserved space, no duplicated status
  (`ComputerRunViewport.tsx`) — live status stays in the thinking badge above it.
- Computer narration answers in the user's language (`src/lib/languageDirective.ts`).
- Files open on their own page `/file-preview/:id` instead of an in-chat overlay.
- Sign-out goes through one resilient helper (`src/lib/signOutEverywhere.ts`).
- Non-chat pages use the same 320px sidebar width as chat (settings, mail, pricing, referrals).
- Chat empty state: new line + serif display face (`DesktopGreeting.tsx`).
- Image models route through `anything-api`; slides cards render the real first slide.

## Open
- [x] Keep the send button in its working state until image/video generation actually finishes.
- [x] Make the active service selector a full-width top bar inside the composer.
- [x] Desktop first chat screen: keep composer text and placeholder clearly white.
- [x] Rebuild empty desktop chat (video, Megsy left, small Upgrade right, shortcuts under input; no nav links/footer).
- [x] Restore the light chat palette, composer surface, chips, shadows, and serif greeting from the loving-bonds-app reference without changing chat behavior or the dark theme.
- [x] Report the actual 48-person funnel: visit, signup start/completion, payment page/method, Vodafone Cash, and proof/order completion.
- [ ] Track each page view's visitor country.
- [ ] Redesign the four first-run slides with modest Arab-region imagery, distinct rising color transitions, and repaired slide-four text.
- On mobile, Enter inserts a newline instead of sending; only the Send button sends.
- The Learning mode chip needs horizontal scrolling in the mobile mode bar to be reachable.
- MCP / Integrations and Files were not exercised end to end in this pass.
- [done] Mode chips restyled and made smaller (StarterCards + MobileModeBar).
- No white screen / no loading screen: the site must appear instantly on first paint.

- [done] AdRoll pixel integrated site-wide (lazy load + SPA pageView).

## UI/UX batch 1 (done)
- [done] ScrollToBottomButton restored (was `return null`); wired via ChatMessagesArea, sticky centered, count badge, ar/en aria.
- [done] ChatMessage: removed dead swipe hint/handlers; added Regenerate + Branch actions; ar/en labels for More/Copy/Edit/Like/Dislike/Copied/Download/Resume/interrupted; logical `end-0`/`text-start`; menu `dir` follows UI lang; touch targets 28px -> 36px.
- [done] AppSidebar: chat search input (shown when >5 conversations) filtering titles, with "No matches" state.
- [done] Clean-design pass: scroll-to-bottom button and sidebar search are borderless/transparent with light 1.75-stroke icons; message "More" button lost its hover fill.

## Requests 15 Sep (evening)
- [x] Separate Google sign-up button from email sign-up button (more vertical spacing).
- [x] Keep mobile sidebar/menu toggle on the same side on every page (landing + app pages).
- [x] TikTok Pixel added site-wide; CompletePayment fires only after a verified paid order, with duplicate protection.
- [x] TikTok Events API (server-side) sends the same CompletePayment with a shared event_id; access token stored as a secret, triple duplicate protection.
- [x] Mobile Google and email registration buttons separated with a fixed visible gap.
- [ ] Chips too small -> enlarged; verify visually.
- [ ] Plus menu look rejected -> redesign.
- [ ] Trial offer: show "3 days for $1" in place of $7, auto-renew to $7 after trial.
- [ ] Computer mode "failed to fetch" on production (Vercel) -> route everything through Supabase.
- [ ] Hide Mail (@megsyai.com) across all its pages/entries until redesigned.
- [ ] Arabic wallet/Visa payment sheet looks bad — restyle with design tokens.
- [ ] Arabic visitors: show prices in local currency detected from the device locale/timezone.
- [x] Local currency beside USD prices (device country) — desktop + mobile pricing.
- [x] Facebook-style next-hop prefetch replaces bulk chunk warming; loading fallback removed.

## Nomi rebuild
- [ ] Rebuild the product UI as Nomi inside the existing React SPA; do not introduce TanStack page architecture.
- [ ] Keep the permanent chat as home, first-use welcome, contextual animated avatar, and calls screen.
- [ ] Isolate all new persisted data in `nomi_*` tables without altering legacy Megsy tables.

## Restructure (September 30, 2026)
- [x] Chat chips, mode bars and model pickers removed; every message goes to the single agent.
- [x] Agent = Browser Use Cloud on `deepseek-v4-flash-vision`, served by `media-video` (`kind: "agent"`). Live computer only when a real page was opened; files only when produced.
- [x] Images fixed to Runway `gpt_image_2`, quality `low` (`media-video`, `kind: "image"`).
- [x] Videos: free = MiniMax Hailuo 1/day, subscribers = Seedance 2.5 5/day (`consume_daily_video`).
- [ ] Add WaveSpeed keys at `/k` (none stored yet) — blocked on the owner.
- [ ] Live end-to-end test while signed in — the preview can't sign in automatically on this backend.
- [ ] Image generation has no usage limit or charge yet (to be set with "the other limits").
- [x] Integrations now live only on `/integrations`; chat triggers navigate there instead of opening a sheet.
- [x] Provider thinking output streams into the Megsy-star status line and persists with task events.
- [x] Knowledge moved inside the Memory page; notification pages and settings entries were removed.

## Life assistant (Sep 30 2026)
- [x] Tasks page /tasks (goals, tasks, ideas), agent [[TASK/ALARM/GOAL]] lines saved to life_* tables
- [x] In-app reminders (ReminderWatcher polls scheduled_nudges)
- [ ] Google Calendar per-user connection (needs Google OAuth client approval)
- [ ] Background push reminders + daily brief when app is closed (needs push setup + scheduler)
- [ ] Android wrapper: real phone alarms (Capacitor)
- [ ] Connect Firebase Cloud Messaging (blocked: user must approve the Firebase connection)
- [ ] Android developer adds the MegsyAndroid bridge from docs/android-bridge.md (blocked: outside this project)
- [ ] Publish the site so the every-minute reminder check reaches it

## Credit system (September 30, 2026)
- [x] Define one credit policy for free and paid users.
- [x] Centralize plan grants and per-service costs.
- [x] Apply safe initial balances to all existing users without double grants.
- [x] Enforce charging/refunds for the active agent, image, and video paths; chat stays free.
- [x] Update desktop pricing and shared price copy from the unified catalog.

## Credit system (30 Sep)
- [x] Once-only charge/refund for image, video, agent; credit packs 100/$6, 300/$15, 700/$29 (Pro only) on desktop pricing + credits page; balances reset for all users.
- [ ] Buying a pack end to end not tested with a real payment.

## Next pass (Oct 2026) — requested
- [x] Replace image/video/tool providers with AgentSky (key in AGENTSKY_API_KEY secret)
- [ ] Agent = OpenClaw on gpt-5.6-luna with sub-agents + Manus-style task management
- [ ] Free vs subscriber model tiers for image/video
- [ ] GrokBot-style animated orb (idle/thinking/tool/done) with per-agent gradient, used across UI
- [x] Fix: stop/cancel message doesn't work
- [x] Fix: agent says it can't make images/videos
- [x] Fix: internal system commands leak into chat
- [x] Fix: send button re-enables while thinking; allow queued messages sent after finish
- [x] Tasks button in sidebar; AI assigns tasks
- [x] Stacked thinking steps (searched X, clicked Y…) with live internal reasoning
- [x] Clean image/video cards + generation UI; approval cards; question cards
- [ ] Agent creation as full page instead of modal
- [ ] Project-wide cleanup
- [ ] Polish the full-page Agents and Tasks screens to match Megsy's original visual language

## Approved chat unification (October 5)
- [x] End AgentSky requests on terminal events, preserve Stop and queued sends.
- [x] Show the selected agent identity, awakening, live stacked steps and real helpers in the original chat.
- [x] Replace alternate agent sidebar with the original site navigation and polish Agents/Tasks.
- [x] Verify stream lifecycle tests and visual states; authenticated first and follow-up turns finish successfully.

## GrokBot follow-up (October 5)
- [x] Match sleep/thinking motion and replace greeting star with the selected agent's hello.
- [x] Wake only on the first chat turn; start subsequent turns thinking.
- [x] List available provider agents safely and enforce subscriber-only switching.
- [x] Review the real signed-in chat using the supplied test account.

## Requested polish and resilience (October 5)
- [x] Enforce paid-only media in direct routes and MCP; prepare yellow higgsfield routing and task identity.
- [ ] Activate real Hypit media: blocked because neither Hypit nor Chat · Hypit exists in the authenticated AgentSky catalogue.
- [ ] Verify cheapest image/video endpoints and costs: provider catalogue pricing is unavailable; keep one fast existing endpoint per kind, without claiming a verified cheapest price.
- [x] Pink/blue Megsy, internal thinking waveform, greeting headline removal, sidebar icon and hidden Tasks entry.
- [x] Refresh active pricing claims without changing existing prices; remove unsupported media costs/unlimited promises.
- [x] Rebuild login/signup, OTP and recovery to match Cue using Megsy; welcome and email entry verified without browser errors.
- [ ] Microsoft/Apple authentication needs provider configuration verification; Apple remains hidden without existing configured credentials.
- [x] Redesign agent thinking, sleeping and completed appearance; remove the white-looking body and refine colors after visual selection.
- [x] Keep long provider tasks connected or reconcile them after transient stream/network interruptions.
- [x] Present real activity badges for every tool, including search, code, Python, images and video, with a readable fallback.
- [x] Fully redesign Agents (unified with site style) as a clean, clear, simple page within the original site navigation after visual selection.
