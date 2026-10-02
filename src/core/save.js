export const KEY = "toy-arena-desk-clash:v1";
export const fresh = () => ({
  version: 2,
  stars: LEVELS.map(() => 0),
  records: LEVELS.map(() => null),
  build: { tyres: 0, frame: 0, module: 0 },
  volume: 0.65,
  contrast: false,
  muted: false,
  tutorialSeen: false,
});
export function validateSave(value) {
  if (!value || ![1, 2].includes(value.version) || !Array.isArray(value.stars))
    throw new Error("Invalid save");
  const result = {
    ...fresh(),
    stars: LEVELS.map((_, i) =>
      Math.max(0, Math.min(3, Math.floor(Number(value.stars[i]) || 0))),
    ),
    muted: value.muted === true,
    tutorialSeen: value.tutorialSeen === true,
    records: LEVELS.map((_, i) =>
      Number.isFinite(value.records?.[i]) && value.records[i] > 0
        ? value.records[i]
        : null,
    ),
    volume:
      typeof value.volume === "number" && Number.isFinite(value.volume)
        ? Math.max(0, Math.min(1, value.volume))
        : 0.65,
    contrast: value.contrast === true,
  };
  for (const slot of Object.keys(PARTS)) {
    const n = value.build?.[slot];
    result.build[slot] =
      Number.isInteger(n) && PARTS[slot][n]?.cost <= totalStars(result) ? n : 0;
  }
  return result;
}
export function readSave(storage) {
  try {
    const raw = storage.getItem(KEY);
    return { data: raw ? validateSave(JSON.parse(raw)) : fresh(), warning: "" };
  } catch {
    return {
      data: fresh(),
      warning: "Your save could not be read. A fresh local session is ready.",
    };
  }
}
export function writeSave(storage, data) {
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return "";
  } catch {
    return "Saving is unavailable. You can still play; progress will last only this session.";
  }
}
import { LEVELS } from "../../content/levels.js";
import { PARTS, totalStars } from "../../content/builds.js";
