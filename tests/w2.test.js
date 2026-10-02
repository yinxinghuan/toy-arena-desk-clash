import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../content/levels.js";
import { statsFor } from "../content/builds.js";
import { Game, starsFor, starConditions } from "../src/core/game.js";
import { validateSave } from "../src/core/save.js";
test("ten authored arenas and independent bonus conditions", () => {
  assert.equal(LEVELS.length, 10);
  for (let i = 0; i < 10; i++) {
    const g = new Game(i);
    assert.equal(g.level.medals.length, 3);
    g.won = true;
    g.time = 1;
    g.jumps = 2;
    g.bestChain = 3;
    g.collected = 6;
    g.smashed = 3;
    assert.equal(starsFor(g), 3);
  }
  const g = new Game(5);
  g.won = true;
  g.hits = 1;
  g.smashed = 3;
  assert.deepEqual(starConditions(g), [true, false, true]);
});
test("parts have physical tradeoffs and Spring ability is cooldown gated", () => {
  const a = statsFor(),
    b = statsFor({ tyres: 1, frame: 1, module: 1 });
  assert.ok(
    b.accel < a.accel &&
      b.drag > a.drag &&
      b.mass > a.mass &&
      b.hull > a.hull &&
      b.speed < a.speed,
  );
  const g = new Game(-1, () => {}, { module: 1 });
  g.ability();
  assert.equal(g.p.jump, 0.7);
  assert.equal(g.abilityCooldown, 3);
  g.ability();
  assert.equal(g.abilityCooldown, 3);
  g.damage();
  assert.equal(g.hits, 0);
  g.time = 1000;
  g.update(1 / 60, {});
  assert.equal(g.ended, false);
  assert.equal(starsFor(g), 0);
});
test("push cargo delivers only inside marked bay", () => {
  const g = new Game(3);
  g.update(1 / 60, {});
  assert.equal(g.won, false);
  for (const b of g.crates) {
    b.x = g.level.target[0];
    b.y = g.level.target[1];
  }
  g.update(1 / 60, {});
  assert.equal(g.won, true);
});
test("oil grip and moving wall use simulation time", () => {
  const a = new Game(4),
    b = new Game(4);
  a.p.x = b.p.x = 350;
  a.p.y = 160;
  b.p.y = 320;
  a.p.vx = b.p.vx = 100;
  a.update(0.1, {});
  b.update(0.1, {});
  assert.ok(a.p.vx > b.p.vx);
  const m = new Game(5);
  const y = m.movingWall[1];
  m.update(0.1, {});
  assert.notEqual(m.movingWall[1], y);
});
test("v1 saves migrate and invalid or locked parts normalize safely", () => {
  const old = validateSave({
    version: 1,
    stars: [3, 2, 1],
    muted: true,
    tutorialSeen: true,
  });
  assert.equal(old.version, 2);
  assert.equal(old.stars.length, 10);
  assert.deepEqual(old.stars.slice(0, 3), [3, 2, 1]);
  assert.equal(old.muted, true);
  const malformed = validateSave({
    version: 2,
    stars: [0],
    build: { tyres: 2, frame: 99, module: 1 },
    volume: Infinity,
    records: [-5, "12"],
  });
  assert.deepEqual(malformed.build, { tyres: 0, frame: 0, module: 0 });
  assert.equal(malformed.volume, 0.65);
  assert.deepEqual(malformed.records.slice(0, 2), [null, null]);
});
test("accepted final gate does not cause spurious wrong-order message", () => {
  const g = new Game();
  g.gate = 4;
  g.p.x = 670;
  g.p.y = 430;
  g.update(1 / 60, {});
  g.update(1 / 60, {});
  assert.equal(g.gate, 5);
  assert.equal(g.gateHintRemaining, 0);
});
