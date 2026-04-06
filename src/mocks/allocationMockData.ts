/**
 * Mock data for the TL Allocation views.
 * Uses actual pitch IDs/titles/categories/details from pitches-aug-26.json but generates
 * fake vote scores and interest levels. Replace with real backend data when
 * backend integration ships.
 */
import type { Pitch } from '../types/models';
import type {
  AllocationConfig,
  AllocationPitch,
  AllocationPlan,
  Phase2Interest,
  PlanAssignment,
} from '../types/allocationTypes';
import pitchData from '../assets/pitches-aug-26.json';

// ─── Config ───────────────────────────────────────────────────────────────────

export const MOCK_CONFIG: AllocationConfig = {
  bandwidth: {
    'Support AI Charting': 50,
    'Create and Improve Tools and Framework': 30,
    'Mobile Feature Parity': 10,
    'Address Technical Debt': 10,
  },
  nextUpCount: 15,
  testingCaptain: 'Harper Evans',
  devNames: [
    'Alex Chen', 'Sam Rivera', 'Jordan Kim', 'Taylor Patel', 'Morgan Wu',
    'Casey Johnson', 'Riley Thompson', 'Drew Martinez', 'Avery Davis',
    'Blake Wilson', 'Cameron Moore', 'Skyler Lee', 'Parker Harris', 'Quinn Brown',
  ],
  devTLNames: ['Chase Grey', 'Jamie Taylor', 'Robin Singh'],
  qmNames: ['Harper Evans', 'Finley Nguyen', 'Kendall Park', 'Logan Turner', 'Reese Anderson', 'Sage Mitchell'],
};

// ─── Score generation ─────────────────────────────────────────────────────────

/** Deterministic score from a string seed, returning a value in [min, max]. */
function hashScore(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return min + (Math.abs(h) % 1000) / 1000 * (max - min);
}

/** Devs whose primary interest area aligns with each category. */
const DEV_AFFINITY: Record<string, string[]> = {
  'Support AI Charting': ['Alex Chen', 'Sam Rivera', 'Taylor Patel', 'Casey Johnson', 'Avery Davis', 'Skyler Lee', 'Quinn Brown'],
  'Create and Improve Tools and Framework': ['Jordan Kim', 'Riley Thompson', 'Cameron Moore', 'Parker Harris', 'Alex Chen', 'Skyler Lee'],
  'Mobile Feature Parity': ['Drew Martinez', 'Taylor Patel'],
  'Address Technical Debt': ['Morgan Wu', 'Blake Wilson', 'Quinn Brown'],
};

/**
 * Devs with no interest data submitted at all.
 * Key absent from devInterest on every pitch = red indicator.
 */
const NO_DATA_DEVS = new Set(['Quinn Brown']);

/**
 * Devs who only partially filled out interest (~50% of pitches).
 * Key present for some pitches but absent for others = amber indicator.
 */
const PARTIAL_DATA_DEVS = new Set(['Morgan Wu']);

function devInterestForPitch(pitchId: string, category: string): Record<string, (1 | 2 | 3 | 4 | null)> {
  const result: Record<string, (1 | 2 | 3 | 4 | null)> = {};
  const affinityDevs = new Set(DEV_AFFINITY[category] ?? []);

  for (const dev of MOCK_CONFIG.devNames) {
    // No-data dev: never include their key
    if (NO_DATA_DEVS.has(dev)) continue;

    // Partial-data dev: skip ~50% of pitches
    if (PARTIAL_DATA_DEVS.has(dev)) {
      const skipCheck = hashScore(`${pitchId}-${dev}-skip`, 0, 1);
      if (skipCheck > 0.5) continue;
    }

    const seed = `${pitchId}-${dev}`;
    const r = hashScore(seed, 0, 1);

    if (affinityDevs.has(dev)) {
      // Affinity devs: skewed toward tiers 1–2
      if (r < 0.35) result[dev] = 1;
      else if (r < 0.65) result[dev] = 2;
      else if (r < 0.85) result[dev] = 3;
      else result[dev] = 4;
    } else {
      // Non-affinity devs: skewed toward tiers 3–4 or skipped
      if (r < 0.08) result[dev] = 1;
      else if (r < 0.20) result[dev] = 2;
      else if (r < 0.50) result[dev] = 3;
      else if (r < 0.80) result[dev] = 4;
      else result[dev] = null;
    }
  }
  return result;
}

// ─── Pitches ──────────────────────────────────────────────────────────────────

export const MOCK_PITCHES: AllocationPitch[] = (pitchData as unknown as Pitch[])
  .map(p => {
    // AI Charting pitches get a slight priority boost (team focus this quarter)
    const boost = p.category === 'Support AI Charting' ? 0.3 : 0;
    // teamPriorityScore: average tier (1 = best, 4 = worst); add small boost for AI Charting
    return {
      ...p,
      teamPriorityScore: Math.max(1, Math.min(4, hashScore(p.id + 'team', 1.5, 4.0) - boost)),
      tlPriorityScore:   Math.max(1, Math.min(4, hashScore(p.id + 'tl',   1.8, 4.0) - boost * 0.7)),
      devInterest: devInterestForPitch(p.id, p.category),
    };
  });

// ─── Plan generation ──────────────────────────────────────────────────────────

type PlanVariant = 'A' | 'B' | 'C';

const PLAN_META: Record<PlanVariant, { label: string; description: string }> = {
  A: { label: 'Plan A — Interest-Weighted', description: 'Prioritizes matching devs to projects they are most excited about' },
  B: { label: 'Plan B — Priority-Focused', description: 'Selects and assigns based on team and TL priority rankings' },
  C: { label: 'Plan C — Balanced', description: 'Balances priority alignment with dev interest and even workload distribution' },
};

const VARIANT_WEIGHTS: Record<PlanVariant, { priority: number; interest: number }> = {
  A: { priority: 0.25, interest: 0.75 },
  B: { priority: 0.75, interest: 0.25 },
  C: { priority: 0.50, interest: 0.50 },
};

function bestDevInterestScore(pitch: AllocationPitch): number {
  const tiers = Object.values(pitch.devInterest).filter((t): t is 1 | 2 | 3 | 4 => t !== null);
  if (tiers.length === 0) return 0;
  // tier 1 → 1.0 (best), tier 4 → 0.25 (worst)
  return (5 - Math.min(...tiers)) / 4;
}

function pitchScore(pitch: AllocationPitch, weights: { priority: number; interest: number }): number {
  // Priority: lower tier = higher priority → invert so higher score = better
  const priorityScore = (5 - pitch.teamPriorityScore) / 4; // 1.0 best, 0.25 worst
  return weights.priority * priorityScore + weights.interest * bestDevInterestScore(pitch);
}

function generatePlan(variant: PlanVariant): AllocationPlan {
  const { devNames, bandwidth, nextUpCount } = MOCK_CONFIG;
  const weights = VARIANT_WEIGHTS[variant];
  const categories = Object.keys(bandwidth);

  // How many slots per category (total = devNames.length = 14)
  const totalSlots = devNames.length;
  const totalPct = categories.reduce((s, c) => s + bandwidth[c], 0);
  const rawSlots = categories.map(c => ({ cat: c, slots: (bandwidth[c] / totalPct) * totalSlots }));

  // Floor each, then distribute remaining slots to highest fractional remainders
  const slotMap: Record<string, number> = {};
  rawSlots.forEach(({ cat, slots }) => { slotMap[cat] = Math.floor(slots); });
  let remaining = totalSlots - Object.values(slotMap).reduce((a, b) => a + b, 0);
  rawSlots
    .map(({ cat, slots }) => ({ cat, frac: slots - Math.floor(slots) }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remaining)
    .forEach(({ cat }) => slotMap[cat]++);

  // Select top pitches per category
  const selected: AllocationPitch[] = [];
  categories.forEach(cat => {
    const catPitches = MOCK_PITCHES
      .filter(p => p.category === cat)
      .sort((a, b) => pitchScore(b, weights) - pitchScore(a, weights));
    const slots = Math.min(slotMap[cat], catPitches.length);
    selected.push(...catPitches.slice(0, slots));
  });

  // Assign devs greedily: highest-interest dev with fewest current assignments
  const devCount: Record<string, number> = {};
  devNames.forEach(d => { devCount[d] = 0; });
  const MAX_PER_DEV = 3;

  // Process pitches in score order so most contested ones get first pick
  const sortedSelected = [...selected].sort((a, b) => pitchScore(b, weights) - pitchScore(a, weights));
  const assignments: PlanAssignment[] = sortedSelected.map(pitch => {
    const candidateDev = devNames
      .filter(d => devCount[d] < MAX_PER_DEV)
      .sort((a, b) => {
        const tA = pitch.devInterest[a] ?? 5;
        const tB = pitch.devInterest[b] ?? 5;
        if (tA !== tB) return tA - tB;
        // Plan C tie-break: prefer devs with fewer assignments
        return variant === 'C' ? devCount[a] - devCount[b] : 0;
      })[0] ?? null;

    if (candidateDev) devCount[candidateDev]++;
    return { pitchId: pitch.id, assignedDev: candidateDev, status: 'selected' };
  });

  // Next-up: next N across all categories by score
  const selectedIds = new Set(selected.map(p => p.id));
  const notSelected = MOCK_PITCHES
    .filter(p => !selectedIds.has(p.id))
    .sort((a, b) => pitchScore(b, weights) - pitchScore(a, weights));

  notSelected.slice(0, nextUpCount).forEach(p =>
    assignments.push({ pitchId: p.id, assignedDev: null, status: 'next-up' })
  );
  notSelected.slice(nextUpCount).forEach(p =>
    assignments.push({ pitchId: p.id, assignedDev: null, status: 'cut' })
  );

  return { id: variant, ...PLAN_META[variant], assignments };
}

export const MOCK_PLANS: AllocationPlan[] = ['A', 'B', 'C'].map(v => generatePlan(v as PlanVariant));

// ─── Phase 2 interest ─────────────────────────────────────────────────────────

const TL_AFFINITY: Record<string, string[]> = {
  'Chase Grey': ['Support AI Charting'],
  'Jamie Taylor': ['Create and Improve Tools and Framework'],
  'Robin Singh': ['Create and Improve Tools and Framework', 'Address Technical Debt'],
};

const QM_AFFINITY: Record<string, string[]> = {
  'Harper Evans': ['Support AI Charting'],
  'Finley Nguyen': ['Create and Improve Tools and Framework'],
  'Kendall Park': ['Support AI Charting', 'Mobile Feature Parity'],
  'Logan Turner': ['Address Technical Debt'],
  'Reese Anderson': ['Create and Improve Tools and Framework'],
  'Sage Mitchell': ['Support AI Charting'], // Sage has no data (omitted below)
};

/** QMs who submitted no Phase 2 interest data at all. */
const PHASE2_NO_DATA = new Set(['Sage Mitchell']);
/** People who only filled out ~50% of Phase 2 pitches. */
const PHASE2_PARTIAL_DATA = new Set(['Logan Turner']);

function phase2InterestForPerson(name: string, role: 'dev TL' | 'QM', selectedPitchIds: string[]): Phase2Interest {
  if (PHASE2_NO_DATA.has(name)) {
    return { personName: name, role, interestByPitchId: {} };
  }

  const affinity = role === 'dev TL' ? TL_AFFINITY[name] ?? [] : QM_AFFINITY[name] ?? [];
  const affinitySet = new Set(affinity);

  const interestByPitchId: Partial<Record<string, (1 | 2 | 3 | 4 | null)>> = {};
  for (const pitchId of selectedPitchIds) {
    // Partial-data person: skip ~50% of pitches
    if (PHASE2_PARTIAL_DATA.has(name)) {
      const skipCheck = hashScore(`${pitchId}-${name}-p2skip`, 0, 1);
      if (skipCheck > 0.5) continue;
    }

    const pitch = MOCK_PITCHES.find(p => p.id === pitchId);
    if (!pitch) continue;

    const r = hashScore(`${pitchId}-${name}-phase2`, 0, 1);
    if (affinitySet.has(pitch.category)) {
      if (r < 0.4) interestByPitchId[pitchId] = 1;
      else if (r < 0.7) interestByPitchId[pitchId] = 2;
      else if (r < 0.9) interestByPitchId[pitchId] = 3;
      else interestByPitchId[pitchId] = 4;
    } else {
      if (r < 0.1) interestByPitchId[pitchId] = 1;
      else if (r < 0.25) interestByPitchId[pitchId] = 2;
      else if (r < 0.6) interestByPitchId[pitchId] = 3;
      else interestByPitchId[pitchId] = 4;
    }
  }
  return { personName: name, role, interestByPitchId };
}

// Use Plan C's selected pitches as the Phase 2 pitch set (balanced plan is the default)
const defaultSelectedIds = MOCK_PLANS[2].assignments
  .filter(a => a.status === 'selected')
  .map(a => a.pitchId);

export const MOCK_PHASE2_INTERESTS: Phase2Interest[] = [
  ...MOCK_CONFIG.devTLNames.map(name => phase2InterestForPerson(name, 'dev TL', defaultSelectedIds)),
  ...MOCK_CONFIG.qmNames.map(name => phase2InterestForPerson(name, 'QM', defaultSelectedIds)),
];
