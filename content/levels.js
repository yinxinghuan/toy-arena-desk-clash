const FIRST = [
  {
    name: "Tape Sprint",
    kind: "race",
    limit: 60,
    subtitle: "Follow the five numbered gates. Use ramps to cut corners.",
    goal: "Cross 5 gates in order",
    start: [130, 390],
    gates: [
      [280, 390],
      [420, 210],
      [680, 170],
      [800, 330],
      [670, 430],
    ],
    ramps: [
      [355, 300],
      [735, 255],
    ],
    walls: [
      [490, 285, 180, 34],
      [250, 130, 32, 125],
    ],
    blocks: [],
    medals: ["Cross all 5 gates", "Finish in 35 seconds", "Take no damage"],
  },
  {
    name: "Stampede Station",
    kind: "capture",
    limit: 60,
    subtitle: "Dash into paper toys, then park on the brass capture pad.",
    goal: "Break 8 toys + hold the pad for 4s",
    start: [120, 400],
    gates: [],
    ramps: [
      [255, 320],
      [750, 210],
    ],
    walls: [
      [355, 200, 30, 115],
      [670, 335, 130, 28],
    ],
    blocks: [
      [245, 160],
      [315, 400],
      [450, 140],
      [540, 200],
      [630, 150],
      [800, 400],
      [720, 270],
      [500, 410],
    ],
    medals: [
      "Break 8 toys and capture the pad",
      "Finish in 40 seconds",
      "Take no damage",
    ],
  },
  {
    name: "Marble Mayhem",
    kind: "survive",
    limit: 45,
    subtitle:
      "Keep moving! Collect 4 brass nuts and survive the rolling marbles.",
    goal: "Survive 45s + collect 4 nuts",
    start: [480, 280],
    gates: [],
    ramps: [
      [270, 240],
      [670, 380],
    ],
    walls: [
      [150, 180, 120, 25],
      [680, 165, 120, 25],
    ],
    blocks: [],
    nuts: [
      [150, 400],
      [320, 160],
      [740, 360],
      [800, 230],
      [430, 410],
      [600, 145],
    ],
    medals: [
      "Survive and collect 4 nuts",
      "Take no damage",
      "Collect all 6 nuts",
    ],
  },
];
FIRST[0].laps = 4;
FIRST[0].limit = 90;
FIRST[0].par = 60;
FIRST[0].goal = "4 laps · 5 gates in order";
FIRST[0].subtitle =
  "Four laps. Follow the outlined next gate; ramps jump the barriers.";
FIRST[1].rounds = 2;
FIRST[1].pads = [
  [520, 380],
  [220, 300],
];
FIRST[1].hold = 5;
FIRST[1].limit = 90;
FIRST[1].par = 70;
FIRST[1].goal = "2 rounds · break 8, hold 5s each";
FIRST[1].subtitle =
  "Clear the toys and hold the pad. Round 2 moves the toys and pad to the left.";
const nuts = [
  [150, 400],
  [320, 160],
  [740, 360],
  [800, 230],
  [430, 410],
  [600, 145],
];
const extras = [
  {
    name: "Cargo Corner",
    kind: "push",
    limit: 75,
    par: 55,
    start: [160, 390],
    crates: [
      [200, 160],
      [230, 400],
    ],
    target: [740, 330],
    goal: "Push both cargo boxes into the striped bay",
    subtitle:
      "Drive into cargo to push it. A Hauler frame pushes harder; dash is optional.",
    walls: [[450, 180, 30, 160]],
    ramps: [[470, 400]],
  },
  {
    name: "Ice Ribbon",
    kind: "race",
    limit: 90,
    par: 65,
    start: [130, 420],
    laps: 3,
    gates: [
      [230, 170],
      [480, 145],
      [790, 210],
      [740, 420],
      [360, 410],
    ],
    ice: [
      [280, 120, 360, 100],
      [490, 350, 300, 100],
    ],
    walls: [[390, 255, 220, 35]],
    ramps: [
      [300, 300],
      [680, 300],
    ],
    goal: "3 laps across the slippery ribbon",
    subtitle:
      "ICE lowers grip. Brake early or fit Grip tyres; cross gates in order.",
  },
  {
    name: "Nut Circuit",
    kind: "survive",
    limit: 50,
    start: [130, 280],
    nuts,
    required: 6,
    walls: [[350, 240, 180, 28]],
    ramps: [
      [250, 300],
      [650, 350],
    ],
    moving: true,
    goal: "Collect all 6 nuts and survive 50s",
    subtitle:
      "A striped barrier sweeps across the desk. Use ramps or the Spring module.",
  },
  {
    name: "Moving Day",
    kind: "push",
    limit: 90,
    par: 70,
    start: [130, 400],
    crates: [
      [280, 180],
      [330, 410],
    ],
    target: [750, 310],
    walls: [
      [500, 140, 25, 135],
      [500, 370, 25, 90],
    ],
    moving: true,
    ramps: [[420, 310]],
    goal: "Push 2 boxes past the moving barrier",
    subtitle:
      "Wait for the striped barrier to pass; keep cargo away from the desk edges.",
  },
  {
    name: "Double Trouble",
    kind: "capture",
    limit: 90,
    par: 70,
    start: [120, 400],
    rounds: 2,
    hold: 5,
    pads: [
      [750, 400],
      [200, 180],
    ],
    blocks: [
      [230, 390],
      [240, 170],
      [410, 145],
      [540, 205],
      [650, 150],
      [810, 400],
      [720, 275],
      [500, 420],
    ],
    walls: [[350, 225, 25, 120]],
    ramps: [[440, 330]],
    hazards: true,
    goal: "2 clear-and-capture rounds under marble pressure",
    subtitle:
      "Dash breaks toys AND marbles. Clear all eight before the pad counts.",
  },
  {
    name: "Packing Slalom",
    kind: "race",
    limit: 90,
    par: 65,
    start: [130, 410],
    laps: 3,
    gates: [
      [200, 160],
      [450, 180],
      [760, 145],
      [820, 390],
      [400, 420],
    ],
    walls: [
      [280, 220, 35, 145],
      [560, 285, 130, 30],
    ],
    moving: true,
    ramps: [
      [470, 300],
      [700, 360],
    ],
    goal: "3 laps · jump or dodge the moving barrier",
    subtitle:
      "The numbered route crosses a moving barrier; time your approach.",
  },
  {
    name: "Last Desk Standing",
    kind: "survive",
    limit: 60,
    start: [480, 280],
    nuts,
    required: 6,
    ice: [[250, 350, 420, 100]],
    moving: true,
    walls: [
      [200, 180, 130, 28],
      [650, 180, 130, 28],
    ],
    ramps: [
      [360, 250],
      [600, 330],
    ],
    goal: "Survive 60s + collect all 6 nuts",
    subtitle:
      "Marbles, ice and a moving barrier. Dash clears danger; jump buys safety.",
  },
];
export const LEVELS = [...FIRST, ...extras].map((l, i) => ({
  gates: [],
  blocks: [],
  walls: [],
  ramps: [],
  required: 4,
  laps: 1,
  rounds: 1,
  hold: 4,
  ...l,
  unlock: i < 3 ? 0 : (i - 2) * 2,
  scene: i < 4 ? "Workshop" : i < 7 ? "Drafting" : "Packing",
  skill:
    i === 0
      ? "ramps"
      : i === 1
        ? "chain"
        : i === 4 || i === 8
          ? "ramps"
          : l.kind === "survive"
            ? i === 2
              ? "nuts"
              : "marbles"
            : "clean",
  medals: [
    "Complete the arena",
    l.kind === "survive" ? "Take no damage" : `Finish within ${l.par || 40}s`,
    i === 0 || i === 4 || i === 8
      ? "Launch from 2 ramps"
      : i === 1
        ? "Break 3 toys within a 5s chain"
        : l.kind === "survive"
          ? i === 2
            ? "Collect all 6 nuts"
            : "Dash through 3 marbles"
          : "Take no damage",
  ],
}));
export const SANDBOX = {
  name: "Sandbox Test Desk",
  scene: "Workshop",
  kind: "sandbox",
  limit: Infinity,
  start: [130, 390],
  gates: [],
  blocks: [
    [400, 180],
    [760, 410],
  ],
  crates: [
    [350, 350],
    [620, 220],
  ],
  target: [790, 330],
  walls: [[470, 260, 130, 28]],
  ramps: [
    [270, 250],
    [680, 370],
  ],
  ice: [[180, 390, 330, 65]],
  moving: true,
  goal: "Experiment · no timer, damage or stars",
  subtitle:
    "Test grip, cargo pushing, ramps and E ability. Pause to change parts.",
};
