/**
 * Plan generation algorithm for TL allocation.
 * Pure function — takes pitches and config, returns a default plan.
 * Used by both the real TLAllocationView (with live data) and allocationMockData.ts.
 */
import type {
  AllocationPitch,
  AllocationConfig,
  PlanAssignment,
} from '../types/allocationTypes';

/** Higher score = higher priority. Lower vote tier (1=best) maps to higher score. */
function pitchPriorityScore(pitch: AllocationPitch): number {
  const teamScore = (5 - pitch.teamPriorityScore) / 4;
  const tlScore = (5 - pitch.tlPriorityScore) / 4;
  return 0.50 * teamScore + 0.50 * tlScore;
}

/**
 * Generate a single default allocation plan from real pitches + config.
 * Uses balanced team/TL priority weighting (50/50).
 * TLs can adjust the resulting plan manually in Stage 1.
 */
export function generateDefaultPlan(pitches: AllocationPitch[], config: AllocationConfig): PlanAssignment[] {
  const { devNames, bandwidth, nextUpCount } = config;
  const categories = Object.keys(bandwidth);

  // 2 projects per dev
  const totalSlots = devNames.length * 2;
  const totalPct = categories.reduce((s, c) => s + bandwidth[c], 0);
  const rawSlots = categories.map(c => ({ cat: c, slots: (bandwidth[c] / totalPct) * totalSlots }));

  // Floor each, distribute remaining slots to highest fractional remainders
  const slotMap: Record<string, number> = {};
  rawSlots.forEach(({ cat, slots }) => { slotMap[cat] = Math.floor(slots); });
  let remaining = totalSlots - Object.values(slotMap).reduce((a, b) => a + b, 0);
  rawSlots
    .map(({ cat, slots }) => ({ cat, frac: slots - Math.floor(slots) }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remaining)
    .forEach(({ cat }) => { slotMap[cat]++; });

  // Select top pitches per category by priority score
  const selected: AllocationPitch[] = [];
  categories.forEach(cat => {
    const catPitches = pitches
      .filter(p => p.category === cat)
      .sort((a, b) => pitchPriorityScore(b) - pitchPriorityScore(a));
    const slots = Math.min(slotMap[cat] ?? 0, catPitches.length);
    selected.push(...catPitches.slice(0, slots));
  });

  // Assign devs greedily: best interest tier first, fewest assignments as tie-break
  const devCount: Record<string, number> = {};
  devNames.forEach(d => { devCount[d] = 0; });
  const MAX_PER_DEV = 2;

  const sortedSelected = [...selected].sort((a, b) => pitchPriorityScore(b) - pitchPriorityScore(a));
  const assignments: PlanAssignment[] = sortedSelected.map(pitch => {
    const candidateDev =
      devNames
        .filter(d => devCount[d] < MAX_PER_DEV)
        .sort((a, b) => {
          const tA = pitch.devInterest[a] ?? 5;
          const tB = pitch.devInterest[b] ?? 5;
          if (tA !== tB) return (tA as number) - (tB as number);
          return devCount[a] - devCount[b];
        })[0] ?? null;

    if (candidateDev) devCount[candidateDev]++;
    return { pitchId: pitch.id, assignedDev: candidateDev, status: 'selected' };
  });

  // Next-up: next N across all categories by score
  const selectedIds = new Set(selected.map(p => p.id));
  const notSelected = pitches
    .filter(p => !selectedIds.has(p.id))
    .sort((a, b) => pitchPriorityScore(b) - pitchPriorityScore(a));

  notSelected.slice(0, nextUpCount).forEach(p =>
    assignments.push({ pitchId: p.id, assignedDev: null, status: 'next-up' }),
  );
  notSelected.slice(nextUpCount).forEach(p =>
    assignments.push({ pitchId: p.id, assignedDev: null, status: 'cut' }),
  );

  return assignments;
}

/**
 * Auto-assign a PQA1 reviewer for each pitch using round-1 developer interest.
 * The assigned dev is excluded from candidacy. Ties broken by current PQA1 load.
 * Higher-priority pitches (lower teamPriorityScore) are assigned first.
 * Returns pitchId → reviewer name (or null if no candidates remain).
 */
export function autoAssignPqa1(
  pitches: AllocationPitch[],
  devByPitchId: Record<string, string | null>,
  devNames: string[],
): Record<string, string | null> {
  const pqa1Load: Record<string, number> = {};
  devNames.forEach(d => { pqa1Load[d] = 0; });

  const result: Record<string, string | null> = {};
  const sorted = [...pitches].sort((a, b) => a.teamPriorityScore - b.teamPriorityScore);

  for (const pitch of sorted) {
    const assignedDev = devByPitchId[pitch.id] ?? null;
    const candidate =
      devNames
        .filter(d => d !== assignedDev)
        .sort((a, b) => {
          const tA = (pitch.devInterest[a] ?? 5) as number;
          const tB = (pitch.devInterest[b] ?? 5) as number;
          if (tA !== tB) return tA - tB;
          return pqa1Load[a] - pqa1Load[b];
        })[0] ?? null;

    result[pitch.id] = candidate;
    if (candidate) pqa1Load[candidate]++;
  }

  return result;
}
