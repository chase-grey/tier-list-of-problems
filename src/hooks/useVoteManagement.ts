import { useReducer } from 'react';
import type { AppState, AppAction, Pitch, Vote, Appetite, Tier, InterestLevel } from '../types/models';

/**
 * Custom hook for managing votes in the application
 * This centralizes the vote management logic that was previously scattered across components
 */
export const useVoteManagement = (initialState: AppState) => {
  // Reducer for state management
  const voteReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
      case 'SET_NAME':
        return { ...state, voterName: action.name, voterRole: action.role };
        
      case 'SET_AVAILABILITY':
        return { ...state, available: action.available };
        
      case 'SET_STAGE':
        return { ...state, stage: action.stage };
      
      case 'SET_APPETITE':
        return {
          ...state,
          votes: {
            ...state.votes,
            [action.id]: {
              ...state.votes[action.id] || { pitchId: action.id },
              appetite: action.appetite as Appetite,
            } as Vote,
          },
        };
      
      case 'SET_TIER':
        return {
          ...state,
          votes: {
            ...state.votes,
            [action.id]: {
              ...state.votes[action.id] || { pitchId: action.id },
              tier: action.tier,
              // Always use provided timestamp or current time to ensure consistent ordering
              timestamp: action.timestamp || new Date().getTime(),
            } as Vote,
          },
        };
        
      case 'UNSET_TIER':
        // Set tier to null explicitly (don't remove the property)
        {
          return {
            ...state,
            votes: {
              ...state.votes,
              [action.id]: {
                ...state.votes[action.id] || { pitchId: action.id },
                tier: null,  // Set the tier value
                timestamp: action.timestamp || new Date().getTime(),
              } as Vote,
            },
          };
        }
        
      case 'SET_INTEREST':
        return {
          ...state,
          votes: {
            ...state.votes,
            [action.id]: {
              ...state.votes[action.id] || { pitchId: action.id },
              interestLevel: action.interestLevel,
              // Always use provided timestamp or current time to ensure consistent ordering
              timestamp: action.timestamp || new Date().getTime(),
            } as Vote
          }
        };
        
      case 'UNSET_INTEREST':
        // Set interest level to null explicitly
        return {
          ...state,
          votes: {
            ...state.votes,
            [action.id]: {
              ...state.votes[action.id] || { pitchId: action.id },
              interestLevel: null,
              timestamp: action.timestamp || new Date().getTime(),
            } as Vote
          }
        };
      
      case 'RESET_FROM_PITCHES': {
        // Sync votes with current pitch IDs
        const syncedVotes = Object.fromEntries(
          action.pitchIds.map(id => [
            id, 
            state.votes[id] ?? { pitchId: id, appetite: undefined!, tier: undefined! }
          ])
        );
        
        return {
          ...state,
          votes: syncedVotes,
        };
      }
        
      case 'RESET_ALL_VOTES':
        // Reset all votes while keeping voter name
        return {
          ...state,
          votes: {}
        };
        
      case 'RESET_ALL':
        // Reset everything including voter name
        return {
          voterName: null,
          voterRole: null,
          available: null,
          stage: 'priority',
          votes: {}
        };
      
      default:
        return state;
    }
  };

  // Set up reducer with initial state
  const [state, dispatch] = useReducer(voteReducer, initialState);

  // Utility functions for vote operations
  const setTier = (id: string, tier: Tier | null) => {
    const timestamp = new Date().getTime();
    if (tier === null) {
      dispatch({ type: 'UNSET_TIER', id, timestamp });
    } else {
      dispatch({ type: 'SET_TIER', id, tier, timestamp });
    }
  };

  const setInterest = (id: string, interestLevel: InterestLevel | null) => {
    const timestamp = new Date().getTime();
    if (interestLevel === null) {
      dispatch({ type: 'UNSET_INTEREST', id, timestamp });
    } else {
      dispatch({ type: 'SET_INTEREST', id, interestLevel, timestamp });
    }
  };

  const setAppetite = (id: string, appetite: Appetite | null) => {
    dispatch({ type: 'SET_APPETITE', id, appetite });
  };

  const setStage = (stage: 'priority' | 'interest') => {
    dispatch({ type: 'SET_STAGE', stage });
  };

  const resetAllVotes = () => {
    dispatch({ type: 'RESET_ALL_VOTES' });
  };

  const resetAll = () => {
    dispatch({ type: 'RESET_ALL' });
  };

  const syncPitches = (pitchIds: string[]) => {
    dispatch({ type: 'RESET_FROM_PITCHES', pitchIds });
  };

  const setNameAndRole = (name: string, role: string) => {
    dispatch({ type: 'SET_NAME', name, role });
  };

  const setAvailability = (available: boolean) => {
    dispatch({ type: 'SET_AVAILABILITY', available });
  };

  // Helper function to map tiers to interest levels
  const mapTierToInterestLevel = (tier: Tier): InterestLevel => {
    if (tier === 1) return 4;      // Tier 1 → Very Interested
    else if (tier === 2) return 3; // Tier 2 → Interested
    else if (tier === 3) return 2; // Tier 3 → Somewhat Interested
    else return 1;                 // Tier 4 → Not Interested
  };

  // Helper function to set default interest levels based on tiers
  const setDefaultInterestLevels = (pitches: Pitch[]) => {
    pitches.forEach(pitch => {
      const vote = state.votes[pitch.id];
      const tier = vote?.tier;
      
      // Skip if no tier or already has interest level
      if (!tier || vote?.interestLevel) {
        return;
      }
      
      // Map tier to default interest level
      const defaultInterestLevel = mapTierToInterestLevel(tier);
      
      // Set the default interest level and use the same timestamp
      const timestamp = vote.timestamp || new Date().getTime();
      dispatch({ 
        type: 'SET_INTEREST', 
        id: pitch.id, 
        interestLevel: defaultInterestLevel,
        timestamp 
      });
    });
  };

  // Analytics functions
  const getCompletionStats = (pitches: Pitch[]) => {
    const totalCount = pitches.length;
    const appetiteCount = Object.values(state.votes).filter(v => v.appetite).length;
    const rankCount = Object.values(state.votes).filter(v => v.tier).length;
    const interestCount = Object.values(state.votes).filter(v => v.interestLevel !== undefined).length;
    
    return {
      total: totalCount,
      appetiteCount,
      rankCount,
      interestCount,
      minimumRequired: Math.ceil(totalCount / 2),
      isPriorityComplete: appetiteCount >= Math.ceil(totalCount / 2) && rankCount >= Math.ceil(totalCount / 2),
      isInterestComplete: interestCount >= Math.ceil(totalCount / 2)
    };
  };

  return {
    state,
    dispatch,
    setTier,
    setInterest,
    setAppetite,
    setStage,
    resetAllVotes,
    resetAll,
    syncPitches,
    setNameAndRole,
    setAvailability,
    setDefaultInterestLevels,
    getCompletionStats,
    mapTierToInterestLevel
  };
};
