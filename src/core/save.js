export const KEY = "toy-arena-desk-clash:v1";
export const fresh = () => ({
  version: 1,
  stars: [0, 0, 0],
  muted: false,
  tutorialSeen: false,
});
export function validateSave(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.stars))
    throw new Error("Invalid save");
  return {
    version: 1,
    stars: [0, 1, 2].map((i) =>
      Math.max(0, Math.min(3, Math.floor(Number(value.stars[i]) || 0))),
    ),
    muted: value.muted === true,
    tutorialSeen: value.tutorialSeen === true,
  };
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
