import { AppState, Appetite, InterestLevel, Tier } from './models';

// Define action types in a more structured way
export type VoteAction = 
  | { type: 'SET_NAME'; name: string; role: string }
  | { type: 'SET_AVAILABILITY'; available: boolean }
  | { type: 'SET_STAGE'; stage: 'priority' | 'interest' }
  | { type: 'SET_APPETITE'; id: string; appetite: Appetite | null }
  | { type: 'SET_TIER'; id: string; tier: Tier; timestamp?: number }
  | { type: 'UNSET_TIER'; id: string; timestamp?: number }
  | { type: 'SET_INTEREST'; id: string; interestLevel: InterestLevel; timestamp?: number }
  | { type: 'UNSET_INTEREST'; id: string; timestamp?: number }
  | { type: 'RESET_FROM_PITCHES'; pitchIds: string[] }
  | { type: 'RESET_ALL_VOTES' }
  | { type: 'RESET_ALL' };

// Helper types for the vote management hook
export interface VoteManagementActions {
  setTier: (id: string, tier: Tier | null) => void;
  setInterest: (id: string, interestLevel: InterestLevel | null) => void;
  setAppetite: (id: string, appetite: Appetite | null) => void;
  setStage: (stage: 'priority' | 'interest') => void;
  resetAllVotes: () => void;
  resetAll: () => void;
  syncPitches: (pitchIds: string[]) => void;
  setNameAndRole: (name: string, role: string) => void;
  setAvailability: (available: boolean) => void;
  setDefaultInterestLevels: (pitches: any[]) => void;
}

export interface CompletionStats {
  total: number;
  appetiteCount: number;
  rankCount: number;
  interestCount: number;
  minimumRequired: number;
  isPriorityComplete: boolean;
  isInterestComplete: boolean;
}

export interface VoteManagementState extends AppState {
  // Add any extended state properties here
}

export interface VoteManagementResult {
  state: VoteManagementState;
  dispatch: React.Dispatch<VoteAction>;
  getCompletionStats: (pitches: any[]) => CompletionStats;
  mapTierToInterestLevel: (tier: Tier) => InterestLevel;
}
