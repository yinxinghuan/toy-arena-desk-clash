export const PARTS = {
  tyres: [
    {
      name: "Road",
      cost: 0,
      note: "Balanced: acceleration 680, drag 4.8",
      accel: 680,
      drag: 4.8,
    },
    {
      name: "Grip",
      cost: 3,
      note: "Stops sharply; slower corner exit (800 / 6.8)",
      accel: 800,
      drag: 6.8,
    },
    {
      name: "Drift",
      cost: 6,
      note: "Faster glide; longer braking (600 / 3.3)",
      accel: 600,
      drag: 3.3,
    },
  ],
  frame: [
    {
      name: "Light",
      cost: 0,
      note: "3 hull · weight 1 · fast acceleration",
      mass: 1,
      hull: 3,
    },
    {
      name: "Hauler",
      cost: 4,
      note: "4 hull · weight 1.8 · 20% slower · 80% more push",
      mass: 1.8,
      hull: 4,
    },
  ],
  module: [
    {
      name: "Ram",
      cost: 0,
      note: "520 dash · 1.1s recharge · E: reinforced ram",
      speed: 520,
      cooldown: 1.1,
    },
    {
      name: "Spring",
      cost: 5,
      note: "420 dash · 1.4s recharge · E: 0.7s jump / 3s recharge",
      speed: 420,
      cooldown: 1.4,
    },
  ],
};
export const totalStars = (save) => save.stars.reduce((a, b) => a + b, 0);
export function statsFor(build = {}) {
  const tyres = PARTS.tyres[build.tyres] || PARTS.tyres[0];
  const frame = PARTS.frame[build.frame] || PARTS.frame[0];
  const module = PARTS.module[build.module] || PARTS.module[0];
  return {
    ...tyres,
    ...frame,
    ...module,
    accel: tyres.accel * (frame.mass > 1 ? 0.8 : 1),
    spring: module === PARTS.module[1],
  };
}
