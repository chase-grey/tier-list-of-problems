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

export interface Vote {
  pitchId: string;
  appetite: Appetite;      // required
  tier: Tier;              // required
  timestamp?: number;      // used for ordering pitches within a tier
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
  votes: Record<string, Vote>;   // partial; missing entries treated as unset
}

export type AppAction =
  | { type: 'SET_NAME'; name: string; role: string }
  | { type: 'SET_APPETITE'; id: string; appetite: Appetite | null }
  | { type: 'SET_TIER'; id: string; tier: Tier; timestamp?: number }
  | { type: 'RESET_FROM_PITCHES'; pitchIds: string[] }  // sync when JSON changes
  | { type: 'RESET_ALL_VOTES' }  // reset all votes but keep voter name
  | { type: 'RESET_ALL' };  // reset everything including voter name
