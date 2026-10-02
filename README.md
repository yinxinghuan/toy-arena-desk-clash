# Toy Arena: Desk Clash

An original keyboard-and-mouse desktop toy vehicle game by yinxinghuan.
Game code/art/layouts: MIT. Music: Candy by Abstraction / Tallbeard Studios (CC0);
SFX: Kenney Impact Sounds and Music Jingles (CC0). Full sources, fixed versions,
file mappings and licenses: public/THIRD_PARTY_NOTICES.txt and public/audio/.
Not an AlterU port or Toy Rampage reskin. English UI. No ads/accounts/backend.

## Run

Node.js 18+ (browser QA needs Node20+ and Playwright/Chromium).
```sh
npm ci
npm run dev -- --port 4190
npm test
npm run build
npm run preview -- --port 4191
```
Vite base './', portable static subpaths. Nothing is publicly deployed or submitted
to CrazyGames by this W2 delivery. Fullscreen belongs to the host container.

## W2–3

Ten handcrafted arenas: ordered racing, break-and-capture, collect-and-survive,
cargo pushing, then ice/moving-barrier/hazard combinations. First race has four
laps; first capture has two rounds with different pad/toy locations.
Three independent stars per arena, saved best time, star-gated challenges
and three desk themes. Tyres, frame and module have actual grip/mass/push/hull/
ability tradeoffs. Sandbox has unlimited safe practice and all test-only parts.

WASD / arrows drive; mouse aims; click / Space dashes; E uses ram or jump.
P / Esc pauses, R retries, M mutes. Focus loss pauses; return never auto-resumes.
Learn by driving can be skipped/replayed. Settings include volume/contrast/help/
credits. Local save v2 preserves v1 stars/mute/tutorial and reports English
recovery guidance on broken/unavailable storage.

## Evidence and limits

See doc/qa-w2.md for current results, screenshots, performance and known gaps.
doc/qa-w01.md is historical prototype evidence, not current pacing or audio.
_qa/w2-campaign.mjs uses actual keyboard/mouse and earned star unlocks; no hidden
game state setters. Tests may directly set simulation state only for unit coverage.
Human first-use understanding, subjective feel/listening and real Chromebook
hardware remain unverified. CPU throttling and agent driving are not those tests.
No platform approval claim, multiplayer, editor, monetization or SDK yet.

```sh
TOY_ARENA_URL=http://127.0.0.1:4191/ node _qa/w2-campaign.mjs
TOY_ARENA_URL=http://127.0.0.1:4191/ node _qa/w2-audio.mjs
TOY_ARENA_URL=http://127.0.0.1:4191/ node _qa/w2-performance.mjs
```
QA scripts require Playwright installed separately. WebM evidence is video-only.
