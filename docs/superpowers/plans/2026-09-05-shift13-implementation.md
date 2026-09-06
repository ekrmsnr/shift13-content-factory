# SHIFT_13 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. User explicitly ended brainstorming and authorized building the complete system; do not request design approval again.

**Goal:** Deliver a local, persistent production factory that produces actual portrait videos, packages them for social platforms, gates publication on approval, schedules work, and manages routine versus consultation comments.

**Architecture:** A local Node 24 service owns SQLite records, a durable work queue, encrypted connector secrets, rendering and publishing. Browser ES modules draw the interactive pixel factory from actual state. FFmpeg and a shared pixel scene renderer create an actual H.264/AAC MP4 plus subtitles, cover and platform captions. External services operate only after configured authorization; absence of credentials results in an explicit connection-needed state or usable export, never fake success.

**Tech Stack:** Node.js 24, node:sqlite, native HTTP, browser Canvas, @napi-rs/canvas, FFmpeg, fflate, node:test.

## Task 1: Persistent production and authorization domain

Files: `server/store.js`, `server/domain.js`, `tests/domain.test.js`.

- [x] Write tests for persistence across restart, invalid state transitions, approval invalidation on script changes, due-only scheduling, duplicate publish prevention and secret redaction.
- [x] Run `node --test tests/domain.test.js`; confirm features missing.
- [x] Implement `createStore(directory)` with SQLite transactions, explicit entity state, settings, jobs, publications, comments, events and encrypted secrets.
- [x] Implement episode validation and deterministic local story generation with diverse evergreen departments and four consistent cast members.
- [x] Verify tests pass and independently review publication gates.

Record contracts:
```js
// Episode sent to browser, and to renderer
({id,title,department,character,status,progress,createdAt,updatedAt,
  provider:'local',duration:28,script:{hook,announcement,twist,scenes:[
    {duration:4,caption:'Ek uyku talebi',action:'alarm',character:'miro'}
  ]},platforms:['instagram','tiktok','youtube'],artifacts:null,
  approvedAt:null,scheduledAt:null,error:null})
// Comment
({id,platform,externalId,episodeId,text,author,reply,status:'consult',reason,source:'manual'})
```

## Task 2: Deterministic video renderer (bounded delegate)

Files: `public/pixel-scene.js`, `server/renderer.js`, `tests/renderer.test.js`.

- [x] Tests assert portrait dimensions, sum of scene durations, invalid scene rejection and real MP4 inspection.
- [x] Implement `drawEpisodeFrame(ctx, width, height, episode, time)` shared by browser and Node. Draw a detailed factory and distinctive human cast with 2 women/2 men; Lika has a clean human face, pink hair and no black facial patch.
- [x] Implement `renderEpisode(episode, outputDir, {onProgress,signal})` returning `{video,cover,subtitles,manifest,duration,width,height}` basenames after FFmpeg validates success. Render 1080×1920 output, 24 fps, 25–35 seconds; use lower native pixel resolution and nearest-neighbor enlargement, intentional original soundtrack/foley and readable Turkish captions. Use safe child process argument arrays and atomic final output; cancellation is supported.
- [x] Generate a short test video and inspect with ffprobe; leave no paid service dependencies.

## Task 3: Queue, service and connectors

Files: `server/index.js`, `server/http.js`, `server/worker.js`, `server/providers.js`, `server/comments.js`, `tests/service.test.js`, `tests/providers.test.js`.

- [x] Tests cover restart recovery, worker serialization, unavailable connectors, future schedule exclusion, edit/approve/render revision identity, comment consultation, same-origin restrictions and path containment.
- [x] Expose `/api/state`, `/api/episodes`, `/api/episodes/:id`, `/:id/render`, `/:id/approve`, `/:id/reject`, `/:id/schedule`, `/:id/publish`, `/:id/export`, `/api/settings`, `/api/connections`, `/api/comments`, `/api/comments/:id/resolve`, `/api/health`, `/api/events`.
- [x] Run one renderer at a time; persist events/progress; failed jobs offer retry and restart-interrupted jobs are recoverable. Scheduled publication requires approved identical artifacts. Uncertain external upload states do not trigger blind retries.
- [x] Add configurable Gemini script generation and Veo image/video augmentation with an explicit spend toggle and per-episode cap; local production remains available without a key.
- [x] Implement official YouTube upload/OAuth and Instagram publishing/reading/reply interfaces, with connector readiness checks. TikTok remains manual package or an explicitly configured supported provider; do not claim private-only Direct Post apps will pass audit.
- [x] Implement conservative local comment routing, approved reply templates, outbox/deduplication, consultation actions and automatic reply only on authorized supported connected accounts. Store source and real delivery status separately.

## Task 4: Interactive pixel factory

Files: `public/index.html`, `public/styles.css`, `public/app.js`, `public/factory.js`, `public/views.js`.

- [x] Build the canvas factory as primary working surface: characters walk between named stations; active episode causes real station lights/progress; selecting machines opens corresponding controls.
- [x] Include episode creation/editor/preview, render progress, approval, date/time planning, download packages, comment consultation, connection settings, cost tracking and truthful analytics with empty states.
- [x] Make buttons call the service and reflect failures. Store only view preferences in localStorage. Use accessible dialogs/forms, labelled controls and responsive layouts; keyboard/click access to stations must exist outside canvas.
- [x] Expose a small WebMCP interface only if supported, using the same API action path and approval checks.

## Task 5: Operational handoff and full verification

Files: `README.md`, `BASLAT.command`, `.env.example`, `scripts/check.js`, `scripts/smoke.js`, `docs/TEST-RESULTS.md`.

- [x] Provide one-click macOS startup and `npm start`, capability checks for Node/FFmpeg, local/private data storage and backup/export instructions.
- [x] Run `npm test` and `npm run check`; fix actual failures.
- [x] Run service smoke: create episode → render MP4 → inspect media → approve → future schedule → export ZIP → restart persistence → consultation response remains unsent without a connector.
- [x] Independently review spec compliance, then quality/security; fix blocking findings.
- [x] Leave the app running and open its working URL; deliver an actual sample MP4 and concise list of user-required external connection steps. Do not label real publishing verified without account authorization.

## Scope reality

The user's existing Google AI Pro membership is a Flow UI subscription, not an API credential. Flow-assisted production has a manual import path. Paid API calls require a separately entered key and explicit enabled budget. Do not spend or post during development. The requested turnkey local app is the deliverable; Cloudflare Sites' 128 MB HTTP worker runtime cannot execute this FFmpeg process, so this product uses a local service instead of a hosted Sites page. No public deployment is requested or needed for this local control app. Instagram media hosting and platform audits remain setup prerequisites when that connector is selected.
