/**
 * Mock data for the TL Allocation views.
 * Uses actual pitch IDs/titles from pitches.json but generates
 * fake vote scores and interest levels. Replace with real backend data when
 * backend integration ships.
 */
import type { Pitch } from '../types/models';
import type {
  AllocationConfig,
  AllocationPitch,
  PlanAssignment,
  Phase2Interest,
} from '../types/allocationTypes';
import pitchData from '../assets/pitches.json';
import { generateDefaultPlan } from '../utils/allocationEngine';

// ─── Config ───────────────────────────────────────────────────────────────────

export const MOCK_CONFIG: AllocationConfig = {
  bandwidth: {
    'Support AI Charting': 50,
    'Create and Improve Tools and Framework': 30,
    'Mobile Feature Parity': 10,
    'Address Technical Debt': 10,
  },
  nextUpCount: 15,
  testingCaptain: 'Lauren Dyer',
  devNames: [
    'Adam Still', 'Brandon Campos Botello', 'Dan Demp', 'Daoxing Zhang',
    'David Coll', 'David Krajnik', 'Gauresh Walia', 'Jacob Franz',
    'Jonathan Ray', 'Josh Lapicola', 'Ke Li', 'Michael Messer',
    'Peter Paulson', 'Peter Wei Lin', 'Tim Paukovits',
  ],
  devTLNames: ['Chase Grey', 'Derek Strehlow', 'Nicholas Rose', 'Sheng Liu'],
  qmNames: ['Aiden Caes', 'Anne Field', 'Damon Drury', 'Derek Skwarczynski', 'Julia Rowan', 'Mariel Zech', 'Parker Volkman'],
  tlEmails: {
    'Chase Grey': 'cgrey@epic.com',
    'Derek Strehlow': 'dstrehlo@epic.com',
    'Nicholas Rose': 'nirose@epic.com',
    'Sheng Liu': 'Sheng@epic.com',
  },
  memberEmails: {
    'Adam Still': 'astill@epic.com',
    'Brandon Campos Botello': 'bcamposb@epic.com',
    'Dan Demp': 'ddemp@epic.com',
    'Daoxing Zhang': 'Daoxing@epic.com',
    'David Coll': 'dcoll@epic.com',
    'David Krajnik': 'dkrajnik@epic.com',
    'Gauresh Walia': 'Gauresh@epic.com',
    'Jacob Franz': 'jfranz@epic.com',
    'Jonathan Ray': 'jray@epic.com',
    'Josh Lapicola': 'jlapicol@epic.com',
    'Ke Li': 'Ke@epic.com',
    'Michael Messer': 'mmesser@epic.com',
    'Peter Paulson': 'ppaulson@epic.com',
    'Peter Wei Lin': 'pelin@epic.com',
    'Tim Paukovits': 'tpaukovi@epic.com',
    'Aiden Caes': 'Aiden@epic.com',
    'Anne Field': 'afield@epic.com',
    'Damon Drury': 'ddrury@epic.com',
    'Derek Skwarczynski': 'dskwarcz@epic.com',
    'Julia Rowan': 'jrowan@epic.com',
    'Lauren Dyer': 'ldyer@epic.com',
    'Mariel Zech': 'Mariel@epic.com',
    'Parker Volkman': 'pvolkman@epic.com',
  },
  quarterLabel: 'Nov 26',
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
  'Support AI Charting': ['Daoxing Zhang', 'Michael Messer', 'Jonathan Ray', 'Josh Lapicola', 'Peter Wei Lin'],
  'Create and Improve Tools and Framework': ['Adam Still', 'David Coll', 'David Krajnik', 'Jacob Franz', 'Ke Li'],
  'Mobile Feature Parity': ['Tim Paukovits', 'Gauresh Walia'],
  'Address Technical Debt': ['Dan Demp', 'Peter Paulson', 'Brandon Campos Botello'],
};

/**
 * Devs with no interest data submitted at all.
 * Key absent from devInterest on every pitch = red indicator.
 */
const NO_DATA_DEVS = new Set(['Ke Li']);

/**
 * Devs who only partially filled out interest (~50% of pitches).
 * Key present for some pitches but absent for others = amber indicator.
 */
const PARTIAL_DATA_DEVS = new Set(['Gauresh Walia']);

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

// ─── Priority vote generation ──────────────────────────────────────────────────

const ALL_VOTERS = [...MOCK_CONFIG.devNames, ...MOCK_CONFIG.devTLNames, ...MOCK_CONFIG.qmNames];

function priorityVotesForPitch(pitchId: string, category: string): {
  teamVotes: Record<string, 0 | 1 | 2 | 3 | 4>;
  tlVotes: Record<string, 0 | 1 | 2 | 3 | 4>;
  teamPriorityScore: number;
  tlPriorityScore: number;
} {
  // AI Charting pitches skew toward higher priority (lower tier number)
  const boost = category === 'Support AI Charting' ? 0.28 : 0;
  const teamVotes: Record<string, 0 | 1 | 2 | 3 | 4> = {};

  for (const voter of ALL_VOTERS) {
    const r = hashScore(`${pitchId}-${voter}-priority`, 0, 1);
    const shifted = Math.max(0, r - boost);
    let tier: 1 | 2 | 3 | 4;
    if (shifted < 0.22) tier = 1;
    else if (shifted < 0.48) tier = 2;
    else if (shifted < 0.76) tier = 3;
    else tier = 4;
    teamVotes[voter] = tier;
  }

  const tlVotes = Object.fromEntries(
    MOCK_CONFIG.devTLNames.map(tl => [tl, teamVotes[tl]])
  ) as Record<string, 0 | 1 | 2 | 3 | 4>;

  const allTiers = Object.values(teamVotes);
  const teamPriorityScore = allTiers.reduce((s, t) => s + t, 0) / allTiers.length;
  const tlTiers = Object.values(tlVotes);
  const tlPriorityScore = tlTiers.length > 0
    ? tlTiers.reduce((s, t) => s + t, 0) / tlTiers.length
    : teamPriorityScore;

  return { teamVotes, tlVotes, teamPriorityScore, tlPriorityScore };
}

// ─── Pitches ──────────────────────────────────────────────────────────────────

export const MOCK_PITCHES: AllocationPitch[] = (pitchData as unknown as Pitch[])
  .map(p => {
    const { teamVotes, tlVotes, teamPriorityScore, tlPriorityScore } = priorityVotesForPitch(p.id, p.category);
    const base: AllocationPitch = {
      ...p,
      teamVotes,
      tlVotes,
      teamPriorityScore,
      tlPriorityScore,
      devInterest: devInterestForPitch(p.id, p.category),
    };
    if (p.continuation) {
      base.previousTL = MOCK_CONFIG.devTLNames[
        Math.floor(hashScore(p.id + '-ptl', 0, MOCK_CONFIG.devTLNames.length))
      ];
      base.previousQM = MOCK_CONFIG.qmNames[
        Math.floor(hashScore(p.id + '-pqm', 0, MOCK_CONFIG.qmNames.length))
      ];
    }
    return base;
  });

// ─── Plan generation ──────────────────────────────────────────────────────────

export const MOCK_PLAN: PlanAssignment[] = generateDefaultPlan(MOCK_PITCHES, MOCK_CONFIG);

// ─── Phase 2 interest ─────────────────────────────────────────────────────────

const TL_AFFINITY: Record<string, string[]> = {
  'Chase Grey': ['Support AI Charting'],
  'Derek Strehlow': ['Create and Improve Tools and Framework'],
  'Nicholas Rose': ['Create and Improve Tools and Framework', 'Address Technical Debt'],
  'Sheng Liu': ['Mobile Feature Parity', 'Support AI Charting'],
};

const QM_AFFINITY: Record<string, string[]> = {
  'Aiden Caes': ['Support AI Charting'],
  'Anne Field': ['Create and Improve Tools and Framework'],
  'Damon Drury': ['Support AI Charting'],
  'Derek Skwarczynski': ['Create and Improve Tools and Framework', 'Address Technical Debt'],
  'Julia Rowan': ['Mobile Feature Parity'],
  'Lauren Dyer': ['Support AI Charting'],
  'Mariel Zech': ['Create and Improve Tools and Framework'],
  'Parker Volkman': ['Address Technical Debt'],
};

/** People who submitted no Phase 2 interest data at all. */
const PHASE2_NO_DATA = new Set(['Mariel Zech', 'Sheng Liu']);
/** People who only filled out ~50% of Phase 2 pitches. */
const PHASE2_PARTIAL_DATA = new Set(['Parker Volkman', 'Derek Strehlow']);

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
const defaultSelectedIds = MOCK_PLAN
  .filter(a => a.status === 'selected')
  .map(a => a.pitchId);

export const MOCK_PHASE2_INTERESTS: Phase2Interest[] = [
  ...MOCK_CONFIG.devTLNames.map(name => phase2InterestForPerson(name, 'dev TL', defaultSelectedIds)),
  ...MOCK_CONFIG.qmNames.map(name => phase2InterestForPerson(name, 'QM', defaultSelectedIds)),
];
