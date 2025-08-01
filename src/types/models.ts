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
export type Tier     = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;

// Interest levels for the second stage
export type InterestLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;

// Roles that can participate in interest ranking if available
export const CONTRIBUTOR_ROLES = [
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

// Helper function for case-insensitive role checking to identify contributor roles
export function isContributorRole(role: string): boolean {
  if (!role) return false;
  // Convert to lowercase for case-insensitive comparison
  const roleLower = role.toLowerCase();
  return CONTRIBUTOR_ROLES.some(r => r.toLowerCase() === roleLower);
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
  stage: 'priority' | 'interest' | 'project-interest' | 'projects'; // Current stage of voting
  votes: Record<string, Vote>;
  projectVotes: Record<string, any>; // For project voting data
  projectInterestVotes: Record<string, ProjectInterestVote>; // For project interest voting data
}

export interface ProjectInterestVote {
  projectId: string;
  interestLevel?: ProjectInterestLevel;
  timestamp?: number;
}

export type ProjectInterestLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;

export type AppAction =
  | { type: 'SET_NAME'; name: string; role: string }
  | { type: 'SET_APPETITE'; id: string; appetite: Appetite | null }
  | { type: 'SET_TIER'; id: string; tier: Tier; timestamp?: number }
  | { type: 'UNSET_TIER'; id: string; timestamp?: number }  // Remove tier assignment
  | { type: 'SET_INTEREST'; id: string; interestLevel: InterestLevel; timestamp?: number }
  | { type: 'UNSET_INTEREST'; id: string; timestamp?: number }  // Remove interest level
  | { type: 'SET_PROJECT_INTEREST'; id: string; interestLevel: ProjectInterestLevel; timestamp?: number }
  | { type: 'UNSET_PROJECT_INTEREST'; id: string; timestamp?: number }  // Remove project interest level
  | { type: 'SET_AVAILABILITY'; available: boolean }
  | { type: 'SET_STAGE'; stage: 'priority' | 'interest' | 'project-interest' | 'projects' }
  | { type: 'RESET_FROM_PITCHES'; pitchIds: string[] }  // sync when JSON changes
  | { type: 'SET_PROJECT_VOTES'; projectVotes: Record<string, any> }  // set project votes from ProjectPriorityApp
  | { type: 'RESET_ALL_VOTES' }  // reset all votes but keep voter name
  | { type: 'RESET_ALL_PROJECT_VOTES' }  // reset project votes but keep problem votes
  | { type: 'RESET_ALL_PROJECT_INTEREST_VOTES' }  // reset project interest votes but keep other votes
  | { type: 'RESET_ALL' };  // reset everything including voter name
