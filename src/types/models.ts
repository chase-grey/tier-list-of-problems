/* ─────────────── STATIC ─────────────── */
export interface Pitch {
  id: string;              // UUID or slug
  title: string;           // terse name on card
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
export type Appetite = 'S' | 'M' | 'L';   // Small | Medium | Large
export type Tier     = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Interest levels for the second stage
export type InterestLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Roles that require interest ranking
export const INTEREST_RANKING_ROLES = [
  'developer',
  'QM',
  'dev TL',
  'QM TL'
];

// Roles that should NOT be asked about availability and can't do interest ranking
export const NON_CONTRIBUTOR_ROLES = [
  'UXD',
  'TLTL',
  'customer',
  'other'
];

// Helper function for case-insensitive role checking
export function isNonContributorRole(role: string): boolean {
  // Convert to lowercase for case-insensitive comparison
  const roleLower = role.toLowerCase();
  return NON_CONTRIBUTOR_ROLES.some(r => r.toLowerCase() === roleLower);
}

export interface Vote {
  pitchId: string;
  appetite?: Appetite;
  tier?: Tier;
  interestLevel?: InterestLevel;
  timestamp?: number; // Used for consistent ordering
}

/* ─────────── LOCAL PERSISTENCE ───────── */
export interface LocalSave {
  voterName: string;               // "Ada Lovelace"
  votes: Record<string, Vote>;     // keyed by pitchId
}

/* ─────────── STATE MANAGEMENT ───────── */
export interface AppState {
  voterName: string | null;
  voterRole: string | null;
  available: boolean | null; // Whether the user is available next quarter
  stage: 'priority' | 'interest'; // Current stage of voting
  votes: Record<string, Vote>;
}

export type AppAction =
  | { type: 'SET_NAME'; name: string; role: string }
  | { type: 'SET_APPETITE'; id: string; appetite: Appetite | null }
  | { type: 'SET_TIER'; id: string; tier: Tier; timestamp?: number }
  | { type: 'SET_INTEREST'; id: string; interestLevel: InterestLevel; timestamp?: number }
  | { type: 'SET_AVAILABILITY'; available: boolean }
  | { type: 'SET_STAGE'; stage: 'priority' | 'interest' }
  | { type: 'RESET_FROM_PITCHES'; pitchIds: string[] }  // sync when JSON changes
  | { type: 'RESET_ALL_VOTES' }  // reset all votes but keep voter name
  | { type: 'RESET_ALL' };  // reset everything including voter name
