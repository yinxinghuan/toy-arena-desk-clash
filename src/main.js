import "./ui/style.css";
import { LEVELS } from "../content/levels.js";
import { Game, starsFor } from "./core/game.js";
import { readSave, writeSave } from "./core/save.js";
import { Synth } from "./audio/synth.js";
import { Renderer } from "./game/render.js";
const $ = (id) => document.getElementById(id),
  canvas = $("arena"),
  renderer = new Renderer(canvas);
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
}
const loaded = readSave(storage),
  save = loaded.data;
$("save-warning").textContent = loaded.warning;
const audio = new Synth(save.muted),
  keys = new Set();
let game = null,
  phase = "menu",
  aim = null,
  acc = 0,
  last = 0,
  tutorialStep = 0,
  resultShown = false,
  tutorialElapsed = 0;
function persist() {
  const warning = writeSave(storage, save);
  if (warning) $("save-warning").textContent = warning;
}
function button(label, action, primary = false) {
  return `<button data-action="${action}" class="${primary ? "primary" : ""}">${label}</button>`;
}
function panel(html) {
  $("overlay").innerHTML = `<div class="ta-panel">${html}</div>`;
}
function mute() {
  save.muted = !save.muted;
  audio.setMuted(save.muted);
  persist();
  $("mute").textContent = save.muted ? "Sound off" : "Sound on";
}
function menu() {
  phase = "menu";
  keys.clear();
  audio.setActive(false);
  $("hud").hidden = true;
  $("tutorial").hidden = true;
  $("drive-help").hidden = true;
  panel(
    `<p class="ta-eyebrow">SMALL MACHINE / BIG DESK</p><h1>Toy Arena:<br>Desk Clash</h1><p>Drive a pocket-sized machine. Turn the work desk into your arena.</p><p>WASD / Arrows to drive · Mouse to aim · Click to dash</p><div class="ta-actions">${button("Play Tape Sprint", "play", true)}${button("Learn by driving", "tutorial")}${button(save.muted ? "Sound off" : "Sound on", "mute")}</div><div class="ta-levels">${LEVELS.map((l, i) => `<button data-action="level-${i}"><strong>0${i + 1} / ${l.name}</strong><span>${["Race the tape", "Break & capture", "Dodge & collect"][i]}</span><span>Best: ${save.stars[i]} / 3 stars</span></button>`).join("")}</div><p class="ta-eyebrow" style="margin-top:12px">${innerWidth < 650 ? "KEYBOARD AND MOUSE REQUIRED · LANDSCAPE RECOMMENDED" : "3 ORIGINAL ARENAS · NO ACCOUNT · NO ADS"}</p>`,
  );
}
async function start(index, tutorial = false) {
  await audio.unlock();
  game = new Game(index, (kind) => audio.effect(kind));
  game.tutorial = tutorial;
  phase = "playing";
  resultShown = false;
  tutorialElapsed = 0;
  aim = null;
  keys.clear();
  acc = 0;
  $("overlay").innerHTML = "";
  $("hud").hidden = false;
  $("drive-help").hidden = tutorial;
  $("mute").textContent = save.muted ? "Sound off" : "Sound on";
  audio.setActive(true);
  tutorialStep = 0;
  $("tutorial").hidden = !tutorial;
  if (tutorial) teach();
  hud();
}
function teach() {
  const details = [
    [
      "Drive through the gold practice gate.",
      "WASD / Arrows · No timer or damage while learning.",
    ],
    [
      "Aim at the paper toy. Click to dash into it.",
      "Move closer, point your mouse at the block, then click.",
    ],
    [
      "Gate crossed. Toy broken. You are ready.",
      "Next: cross five numbered gates before 60 seconds.",
    ],
  ];
  const [title, sub] = details[tutorialStep];
  $("tutorial").innerHTML =
    `<svg viewBox="0 0 80 50" aria-hidden="true"><g fill="none" stroke="#203239" stroke-width="2"><rect x="10" y="15" width="32" height="22" rx="7"/><path d="M44 26h25m-8-8 8 8-8 8"/><circle cx="17" cy="40" r="3"/><circle cx="36" cy="40" r="3"/></g></svg><div><strong>${title}</strong><small>${sub}</small></div>${button(tutorialStep === 2 ? "Start race" : "Skip", "skip", true)}`;
}
function skip() {
  save.tutorialSeen = true;
  persist();
  start(0);
}
function hud() {
  if (!game) return;
  $("level-name").textContent = `0${game.index + 1} / ${game.level.name}`;
  $("objective").textContent = game.tutorial
    ? "Practice: drive, then dash"
    : game.gateHintRemaining > 0
      ? `Wrong order — Next: Gate ${game.gate + 1}`
      : `${game.level.goal} · ${game.progress()}`;
  $("timer").textContent = game.tutorial
    ? "PRACTICE"
    : `${Math.max(0, Math.ceil(game.level.limit - game.time))}s`;
  $("health").textContent = `Hull ${3 - game.hits}/3`;
}
function pause() {
  if (phase !== "playing") return;
  phase = "paused";
  keys.clear();
  audio.setActive(false);
  panel(
    `<p class="ta-eyebrow">ENGINE IDLE</p><h2>Paused</h2><p>The timer and marbles are stopped.</p><div class="ta-actions">${button("Resume", "resume", true)}${button("Retry", "retry")}${button("Arena", "menu")}</div>`,
  );
}
async function resume() {
  if (phase !== "paused") return;
  await audio.unlock();
  phase = "playing";
  acc = 0;
  keys.clear();
  $("overlay").innerHTML = "";
  audio.setActive(true);
}
function result() {
  phase = "result";
  keys.clear();
  $("tutorial").hidden = true;
  const stars = starsFor(game);
  if (stars > save.stars[game.index]) {
    save.stars[game.index] = stars;
    persist();
  }
  const earned = [
    game.won,
    game.won &&
      (game.level.kind === "survive"
        ? game.hits === 0
        : game.time <= (game.level.kind === "race" ? 35 : 40)),
    game.won &&
      (game.level.kind === "survive" ? game.collected === 6 : game.hits === 0),
  ];
  panel(
    `<p class="ta-eyebrow">${game.won ? "ARENA COMPLETE" : "TRY AGAIN"}</p><h2>${game.won ? `${stars} / 3 stars` : "A new line awaits."}</h2><p>${game.reason}</p><p>${game.time.toFixed(1)} seconds · ${game.hits} hits · Best ${save.stars[game.index]}/3</p><ul class="ta-medals">${game.level.medals.map((m, i) => `<li>${earned[i] ? "Earned" : "Not earned"} — ${m}</li>`).join("")}</ul><div class="ta-actions">${button("Retry", "retry", true)}${game.won && game.index < 2 ? button(`Next: ${LEVELS[game.index + 1].name}`, "next") : ""}${button("Arena", "menu")}</div>`,
  );
  setTimeout(() => {
    if (phase === "result") audio.setActive(false);
  }, 700);
}
$("overlay").addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  if (action === "play") start(0, !save.tutorialSeen);
  else if (action === "tutorial") start(0, true);
  else if (action?.startsWith("level-")) start(Number(action.slice(6)));
  else if (action === "mute") {
    mute();
    menu();
  } else if (action === "resume") {
    tutorialElapsed = 0;
    resume();
  } else if (action === "skip") skip();
  else if (action === "retry") start(game.index, game.tutorial);
  else if (action === "next") start(game.index + 1);
  else if (action === "menu") menu();
});
$("tutorial").addEventListener("click", (e) => {
  if (e.target.closest('[data-action="skip"]')) skip();
});
$("pause").onclick = pause;
$("mute").onclick = mute;
document.addEventListener("keydown", (e) => {
  if (e.target.closest("button") && [" ", "Enter"].includes(e.key)) return;
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
    e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === "m") mute();
  if (k === "escape" || k === "p") phase === "paused" ? resume() : pause();
  if (k === "r" && game && phase !== "menu") start(game.index, game.tutorial);
  if (k === " " && phase === "playing")
    game.dash(
      game.p.x + Math.cos(game.p.angle) * 100,
      game.p.y + Math.sin(game.p.angle) * 100,
    );
});
document.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
function pointer(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * 960,
    y: ((e.clientY - r.top) / r.height) * 540,
  };
}
canvas.addEventListener("pointermove", (e) => (aim = pointer(e)));
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || phase !== "playing") return;
  aim = pointer(e);
  game.dash(aim.x, aim.y);
});
window.addEventListener("blur", pause);
window.addEventListener("pagehide", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
// Event-only lifecycle handling can miss a native tab/window switch. Check
// authoritative focus before simulation, and independently while rAF is hidden.
function enforcePageFocus() {
  if (
    phase === "playing" &&
    (document.visibilityState !== "visible" || !document.hasFocus())
  )
    pause();
}
setInterval(enforcePageFocus, 200);
new ResizeObserver(() => renderer.resize()).observe(canvas);
function frame(now) {
  enforcePageFocus();
  const delta = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (phase === "playing") {
    acc += delta;
    let steps = 0;
    while (acc >= 1 / 60 && steps++ < 6) {
      game.update(1 / 60, {
        x:
          Number(keys.has("d") || keys.has("arrowright")) -
          Number(keys.has("a") || keys.has("arrowleft")),
        y:
          Number(keys.has("s") || keys.has("arrowdown")) -
          Number(keys.has("w") || keys.has("arrowup")),
      });
      acc -= 1 / 60;
    }
    if (game.tutorial) {
      tutorialElapsed += delta;
      const next = game.practiceBlock ? 2 : game.practiceGate ? 1 : 0;
      if (next !== tutorialStep) {
        tutorialStep = next;
        teach();
      }
      if (tutorialElapsed >= 30) {
        pause();
        panel(
          `<p class="ta-eyebrow">PRACTICE PAUSED / NO PENALTY</p><h2>Ready for the race?</h2><p>Practice has paused after 30 seconds. You can start the race or keep learning at your own pace.</p><p>Cross five gates in order. WASD drives; click dashes toward your mouse.</p><div class="ta-actions">${button("Start race", "skip", true)}${button("Keep practising", "resume")}</div>`,
        );
      }
    }
    hud();
    if (game.ended && !resultShown) {
      resultShown = true;
      result();
    }
  }
  renderer.draw(game, phase === "playing" ? aim : null);
  requestAnimationFrame(frame);
}
// Read-only diagnostics for QA; never changes the game or completes goals.
window.toyArena = {
  snapshot: () => ({
    phase,
    index: game?.index,
    time: game?.time,
    x: game?.p.x,
    y: game?.p.y,
    gate: game?.gate,
    gateHintRemaining: game?.gateHintRemaining,
    focused: document.hasFocus(),
    visibility: document.visibilityState,
    broken: game?.broken,
    collected: game?.collected,
    held: game?.held,
    hits: game?.hits,
    tutorial: game?.tutorial,
    practiceGate: game?.practiceGate,
    practiceBlock: game?.practiceBlock,
    stars: [...save.stars],
    muted: save.muted,
    marbles: game?.marbles.filter((m) => m.active).length,
    cooldown: game?.p.cooldown,
    hazards: game?.marbles
      .filter((m) => m.active)
      .map(({ x, y, vx, vy, warning }) => ({ x, y, vx, vy, warning })),
  }),
};
menu();
renderer.resize();
requestAnimationFrame(frame);
