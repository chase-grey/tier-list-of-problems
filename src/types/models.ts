/* ─────────────── STATIC ─────────────── */
export interface Pitch {
  id: string;              // UUID or slug
  title: string;           // terse name on card
  category: string;        // strategic category for voting
  continuation?: boolean;
  /**
   * Pre-allocated for next quarter — work is already committed (e.g. carryover
   * from a customer escalation, leadership directive). Skips priority + interest
   * voting and surfaces in TL allocation as a locked, read-only row.
   */
  committed?: boolean;
  /**
   * Locally-added project, not part of the static pitch process. Persisted on
   * the backend (PITCHES sheet, adhoc=true) so it survives reload + cross-machine,
   * and editable from the TL allocation UI via the pencil icon.
   */
  adhoc?: boolean;
  author?: string | null;  // Person who wrote the pitch (used as assignment tiebreaker)
  previousDev?: string;    // Lead dev from last quarter (continuation projects only)
  previousTL?: string;     // Dev TL from last quarter (continuation projects only)
  previousQM?: string;     // QM from last quarter (continuation projects only)
  previousPQA1?: string;   // PQA1 reviewer from last quarter (continuation projects only)
  stage2?: boolean;        // Whether this pitch advanced to Stage 2
  developer?: string;      // Developer assigned to this pitch (Stage 2)
  details: {
    problem: string;               // REQUIRED
    ideaForSolution?: string;
    characteristics?: string;
    whyNow?: string;
    smartToolsFit?: string;
    epicFit?: string;
    success?: string;
    maintenance?: string;
    internCandidate?: boolean;
  };
}

/* ─────────────–– RUNTIME ───────────── */
export type Tier     = 1 | 2 | 3 | 4 | null;

// Interest levels for the second stage
export type InterestLevel = 1 | 2 | 3 | 4 | null;

// Roles that can rank interest in Stage 1 (priority + interest on all pitches)
export const STAGE1_INTEREST_ROLES = [
  'dev',
];

// Roles that can rank interest in Stage 2 (interest only on subset of pitches)
export const STAGE2_INTEREST_ROLES = [
  'QM',
  'dev TL',
];

// Combined: all roles that can ever rank interest (used for availability prompts)
export const CONTRIBUTOR_ROLES = [
  ...STAGE1_INTEREST_ROLES,
  ...STAGE2_INTEREST_ROLES,
];

// Roles that should NOT be asked about availability and can't do interest ranking
export const NON_CONTRIBUTOR_ROLES = [
  'UXD',
  'TLTL',
  'TS',
  'TCap',
  'customer',
  'other'
];

// Helper function for case-insensitive role checking to identify contributor roles
export function isContributorRole(role: string): boolean {
  if (!role) return false;
  const roleLower = role.toLowerCase();
  return CONTRIBUTOR_ROLES.some(r => r.toLowerCase() === roleLower);
}

// Check if role can rank interest in Stage 1
export function canRankInterestStage1(role: string): boolean {
  if (!role) return false;
  const roleLower = role.toLowerCase();
  return STAGE1_INTEREST_ROLES.some(r => r.toLowerCase() === roleLower);
}

// Check if role can rank interest in Stage 2
export function canRankInterestStage2(role: string): boolean {
  if (!role) return false;
  const roleLower = role.toLowerCase();
  return STAGE2_INTEREST_ROLES.some(r => r.toLowerCase() === roleLower);
}

// Helper function for case-insensitive role checking to identify non-contributor roles
export function isNonContributorRole(role: string): boolean {
  if (!role) return false;
  // Convert to lowercase for case-insensitive comparison
  const roleLower = role.toLowerCase();
  
  // Check if it's in the non-contributor list OR if it's a custom role (not in contributor list)
  return NON_CONTRIBUTOR_ROLES.some(r => r.toLowerCase() === roleLower) ||
    (roleLower === 'other') ||
    (!isContributorRole(role) && role !== '');
}

export interface Vote {
  pitchId: string;
  tier?: Tier;
  interestLevel?: InterestLevel;
  timestamp?: number; // Used for consistent ordering
}

/* ─────────── LOCAL PERSISTENCE ───────── */
export interface LocalSave {
  voterName: string;               // "Ada Lovelace"
  votes: Record<string, Vote>;     // keyed by pitchId
}

/**
 * Per-role capacity tier for next quarter. "Standard" in the dialog is sugar
 * for setting every applicable field to `'avg'`. `'none'` excludes the person
 * from that pool entirely; `'above-avg'`/`'fewer'` shift their per-person cap
 * by ±1 from the role baseline.
 */
export type Capacity = 'above-avg' | 'avg' | 'fewer' | 'none';

/* ─────────── STATE MANAGEMENT ───────── */
export interface AppState {
  voterName: string | null;
  voterRole: string | null;
  /**
   * Derived back-compat boolean: `true` when the role-appropriate capacity
   * tier is not `'none'`. Devs: derived from `devCapacity`. QM / dev TL:
   * derived from `capacity`. Old code paths still read this field; new code
   * should read the capacity tiers directly.
   */
  available: boolean | null;
  /**
   * Devs only, derived back-compat boolean: `true` when `pqa1Capacity` is not
   * `'none'`. New code should read `pqa1Capacity` directly.
   */
  availableForPQA1: boolean | null;
  /** Devs only — capacity for Stage 2 dev assignment. Null for non-devs / pre-answer. */
  devCapacity: Capacity | null;
  /** Devs only — capacity for Stage 4 PQA1 assignment. */
  pqa1Capacity: Capacity | null;
  /** QM / dev TL only — single capacity tier for project assignment. */
  capacity: Capacity | null;
  /**
   * Required free-text comment when any capacity tier is non-`'avg'` —
   * surfaced to TLs in Stage 2/4 so they understand the context (e.g.
   * "out the second half of the quarter for paternity leave").
   */
  availabilityComment: string;
  stage: 'priority' | 'interest';
  votes: Record<string, Vote>;
}

export type AppAction =
  | { type: 'SET_NAME'; name: string; role: string }
  | { type: 'UPDATE_NAME'; name: string }  // Update name only
  | { type: 'UPDATE_ROLE'; role: string }  // Update role only
  | { type: 'SET_TIER'; id: string; tier: Tier; timestamp?: number }
  | { type: 'UNSET_TIER'; id: string; timestamp?: number }  // Remove tier assignment
  | { type: 'SET_INTEREST'; id: string; interestLevel: InterestLevel; timestamp?: number }
  | { type: 'UNSET_INTEREST'; id: string; timestamp?: number }  // Remove interest level
  | {
      type: 'SET_AVAILABILITY';
      // Back-compat boolean fields — still accepted from old call sites.
      available: boolean;
      availableForPQA1?: boolean | null;
      // Capacity tiers — preferred path. When provided, reducer should also
      // update the matching boolean (`available = devCapacity !== 'none'`, etc.).
      devCapacity?: Capacity | null;
      pqa1Capacity?: Capacity | null;
      capacity?: Capacity | null;
      availabilityComment?: string;
    }
  | { type: 'SET_STAGE'; stage: 'priority' | 'interest' }
  | { type: 'RESET_FROM_PITCHES'; pitchIds: string[] }  // sync when JSON changes
  | { type: 'RESET_ALL_VOTES' }  // reset all votes but keep voter name
  | { type: 'RESET_ALL' };  // reset everything including voter name

/** True when the role is a dev (single role; not 'dev TL', etc.). */
export function isDevRole(role: string | null | undefined): boolean {
  return !!role && role.toLowerCase() === 'dev';
}
