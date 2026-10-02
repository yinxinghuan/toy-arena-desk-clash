# Toy Arena: Desk Clash

An original CrazyGames-native desktop prototype by yinxinghuan. MIT licensed.
Not an AlterU port or a Toy Rampage reskin. No accounts, ads, downloads, remote
assets or backend are required. All product text is English.

## Run

Requires Node.js 18+.

```sh
npm ci
npm run dev -- --port 5186
npm test
npm run build
npm run preview -- --port 4186
```

Open the printed URL in a keyboard-and-mouse browser. The production `dist/`
uses relative paths and works under an arbitrary static subpath.

WASD / arrows drive; mouse aims; left click dashes; Space dashes forward.
P / Escape pauses; R retries; M toggles persistent mute. Blur pauses the game.
The safe practice tutorial can be skipped and replayed from the arena menu.

## W0–1 scope

Three authored arenas: Tape Sprint (ordered checkpoints), Stampede Station
(break paper toys then capture the pad), Marble Mayhem (survive and collect).
Each has completion and two explicitly stated bonus-star conditions. Highest
stars and mute/tutorial settings survive refresh; failed storage reports an
English warning without blocking play.

All Canvas2D artwork, layouts, WebAudio music and effects are original and
commercial-safe. See `public/THIRD_PARTY_NOTICES.txt` and `LICENSE`. No third-party
cross-stitch, models, music, fonts or game assets are used.

This is an internal playable prototype, not a commercial release or a platform
approval claim. Unfamiliar-human comprehension and subjective driving feel are
**unverified**. Do not expand W2–3 or submit to CrazyGames before review. No SDK,
advertisements, full parts shop, extra vehicles, multiplayer or level editor
are included. Prototype reference and technical notes are in `doc/`.

Verified input runs: Tape Sprint 8.25s / 3 stars, Stampede Station 25.77s /
3 stars, Marble Mayhem 45.02s / 2 stars. The first two are below the intended
30–90 second pacing and need tuning before content expansion. Full results,
known gaps and evidence paths are in `doc/qa-w01.md`.

Browser harnesses in `_qa/` additionally require Node 20+ and an installed
Playwright/Chromium runtime; they are not production dependencies. The checked-in
JSON and screenshots were generated with real browser keyboard/mouse inputs.
The WebM is visual evidence only, not an audio recording. Human first-use
comprehension and listening quality are still unverified.
