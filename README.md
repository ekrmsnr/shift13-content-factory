# SHIFT_13 — Content Factory

**A local-first pipeline that turns a short script into a publish-ready vertical video, with a human approval gate before anything goes live.**

SHIFT_13 produces 25–35 second satirical shorts set in *İnsan Deneyimi A.Ş.* ("Human Experience Inc."), a fictional corporation that runs everyday life like a bureaucracy. Each episode goes from script to a 1080×1920 H.264/AAC MP4, with a cover, subtitles, a manifest, and platform-specific captions. The whole flow runs on one machine, with no paid services required.

The control panel is a live pixel-art factory rather than a dashboard. Four characters (Vera, Miro, Lika and Kiro) work the production stations, and their state follows the real job queue.

> Node.js 24 · FFmpeg · `node:sqlite` · Canvas 2D · Server-Sent Events · two runtime dependencies

---

## What it does

| Stage | What happens |
|---|---|
| **Script** | 12 built-in episode concepts, or an AI script from Gemini returned as JSON. Every script goes through the same validator: 3–10 scenes, a 25–35 s total, bounded caption lengths and an allow-listed cast and actions. |
| **Render (clips)** | Alternative engine: one externally produced take (Flow/Veo) per scene is cropped to 9:16, trimmed — or looped — to its scene length, captioned with a burned-in Turkish overlay and concatenated over the same procedural soundtrack. |
| **Render (pixel)** | A deterministic pixel scene engine draws each frame at 270×480. Frames are piped raw into FFmpeg, upscaled with nearest-neighbour to 1080×1920 at 24 fps, and muxed with a procedurally synthesised soundtrack. |
| **Review** | A human watches the preview and approves it. An approval is tied to a specific revision, so any later edit clears the approval and the schedule. |
| **Package** | A ZIP with the MP4, a PNG cover, a Turkish `.srt`, `manifest.json`, and separate captions for Instagram, TikTok and YouTube. |
| **Publish** | Optional: YouTube resumable upload, Instagram Reels container flow, or Ayrshare. With no account connected, the episode is marked *needs connection* and never reported as posted. |
| **Comments** | A rule-based triage auto-replies only to clearly positive reactions. Complaints, copyright claims, collaboration requests, timing questions and anything that looks like prompt injection go to a human. |

## Architecture

```
public/  (browser)                         server/  (Node 24, no framework)
┌───────────────────────────┐   SSE        ┌──────────────────────────────────┐
│ app.js / views.js         │◀──state──────│ http.js   REST + SSE + range     │
│ pixel-scene.js ───────────┼──shared──┐   │           streaming, CSP, origin │
│   live preview            │  module  │   │           guard, ZIP export      │
└───────────────────────────┘          │   ├──────────────────────────────────┤
                                       │   │ factory.js  state machine, queue,│
                                       │   │             recovery, scheduling │
                                       │   │ worker.js   900 ms tick loop     │
                                       │   ├──────────────────────────────────┤
                                       └──▶│ renderer.js canvas → raw RGBA →  │
                                           │             ffmpeg stdin → MP4   │
                                           │ ai.js       Gemini script, Veo   │
                                           │ providers.js YouTube/IG/Ayrshare │
                                           │ store.js    SQLite + AES-GCM     │
                                           └──────────────────────────────────┘
```

### Engineering decisions worth a look

- **Two engines, one contract.** `renderEpisode` dispatches on the episode's mode and both engines return the same artifact package, so approval, packaging, scheduling and publishing never learn which one produced the video.
- **One renderer for preview and export.** `public/pixel-scene.js` is a pure function of `(episode, t)`. The browser uses it for the live preview, and the server imports the same module into `@napi-rs/canvas` for the final export. Preview and output cannot drift apart, and tests check that frames are deterministic.
- **Streaming encode with backpressure.** Frames are written to FFmpeg's stdin, and the render waits for each write callback before drawing the next frame. Memory use stays flat regardless of video length. A 28-second render (672 frames) takes about 7 seconds on a laptop.
- **Atomic artifacts.** Output is rendered into a temp directory and renamed into place, with the manifest written last. Cancellation sends `SIGTERM` to the encoder, falls back to `SIGKILL`, and removes partial files. A half-written video never shows up as finished.
- **Crash-safe state machine.** Episodes move through `draft → queued → scripting → rendering → awaiting_approval → approved → scheduled → publishing → published`. On startup, interrupted jobs are marked `failed`, and interrupted uploads are marked `uncertain` rather than retried, so a crash cannot cause a double post.
- **Honest integrations.** Network failures return *uncertain*, not *success*. A publication is only recorded as `published` when the platform returns an ID. Redirects are refused by default, and Veo download URLs are checked against an allow-listed host.
- **Cost control for paid AI.** Paid calls stay off until explicitly enabled. Each request reserves its estimated cost against a monthly USD cap before it is sent, and a job whose outcome is unclear is flagged so it isn't charged twice by accident.
- **Local secrets vault.** API tokens are encrypted with AES-256-GCM using a per-install key (`0600`) and stored in SQLite. They never reach the browser. The UI only receives *configured / connected* flags.
- **Hardened local server.** Binds to `127.0.0.1`. Mutating requests require a same-origin check. Strict CSP and `nosniff`/`DENY` headers are set, request bodies are size-capped (256 KB JSON, 100 MB video), static paths are traversal-safe, and media is served with HTTP range support.
- **Original audio only.** The soundtrack (bass, arpeggio, typewriter ticks, per-scene foley) is synthesised sample by sample into a WAV in bounded chunks. There are no samples, voices or licensed music.

## Output

Every render produces a self-describing package:

```
media/<episode-id>/r<revision>/
├── video.mp4          1080×1920 · 24 fps · H.264 (CRF 20) · AAC 128k · faststart
├── cover.png          full-resolution key frame
├── subtitles.tr.srt   scene-timed Turkish captions
└── manifest.json      script, timings, engine version, audio provenance
```

## Getting started

**Requirements:** Node.js ≥ 24 and FFmpeg/FFprobe.

```bash
brew install node ffmpeg      # macOS
npm install
npm run check                 # verifies Node, FFmpeg, FFprobe and the render engine
npm start                     # → http://127.0.0.1:4313
```

On macOS you can also double-click `BASLAT.command`, which runs the check, starts the server and opens the browser.

On first launch, a sample episode is created. Select it, press **Video üret** (render), watch the preview, approve it, and download the package.

### Configuration

Copy `.env.example` to `.env` if you need to change anything:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4313` | HTTP port |
| `HOST` | `127.0.0.1` | Keep it on loopback |
| `SHIFT13_DATA` | `data` | SQLite, vault key and media |
| `FFMPEG_PATH` / `FFPROBE_PATH` | auto | Checked in order: env var, `/opt/homebrew/bin`, `/usr/local/bin`, `PATH` |

Platform and AI credentials are **not** set in `.env`. They are entered in the app's **Bağlantılar** (Connections) screen and stored in the encrypted vault.

### Optional integrations

| Integration | Needs | Notes |
|---|---|---|
| Gemini + Veo | Gemini API key, paid AI enabled, monthly cap | Default models are `gemini-3.7-flash` for scripts and `veo-3.1-fast-generate-preview` for an 8 s AI shot placed in the chaos scene. Check the [official pricing](https://ai.google.dev/gemini-api/docs/pricing). |
| YouTube | OAuth access token (+ refresh token, client ID/secret) | Uploads default to private. Unaudited API projects are locked to private by YouTube. |
| Instagram | Professional account token + account ID + public HTTPS media root | Without a public media URL, use the ZIP package instead. |
| TikTok | — | Manual upload from the ZIP, or through Ayrshare. |
| Ayrshare | API key | A single key for connected social accounts. |

Externally generated footage can enter the pipeline two ways: a single clip imported as a *special shot* that replaces the chaos scene of a pixel episode, or one clip per scene, which switches the episode to clip mode and assembles the whole video from those takes.

## Testing

```bash
npm test                                          # 27 tests, fast suite (2 real renders skipped)
RENDER_INTEGRATION=1 node --test tests/renderer.test.js   # 9 tests incl. real 28 s encodes
npm run smoke                                     # end-to-end over HTTP
```

The smoke test boots the real server and goes through the full flow: create episode → render → confirm with `ffprobe` that there is an H.264 video stream and an AAC audio stream → check the approval gate → download the ZIP → schedule → route a comment to a human → restart → check that state persisted.

Examples of what the suite covers:

- Encrypted credentials survive a restart and are never exposed through the API
- Edits invalidate approvals, and past or in-flight schedules are rejected
- A missing encoder, cancellation mid-encode and aborted renders leave no partial artifacts
- Missing credentials create *needs-connection* records, never fake posts
- Paid AI is refused unless enabled and within budget, and checking a disconnected provider makes no network request
- Oversized payloads, path traversal and tiny or corrupt uploads are rejected

## Project layout

```
server/    http.js · factory.js · worker.js · renderer.js · store.js
           domain.js · ai.js · providers.js · comments.js · net.js
public/    index.html · app.js · views.js · factory.js · pixel-scene.js · styles.css
scripts/   check.js · smoke.js
tests/     domain · service · http · providers · renderer
docs/      TEST-RESULTS.md · decisions/ (comment-moderation policy)
```

## Design principles

1. **Nothing is published without a human.** Every rendered revision needs explicit approval before it can be scheduled or exported.
2. **Never report success you haven't confirmed.** Unclear results are shown as unclear.
3. **Free by default.** The full pipeline runs offline, and paid AI is opt-in and capped.
4. **Local-first.** Your data, keys and media stay on your machine, under `data/` (git-ignored).

---

<details>
<summary><b>Türkçe hızlı başlangıç</b></summary>

1. `npm install` ve ardından `BASLAT.command` (ya da `npm start`), sonra http://127.0.0.1:4313 adresini aç.
2. Vakayı seç → **Video üret** → önizle → **İzledim, onayla** → yayın paketini indir.
3. API anahtarı gerekmez. Gemini/Veo ve platform bağlantıları isteğe bağlıdır ve **Bağlantılar** ekranından eklenir.
4. Yedek: fabrika kapalıyken `data/` klasörünü kopyala.

</details>

Built by [Ekrem Şener](https://github.com/ekrmsnr).
