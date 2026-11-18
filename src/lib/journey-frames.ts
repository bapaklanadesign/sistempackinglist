// Ordered CDN URLs of the homepage journey footage frames (pointer files in src/assets/journey).
const modules = import.meta.glob<string>("../assets/journey/*.asset.json", { eager: true, import: "url" });
export const journeyFrames = Object.keys(modules).sort().map(k => modules[k]).filter((u): u is string => typeof u === "string");
