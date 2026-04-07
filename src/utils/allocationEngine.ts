/**
 * Plan generation algorithm for TL allocation.
 * Pure function — takes pitches and config, returns three plan variants.
 * Used by both the real TLAllocationView (with live data) and allocationMockData.ts.
 */
import type {
  AllocationPitch,
  AllocationConfig,
  AllocationPlan,
  PlanAssignment,
} from '../types/allocationTypes';

type PlanVariant = 'A' | 'B' | 'C';

const PLAN_META: Record<PlanVariant, { label: string; description: string }> = {
  A: { label: 'Plan A — Balanced', description: 'Weights team and TL priority votes equally' },
  B: { label: 'Plan B — TL-Leaning', description: 'Emphasizes TL priority votes slightly; favors TL judgment at the margin' },
  C: { label: 'Plan C — Team-Leaning', description: 'Emphasizes broader team priority votes slightly; favors collective judgment at the margin' },
};

/** team/tl weights for pitch selection scoring. */
const VARIANT_WEIGHTS: Record<PlanVariant, { team: number; tl: number }> = {
  A: { team: 0.50, tl: 0.50 },
  B: { team: 0.35, tl: 0.65 },
  C: { team: 0.65, tl: 0.35 },
};

/** Higher score = higher priority. Lower vote tier (1=best) maps to higher score. */
function pitchPriorityScore(pitch: AllocationPitch, weights: { team: number; tl: number }): number {
  const teamScore = (5 - pitch.teamPriorityScore) / 4;
  const tlScore = (5 - pitch.tlPriorityScore) / 4;
  return weights.team * teamScore + weights.tl * tlScore;
}

function generatePlan(
  variant: PlanVariant,
  pitches: AllocationPitch[],
  config: AllocationConfig,
): AllocationPlan {
  const { devNames, bandwidth, nextUpCount } = config;
  const weights = VARIANT_WEIGHTS[variant];
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
      .sort((a, b) => pitchPriorityScore(b, weights) - pitchPriorityScore(a, weights));
    const slots = Math.min(slotMap[cat] ?? 0, catPitches.length);
    selected.push(...catPitches.slice(0, slots));
  });

  // Assign devs greedily: best interest tier first, fewest assignments as tie-break
  const devCount: Record<string, number> = {};
  devNames.forEach(d => { devCount[d] = 0; });
  const MAX_PER_DEV = 2;

  const sortedSelected = [...selected].sort(
    (a, b) => pitchPriorityScore(b, weights) - pitchPriorityScore(a, weights),
  );
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
    .sort((a, b) => pitchPriorityScore(b, weights) - pitchPriorityScore(a, weights));

  notSelected.slice(0, nextUpCount).forEach(p =>
    assignments.push({ pitchId: p.id, assignedDev: null, status: 'next-up' }),
  );
  notSelected.slice(nextUpCount).forEach(p =>
    assignments.push({ pitchId: p.id, assignedDev: null, status: 'cut' }),
  );

  return { id: variant, ...PLAN_META[variant], assignments };
}

/**
 * Generate the three allocation plan variants (A, B, C) from real pitches + config.
 */
export function generatePlans(pitches: AllocationPitch[], config: AllocationConfig): AllocationPlan[] {
  return (['A', 'B', 'C'] as PlanVariant[]).map(v => generatePlan(v, pitches, config));
}
