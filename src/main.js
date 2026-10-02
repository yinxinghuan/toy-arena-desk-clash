import "./ui/style.css";
import { LEVELS } from "../content/levels.js";
import { Game, starsFor, starConditions } from "./core/game.js";
import { PARTS, totalStars } from "../content/builds.js";
import { readSave, writeSave } from "./core/save.js";
import { AudioBank } from "./audio/bank.js";
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
const audio = new AudioBank(
    save,
    (message) => ($("save-warning").textContent = message),
  ),
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
  document
    .querySelectorAll('[data-action="setting-mute"],[data-action="mute"]')
    .forEach(
      (node) => (node.textContent = save.muted ? "Sound off" : "Sound on"),
    );
}
function menu() {
  phase = "menu";
  keys.clear();
  audio.setActive(false);
  $("hud").hidden = true;
  $("tutorial").hidden = true;
  $("drive-help").hidden = true;
  panel(
    `<p class="ta-eyebrow">SMALL MACHINE / BIG DESK</p><h1>Toy Arena:<br>Desk Clash</h1><p>Drive, ram, jump and pack your way across ten handcrafted arenas.</p><p>WASD / Arrows: drive · Mouse / Click: dash · E: ability</p><p>${totalStars(save)} / 30 stars · Build: ${Object.keys(
      PARTS,
    )
      .map((s) => PARTS[s][save.build[s]].name)
      .join(
        " / ",
      )}</p><div class="ta-actions">${button("Play Tape Sprint", "play", true)}${button("Arenas", "arenas")}${button("Garage", "garage")}${button("Sandbox", "sandbox")}${button("Learn by driving", "tutorial")}${button("Settings & credits", "settings")}</div><p class="ta-eyebrow" style="margin-top:12px">KEYBOARD & MOUSE · NO ACCOUNT · NO ADS</p>`,
  );
}
function arenas() {
  menu();
  panel(
    `<h2>Choose your arena</h2><p>${totalStars(save)} / 30 stars · Earn stars to unlock desks and parts. Stars are never spent.</p><div class="ta-levels">${LEVELS.map((l, i) => `<button data-action="level-${i}" ${totalStars(save) < l.unlock ? "disabled" : ""}><strong>${String(i + 1).padStart(2, "0")} / ${l.name}</strong><span>${l.scene} · ${l.kind} · ${l.limit}s</span><span>${l.goal}</span><span>${totalStars(save) < l.unlock ? `Locked · ${l.unlock} stars needed` : `Best ${save.stars[i]}/3 · ${save.records[i]?.toFixed(1) || "—"}s`}</span></button>`).join("")}</div><div class="ta-actions">${button("Back", "menu")}</div>`,
  );
}
function garage(preserveScroll = false) {
  const scrollTop = preserveScroll
    ? $("overlay").firstElementChild?.scrollTop || 0
    : 0;
  menu();
  panel(
    `<h2>Build your machine</h2><p>Trade grip, weight and ability. Sandbox lets you try every part; arena parts unlock with stars.</p>${Object.entries(
      PARTS,
    )
      .map(
        ([slot, parts]) =>
          `<h3>${slot.toUpperCase()}</h3><div class="ta-parts">${parts.map((p, i) => `<button data-action="part-${slot}-${i}" ${totalStars(save) < p.cost ? "disabled" : ""} aria-pressed="${save.build[slot] === i}"><strong>${p.name} ${save.build[slot] === i ? "/ equipped" : ""}</strong><span>${p.note}</span><span>${totalStars(save) < p.cost ? `${p.cost} stars required` : "Unlocked"}</span></button>`).join("")}</div>`,
      )
      .join(
        "",
      )}<div class="ta-actions">${button("Sandbox test", "sandbox", true)}${button("Back", "menu")}</div>`,
  );
  $("overlay").firstElementChild.scrollTop = scrollTop;
}
function settings() {
  menu();
  panel(
    `<h2>Settings & credits</h2><label>Master volume <input id="volume" type="range" min="0" max="100" value="${Math.round(save.volume * 100)}"/> <output id="volume-value">${Math.round(save.volume * 100)}%</output></label><div class="ta-actions">${button(save.muted ? "Sound off" : "Sound on", "setting-mute")}${button(save.contrast ? "High contrast: on" : "High contrast: off", "contrast")}</div><h3>Keyboard & mouse</h3><p>WASD / Arrows: drive · Click / Space: dash · E: ram or jump · P / Esc: pause · R: retry · M: mute. Aim at a target before clicking. Ramps let you jump barriers. Numbered gates must be crossed in order.</p><p>Fullscreen is controlled by the host platform, not an in-game button.</p><h3>Audio credits</h3><p>Music: “Candy” by Abstraction / Tallbeard Studios, Three Red Hearts (CC0). SFX: Kenney Impact Sounds & Music Jingles (CC0). Source links and full license notices ship in THIRD_PARTY_NOTICES.txt.</p><div class="ta-actions">${button("Back", "menu")}</div>`,
  );
}
$("overlay").addEventListener("input", (e) => {
  if (e.target.id === "volume") {
    save.volume = Number(e.target.value) / 100;
    audio.setVolume(save.volume);
    $("volume-value").textContent = `${e.target.value}%`;
    persist();
  }
});
function testParts() {
  const scrollTop = $("overlay").firstElementChild?.scrollTop || 0;
  game.testBuild ??= { ...save.build };
  panel(
    `<h2>Sandbox parts</h2><p>Every part is available here. Test-only choices do not unlock arena parts.</p>${Object.entries(
      PARTS,
    )
      .map(
        ([slot, parts]) =>
          `<h3>${slot.toUpperCase()}</h3><div class="ta-parts">${parts.map((p, i) => `<button data-action="test-${slot}-${i}" aria-pressed="${game.testBuild[slot] === i}"><strong>${p.name}${game.testBuild[slot] === i ? " / testing" : ""}</strong><span>${p.note}</span></button>`).join("")}</div>`,
      )
      .join(
        "",
      )}<div class="ta-actions">${button("Resume", "resume", true)}</div>`,
  );
  $("overlay").firstElementChild.scrollTop = scrollTop;
}
async function start(index, tutorial = false) {
  audio.setActive(false);
  audio.unlock();
  game = new Game(index, (kind) => audio.effect(kind), save.build);
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
      "Next: four laps, five gates each, before 90 seconds.",
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
  $("level-name").textContent =
    `${game.index === -1 ? "TEST" : String(game.index + 1).padStart(2, "0")} / ${game.level.name}`;
  $("objective").textContent = game.tutorial
    ? "Practice: drive, then dash"
    : game.gateHintRemaining > 0
      ? `${game.progress()} · Wrong order`
      : game.progress();
  $("timer").textContent = game.tutorial
    ? "PRACTICE"
    : game.index === -1
      ? "TEST"
      : `${Math.max(0, Math.ceil(game.level.limit - game.time))}s`;
  $("health").textContent =
    `Hull ${game.stats.hull - game.hits}/${game.stats.hull} · E ${game.abilityCooldown > 0 ? Math.ceil(game.abilityCooldown) + "s" : "ready"}`;
}
function pause() {
  if (phase !== "playing") return;
  phase = "paused";
  keys.clear();
  audio.setActive(false);
  panel(
    `<p class="ta-eyebrow">ENGINE IDLE</p><h2>Paused</h2><p>The timer and marbles are stopped.</p><p>${game.level.goal}</p><div class="ta-actions">${button("Resume", "resume", true)}${button("Retry", "retry")}${game.index === -1 ? button("Test parts", "test-parts") : ""}${button("Garage", "garage")}${button("Arena", "menu")}</div>`,
  );
}
async function resume() {
  if (phase !== "paused") return;
  audio.unlock();
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
  const before = totalStars(save);
  const record =
    game.won &&
    (save.records[game.index] === null || game.time < save.records[game.index]);
  if (record) save.records[game.index] = game.time;
  if (stars > save.stars[game.index]) {
    save.stars[game.index] = stars;
  }
  persist();
  const earned = starConditions(game);
  for (let i = 0; i < 3; i++)
    if (earned[i])
      setTimeout(
        () => {
          if (phase === "result") audio.effect("reward");
        },
        150 + i * 220,
      );
  const unlocked = LEVELS.filter(
    (l) => l.unlock > before && l.unlock <= totalStars(save),
  ).map((l) => l.name);
  const nextLocked = LEVELS.find((l) => l.unlock > totalStars(save));
  if (record) audio.effect("record");
  panel(
    `<p class="ta-eyebrow">${game.won ? "ARENA COMPLETE" : "TRY AGAIN"}</p><h2>${game.won ? `${stars} / 3 stars` : "A new line awaits."}</h2><p>${game.reason}</p>${record ? '<p class="ta-record">NEW RECORD</p>' : ""}<p>${game.time.toFixed(1)}s · ${game.hits} hits · ${game.jumps} ramp jumps · Best chain ${game.bestChain}</p><ul class="ta-medals">${game.level.medals.map((m, i) => `<li class="${earned[i] ? "ta-earned" : ""}" style="--ta-delay:${i * 150}ms"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>${earned[i] ? "Earned" : "Not earned"} — ${m}${!earned[i] && !game.won ? " (complete the arena first)" : ""}</li>`).join("")}</ul><p>${unlocked.length ? "Unlocked: " + unlocked.join(", ") : nextLocked ? `Next unlock: ${nextLocked.name} at ${nextLocked.unlock} total stars` : "All arenas unlocked!"}</p><div class="ta-actions">${button("Retry", "retry", true)}${game.won && game.index < LEVELS.length - 1 && totalStars(save) >= LEVELS[game.index + 1].unlock ? button(`Next: ${LEVELS[game.index + 1].name}`, "next") : ""}${button("Arenas", "arenas")}${button("Garage", "garage")}${button("Arena", "menu")}</div>`,
  );
  setTimeout(() => {
    if (phase === "result") audio.setActive(false);
  }, 1800);
}
$("overlay").addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  if (action === "play") start(0, !save.tutorialSeen);
  else if (action === "tutorial") start(0, true);
  else if (action?.startsWith("level-")) {
    const i = Number(action.slice(6));
    if (totalStars(save) >= LEVELS[i].unlock) start(i);
  } else if (action === "arenas") arenas();
  else if (action === "garage") garage();
  else if (action === "sandbox") start(-1);
  else if (action === "settings") settings();
  else if (action === "contrast") {
    save.contrast = !save.contrast;
    document.body.classList.toggle("ta-contrast", save.contrast);
    persist();
    settings();
  } else if (action === "setting-mute") {
    mute();
    settings();
  } else if (action.startsWith("part-")) {
    const [, slot, value] = action.split("-");
    const n = Number(value);
    if (PARTS[slot][n].cost <= totalStars(save)) {
      save.build[slot] = n;
      persist();
      garage(true);
    }
  } else if (action === "test-parts") {
    testParts();
  } else if (action.startsWith("test-")) {
    const [, slot, n] = action.split("-");
    game.testBuild ??= { ...save.build };
    game.testBuild[slot] = Number(n);
    const test = new Game(-1, () => {}, game.testBuild);
    game.stats = test.stats;
    game.p.cooldown = 0;
    testParts();
  } else if (action === "mute") {
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
  if (k === "e" && phase === "playing") game.ability();
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
          `<p class="ta-eyebrow">PRACTICE PAUSED / NO PENALTY</p><h2>Ready for the race?</h2><p>Practice has paused after 30 seconds. Start the race or keep learning at your own pace.</p><p>Four laps; five gates in order each lap. WASD drives; click dashes.</p><div class="ta-actions">${button("Start race", "skip", true)}${button("Keep practising", "resume")}</div>`,
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
    won: game?.won,
    round: game?.round,
    scene: game?.level.scene,
    build: { ...save.build },
    stats: game ? { ...game.stats } : null,
    blocks: game?.blocks.map((b) => ({ ...b })),
    crates: game?.crates.map((b) => ({ ...b })),
    nuts: game?.nuts.map((b) => ({ ...b })),
    movingWall: game?.movingWall,
    abilityCooldown: game?.abilityCooldown,
    jumps: game?.jumps,
    smashed: game?.smashed,
    volume: save.volume,
    contrast: save.contrast,
    marbles: game?.marbles.filter((m) => m.active).length,
    cooldown: game?.p.cooldown,
    hazards: game?.marbles
      .filter((m) => m.active)
      .map(({ x, y, vx, vy, warning }) => ({ x, y, vx, vy, warning })),
  }),
};
document.body.classList.toggle("ta-contrast", save.contrast);
menu();
renderer.resize();
requestAnimationFrame(frame);
