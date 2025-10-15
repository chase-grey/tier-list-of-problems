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
    if (tier === null) return null;  // Null tier → Null interest (unsorted)
    else if (tier === 1) return 4;   // Tier 1 → Very Interested
    else if (tier === 2) return 3;   // Tier 2 → Interested
    else if (tier === 3) return 2;   // Tier 3 → Somewhat Interested
    else return 1;                  // Tier 4 → Not Interested
  };

  // Helper function to set default interest levels based on tiers
  const setDefaultInterestLevels = (pitches: Pitch[]) => {
    console.log('[DEBUG] setDefaultInterestLevels called', {
      pitchesProvided: pitches ? (Array.isArray(pitches) ? pitches.length : 'not an array') : 'undefined',
      votesCount: state.votes ? Object.keys(state.votes).length : 0
    });
    
    if (!Array.isArray(pitches)) {
      console.error('[DEBUG] setDefaultInterestLevels: pitches is not an array');
      return;
    }
    
    try {
      let processedCount = 0;
      let skippedCount = 0;
      let mappedCount = 0;
      let errorCount = 0;
      
      // Process all pitches
      pitches.forEach((pitch, index) => {
        try {
          // Skip if pitch doesn't exist or has no ID
          if (!pitch || !pitch.id) {
            console.warn(`[DEBUG] setDefaultInterestLevels: invalid pitch object at index ${index}`);
            skippedCount++;
            return;
          }
          
          console.log(`[DEBUG] Processing pitch ${index}: ${pitch.title?.substring(0, 20)}...`, {
            id: pitch.id
          });
          
          const vote = state.votes ? state.votes[pitch.id] : undefined;
          const tier = vote?.tier;
          
          // Skip if no tier or already has interest level
          if (tier === undefined || tier === null) {
            console.log(`[DEBUG] Skipping pitch ${pitch.id}: no tier assigned`);
            skippedCount++;
            return;
          }
          
          if (vote?.interestLevel !== undefined) {
            console.log(`[DEBUG] Skipping pitch ${pitch.id}: interest level already set to ${vote.interestLevel}`);
            skippedCount++;
            return;
          }
          
          // Map tier to default interest level
          const defaultInterestLevel = mapTierToInterestLevel(tier);
          console.log(`[DEBUG] Mapped tier ${tier} to interest level ${defaultInterestLevel} for pitch ${pitch.id}`);
          
          // Only set an interest level if the mapping produced a valid result
          if (defaultInterestLevel !== null) {
            // Set the default interest level and use the same timestamp
            const timestamp = vote && vote.timestamp ? vote.timestamp : new Date().getTime();
            console.log(`[DEBUG] Setting interest level ${defaultInterestLevel} for pitch ${pitch.id} with timestamp ${timestamp}`);
            
            dispatch({ 
              type: 'SET_INTEREST', 
              id: pitch.id, 
              interestLevel: defaultInterestLevel,
              timestamp 
            });
            
            mappedCount++;
          } else {
            console.warn(`[DEBUG] Mapping returned null for pitch ${pitch.id} with tier ${tier}`);
            skippedCount++;
          }
          
          processedCount++;
        } catch (error) {
          console.error(`[DEBUG] Error processing pitch at index ${index}:`, error);
          errorCount++;
        }
      });
      
      console.log('[DEBUG] setDefaultInterestLevels completed', {
        totalPitches: pitches.length,
        processedCount,
        mappedCount,
        skippedCount,
        errorCount
      });
      
    } catch (error) {
      console.error('[DEBUG] Error setting default interest levels:', error);
    }
  };

  // Analytics functions
  const getCompletionStats = (pitches: Pitch[]) => {
    // Ensure pitches is an array
    if (!Array.isArray(pitches)) {
      console.error('getCompletionStats: pitches is not an array');
      return {
        total: 0,
        appetiteCount: 0,
        rankCount: 0,
        interestCount: 0,
        minimumRequired: 0,
        isPriorityComplete: false,
        isInterestComplete: false
      };
    }

    const totalCount = pitches.length;
    const votes = state.votes || {};
    const appetiteCount = Object.values(votes).filter(v => v && v.appetite).length;
    const rankCount = Object.values(votes).filter(v => v && v.tier).length;
    const interestCount = Object.values(votes).filter(v => v && v.interestLevel !== undefined).length;
    
    const minimumRequired = Math.ceil(totalCount / 2);
    
    return {
      total: totalCount,
      appetiteCount,
      rankCount,
      interestCount,
      minimumRequired,
      isPriorityComplete: appetiteCount >= minimumRequired && rankCount >= minimumRequired,
      isInterestComplete: interestCount >= minimumRequired
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
