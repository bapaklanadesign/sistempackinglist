/** Pure timing for the homepage Swarm Rebuild intro (ms from start). */
export const SWARM_GROUPS = ["nav", "hero", "visual", "components"] as const;
export type SwarmGroup = (typeof SWARM_GROUPS)[number];
export const SWARM = {
  start: { nav: 900, hero: 1900, visual: 3000, components: 4100 } as Record<SwarmGroup, number>,
  travel: 1300, // particles fly from swarm to their target
  stagger: 450, // per-particle spread inside a group
  final: 5800, // every element is revealed, particles start dissolving
  end: 7400, // overlay removed, page fully normal
};
export const STAGE_LABELS = ["01 · Digital Initialization", "02 · Navigation Assembly", "03 · Hero Assembly", "04 · Visual Reconstruction", "05 · Component Assembly", "06 · Final Reconstruction"];

/** Index into STAGE_LABELS for elapsed time t. */
export function stageAt(t: number): number {
  if (t >= SWARM.final) return 5;
  let s = 0; SWARM_GROUPS.forEach((g, i) => { if (t >= SWARM.start[g]) s = i + 1; });
  return s;
}
/** Time at which the real element of a group fades in (particles have landed). */
export const revealAt = (g: SwarmGroup) => SWARM.start[g] + SWARM.travel + SWARM.stagger * .5;
/** Eased 0..1 travel progress of one particle with personal delay d (0..1). */
export function travel(t: number, g: SwarmGroup, d: number): number {
  const k = Math.min(1, Math.max(0, (t - SWARM.start[g] - d * SWARM.stagger) / SWARM.travel));
  return 1 - (1 - k) ** 3;
}
/** Adaptive particle budget for viewport width, CPU cores and reduced-data hints. */
export function particleBudget(width: number, cores: number): number {
  const base = width < 700 ? 2200 : width < 1200 ? 3800 : 5200;
  return cores && cores <= 4 ? Math.round(base * .55) : base;
}
