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

  // Assign devs: continuation projects lock to their previousDev first (unless at cap
  // or explicitly low interest), then fill the rest greedily by interest + workload.
  const devCount: Record<string, number> = {};
  devNames.forEach(d => { devCount[d] = 0; });
  const MAX_PER_DEV = 2;

  // Process continuations first so previousDev slots are reserved before open pitches compete.
  const continuations = selected.filter(p => p.continuation && p.previousDev && devNames.includes(p.previousDev!));
  const openPitches   = selected.filter(p => !(p.continuation && p.previousDev && devNames.includes(p.previousDev!)));

  const sortByPriority = (arr: AllocationPitch[]) =>
    [...arr].sort((a, b) => pitchPriorityScore(b) - pitchPriorityScore(a));

  // Sort open pitches by best interest any dev has (ascending = best first),
  // then by priority score as tiebreaker. Ensures devs fill their cap with
  // highest-interest pitches before lower-interest ones, matching PQA1 behavior.
  const sortByInterestThenPriority = (arr: AllocationPitch[]) =>
    [...arr].sort((a, b) => {
      const bestA = devNames.reduce((min, d) => Math.min(min, (a.devInterest[d] ?? 5) as number), 5);
      const bestB = devNames.reduce((min, d) => Math.min(min, (b.devInterest[d] ?? 5) as number), 5);
      if (bestA !== bestB) return bestA - bestB;
      return pitchPriorityScore(b) - pitchPriorityScore(a);
    });

  const assignDev = (pitch: AllocationPitch): string | null => {
    // For continuations: lock to previousDev unless at cap or explicitly low interest (tier 4)
    if (pitch.continuation && pitch.previousDev && devNames.includes(pitch.previousDev)) {
      const prev = pitch.previousDev;
      const interest = pitch.devInterest[prev] ?? null;
      const lowInterest = interest === 4;
      if (!lowInterest && devCount[prev] < MAX_PER_DEV) {
        devCount[prev]++;
        return prev;
      }
    }
    // Open assignment: best interest tier, fewest assignments as tiebreaker
    const best = devNames
      .filter(d => devCount[d] < MAX_PER_DEV)
      .sort((a, b) => {
        const tA = pitch.devInterest[a] ?? 5;
        const tB = pitch.devInterest[b] ?? 5;
        if (tA !== tB) return (tA as number) - (tB as number);
        return devCount[a] - devCount[b];
      })[0] ?? null;
    if (best) devCount[best]++;
    return best;
  };

  const assignments: PlanAssignment[] = [
    ...sortByPriority(continuations),
    ...sortByInterestThenPriority(openPitches),
  ].map(pitch => ({ pitchId: pitch.id, assignedDev: assignDev(pitch), status: 'selected' as const }));

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
  // Hard cap so no dev gets more than their fair share regardless of interest advantage.
  const cap = devNames.length > 0 ? Math.ceil(pitches.length / devNames.length) : 0;

  const result: Record<string, string | null> = {};
  // Sort by best available interest for any eligible dev (ascending = best first),
  // so devs fill their cap with highest-interest pitches before lower-interest ones.
  // Within the same interest tier, higher-priority pitches (lower score) go first.
  const sorted = [...pitches].sort((a, b) => {
    const exA = devByPitchId[a.id] ?? null;
    const exB = devByPitchId[b.id] ?? null;
    const bestA = devNames
      .filter(d => d !== exA)
      .reduce((min, d) => Math.min(min, (a.devInterest[d] ?? 3) as number), Infinity);
    const bestB = devNames
      .filter(d => d !== exB)
      .reduce((min, d) => Math.min(min, (b.devInterest[d] ?? 3) as number), Infinity);
    if (bestA !== bestB) return bestA - bestB;
    return a.teamPriorityScore - b.teamPriorityScore;
  });

  for (const pitch of sorted) {
    const assignedDev = devByPitchId[pitch.id] ?? null;
    const candidate =
      devNames
        .filter(d => d !== assignedDev && pqa1Load[d] < cap)
        .sort((a, b) => {
          // Combined score: interest + load. No data → neutral (3).
          // Interested devs (tier 1-2) win their preferred pitches; low-interest (4)
          // loses to no-data devs (3) at equal load. Cap prevents any dev going over
          // fair share even when interest advantage would otherwise push them ahead.
          const tA = (pitch.devInterest[a] ?? 3) as number;
          const tB = (pitch.devInterest[b] ?? 3) as number;
          return (tA + pqa1Load[a]) - (tB + pqa1Load[b]);
        })[0] ?? null;

    result[pitch.id] = candidate;
    if (candidate) pqa1Load[candidate]++;
  }

  return result;
}
