import test from "node:test";
import assert from "node:assert/strict";
import { Game, starsFor } from "../src/core/game.js";
import { fresh, validateSave, readSave, writeSave } from "../src/core/save.js";
test("driving, friction, directional dash and cooldown", () => {
  const g = new Game();
  const x = g.p.x;
  for (let i = 0; i < 60; i++) g.update(1 / 60, { x: 1 });
  assert.ok(g.p.x > x + 50);
  const speed = g.p.vx;
  for (let i = 0; i < 15; i++) g.update(1 / 60, {});
  assert.ok(g.p.vx < speed);
  g.dash(g.p.x, g.p.y - 100);
  assert.ok(g.p.vy < 0);
  g.dash(g.p.x - 100, g.p.y);
  assert.equal(g.p.vx, 0);
});
test("safe practice does not spend time; needs actual gate and dash contact", () => {
  const g = new Game();
  g.tutorial = true;
  for (let i = 0; i < 120; i++) g.update(1 / 60, {});
  assert.equal(g.time, 0);
  g.p.x = 280;
  g.p.y = 390;
  g.update(1 / 60, {});
  assert.ok(g.practiceGate);
  g.p.x = 420;
  g.update(1 / 60, {});
  assert.ok(!g.practiceBlock);
  g.dash(520, 390);
  g.update(1 / 60, {});
  assert.ok(g.practiceBlock);
});
test("race only accepts sequential gates and awards independent stars", () => {
  const g = new Game();
  g.p.x = 680;
  g.p.y = 170;
  g.update(1 / 60, {});
  assert.equal(g.gate, 0);
  assert.ok(g.gateHintRemaining > 0);
  assert.ok(g.progress().includes("Next Gate 1"));
  for (const [x, y] of Array.from({ length: 4 }, () => g.level.gates).flat()) {
    g.p.x = x;
    g.p.y = y;
    g.p.vx = g.p.vy = 0;
    g.update(1 / 60, {});
  }
  assert.ok(g.won);
  assert.equal(g.gateHintRemaining, 0);
  g.jumps = 2;
  assert.equal(starsFor(g), 3);
  g.time = 70;
  assert.equal(starsFor(g), 2);
  g.jumps = 0;
  assert.equal(starsFor(g), 1);
});
test("capture requires all toys before pad hold", () => {
  const g = new Game(1);
  g.p.x = 520;
  g.p.y = 300;
  g.update(1, {});
  assert.equal(g.held, 0);
  for (let round = 0; round < 2; round++) {
    for (const b of g.blocks) {
      g.p.x = b.x;
      g.p.y = b.y;
      g.p.dash = 0.22;
      g.p.vx = g.p.vy = 0;
      g.update(1 / 60, {});
    }
    assert.equal(g.broken, 8 * (round + 1));
    g.p.x = g.pad[0];
    g.p.y = g.pad[1];
    g.p.dash = 0;
    for (let i = 0; i < 301; i++) g.update(1 / 60, {});
  }
  assert.ok(g.won);
});
test("survival needs nuts, three hits fail and airborne toy is protected", () => {
  const g = new Game(2);
  g.p.jump = 0.5;
  g.damage();
  assert.equal(g.hits, 0);
  g.p.jump = 0;
  g.damage();
  g.p.immune = 0;
  g.damage();
  g.p.immune = 0;
  g.damage();
  assert.ok(g.ended && !g.won);
  const a = new Game(2);
  a.time = 45;
  a.update(1 / 60, {});
  assert.ok(!a.won);
  const b = new Game(2);
  b.collected = 4;
  b.time = 45;
  b.update(1 / 60, {});
  assert.ok(b.won);
  assert.equal(starsFor(b), 2);
});
test("ramp launch and pool bounds", () => {
  const g = new Game();
  g.p.x = 355;
  g.p.y = 300;
  g.p.vx = 100;
  g.update(1 / 60, {});
  assert.ok(g.p.jump > 0);
  for (let i = 0; i < 100; i++) g.emit("hit");
  assert.equal(g.particles.length, 96);
  assert.equal(g.marbles.length, 12);
});
test("timeout, best-save normalization, corruption and blocked storage", () => {
  const g = new Game();
  g.time = 90;
  g.update(1 / 60, {});
  assert.ok(g.ended && !g.won);
  assert.deepEqual(
    validateSave({ version: 1, stars: [8, -2, "2"] }).stars,
    [3, 0, 2, 0, 0, 0, 0, 0, 0, 0],
  );
  assert.equal(readSave({ getItem: () => "{" }).data.version, 2);
  assert.ok(
    writeSave(
      {
        setItem() {
          throw Error();
        },
      },
      fresh(),
    ),
  );
  assert.ok(
    readSave({
      getItem() {
        throw Error();
      },
    }).warning,
  );
});
