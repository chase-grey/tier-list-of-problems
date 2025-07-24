import React, { useEffect, useReducer, memo, useState } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { darkTheme } from '../theme';
import { NameGate } from './NameGate/NameGate';
import { TopBar } from './TopBar/TopBar';
import type { AppStage } from './Timeline/Timeline';
import KanbanContainer from './VotingBoard/KanbanContainer';
import AvailabilityDialog from './AvailabilityDialog/AvailabilityDialog';
import InterestRanking from './InterestRanking/InterestRanking';
import ProjectPriorityApp from './ProjectBoard/ProjectPriorityApp';
import SnackbarProvider from './SnackbarProvider';
import { useSnackbar } from '../hooks/useSnackbar';
import HelpDialog from './HelpDialog/HelpDialog';
import ConfirmationDialog from './ConfirmationDialog/ConfirmationDialog';
import FeedbackDialog from './FeedbackDialog/FeedbackDialog';
import type { FeedbackData } from './FeedbackDialog/FeedbackDialog';
import DevAutoPopulate from './DevAutoPopulate';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { exportVotes } from '../utils/csv';
import { isDevelopmentMode } from '../utils/testUtils';
import type { DropResult } from '@hello-pangea/dnd';
import type { AppState, AppAction, Pitch, Vote, Appetite, Tier, InterestLevel } from '../types/models';
import { isContributorRole } from '../types/models';

// Import pitch data
import pitchesData from '../assets/pitches.json';
// Import project data
import { mockProjects } from './ProjectBoard/mockData';

// Initial state
const initialState: AppState = {
  voterName: null,
  voterRole: null,
  available: null,
  stage: 'priority',
  votes: {},
  projectVotes: {},
};

// Reducer for state management
const appReducer = (state: AppState, action: AppAction): AppState => {
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
    
    case 'SET_PROJECT_VOTES':
      // Set project votes from the ProjectPriorityApp
      return {
        ...state,
        projectVotes: action.projectVotes
      };
      
    case 'RESET_ALL_PROJECT_VOTES':
      // Reset just project votes while keeping problem votes
      return {
        ...state,
        projectVotes: {}
      };
      
    case 'RESET_ALL':
      // Reset everything including voter name
      return {
        voterName: null,
        voterRole: null,
        available: null,
        stage: 'priority',
        votes: {},
        projectVotes: {}
      };
    
    default:
      return state;
  }
};

/**
 * Main App component
 */
const AppContent: React.FC = () => {
  // State to control help dialog
  const [showHelp, setShowHelp] = useState(true); // Show help dialog by default
  // State to track if initial help dialog was shown
  const [initialHelpShown, setInitialHelpShown] = useState(false);
  // State to control reset confirmation dialog
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  // State to control feedback dialog
  const [showFeedback, setShowFeedback] = useState(false);
  // Get pitches from JSON
  const pitches = pitchesData as Pitch[];
  const TOTAL = pitches.length;
  
  // Force clear localStorage if you're getting a black screen
  // Uncomment this line if you see a black screen after updates
  // window.localStorage.clear();
  
  // Use localStorage for persistence with a safety wrapper
  const [savedState, setSavedState] = (() => {
    try {
      // Try to use the normal localStorage hook
      return useLocalStorage<AppState>('polling.appState', initialState);
    } catch (error) {
      // If localStorage fails completely, use a fallback implementation
      console.error('LocalStorage error, using initial state:', error);
      // Return a dummy state management function that doesn't persist
      const dummySetState = (_value: AppState | ((val: AppState) => AppState)): void => {
        console.log('LocalStorage disabled, state changes will not persist');
      };
      return [initialState, dummySetState] as [AppState, typeof dummySetState];
    }
  })();
  
  // Always ensure we have a properly formed state object
  const completeState = {
    ...initialState,
    ...savedState,
    // Always set initial state to priority stage when loading
    stage: 'priority' as 'priority',
    // Ensure voterRole exists if voterName exists
    voterRole: savedState.voterRole || (savedState.voterName ? null : initialState.voterRole)
  };
  
  // Set up reducer with saved state
  const [state, dispatch] = useReducer(appReducer, completeState);

  // Additionally store the voter name in a separate key as per spec ('polling.voterName')
  useEffect(() => {
    if (state.voterName) {
      localStorage.setItem('polling.voterName', state.voterName);
      if (state.voterRole) {
        localStorage.setItem('polling.voterRole', state.voterRole);
      }
    }
  }, [state.voterName, state.voterRole]);
  
  // Access snackbar
  const { showSnackbar } = useSnackbar();
  
  // Sync reducer state with localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSavedState(state);
    }, 250);
    
    return () => clearTimeout(timer);
  }, [state, setSavedState]);
  
  // Sync pitches with votes on initial load or when pitches change
  useEffect(() => {
    const pitchIds = pitches.map(pitch => pitch.id);
    dispatch({ type: 'RESET_FROM_PITCHES', pitchIds });
  }, [pitches]);
  
  // Calculate completion counters
  const appetiteCount = Object.values(state.votes).filter(v => v.appetite !== undefined).length;
  const rankCount = Object.values(state.votes).filter(v => v.tier !== null).length;
  
  // Check if the user has a role that can access interest ranking
  // Only QMs, devs, QM TLs, and dev TLs who are available for next quarter can see interest section
  const canAccessInterestStage = state.voterRole !== null && 
    isContributorRole(state.voterRole) && 
    state.available === true;
  
  // Check if the user needs to rank interest (same logic as canAccessInterestStage, kept for backward compatibility)
  const needsInterestRanking = canAccessInterestStage;
    
  // Calculate required minimums (50% of total)
  const minimumRequired = Math.ceil(TOTAL / 2);
  
  // Calculate completion status based on role and availability (now only requires 50%)
  const priorityStageComplete = appetiteCount >= minimumRequired && rankCount >= minimumRequired;
  
  // Calculate interest completion for users who need it
  const interestCount = needsInterestRanking ? 
    Object.values(state.votes).filter(v => v.interestLevel !== undefined).length : 0;
  const interestStageComplete = !needsInterestRanking || interestCount >= minimumRequired;
  
  // Check if export is enabled based on role and stage
  const isExportEnabled = priorityStageComplete && 
    // For users who don't need to rank interest, enable export immediately
    // For users who need to rank interest, they need 50% completion and must visit the interest page
    (!needsInterestRanking || (needsInterestRanking && state.stage === 'interest' && interestStageComplete));
  
  // Handle name and role submission
  const handleNameSubmit = (name: string, role: string) => {
    dispatch({ type: 'SET_NAME', name, role });
    showSnackbar(`Welcome, ${name}!`, 'success');
    
    // If this is a non-contributor role, automatically set available to false
    // This ensures they skip the availability dialog and can't access interest section
    if (!isContributorRole(role)) {
      // Set availability to false for non-contributors
      dispatch({ type: 'SET_AVAILABILITY', available: false });
    }
    
    // No need to show help dialog after name is submitted since we show it first
  };
  
  // Handle drag end for priority stage
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    
    // Drop outside valid area
    if (!destination) return;
    
    const destId = destination.droppableId;
    
    // If dropped in the unsorted column
    if (destId === 'unsorted') {
      // Remove tier assignment but keep any other data (like appetite)
      const timestamp = new Date().getTime();
      dispatch({ 
        type: 'UNSET_TIER', 
        id: draggableId,
        timestamp
      });
      
      showSnackbar('Pitch moved to unsorted', 'info');
    }
    // If dropped in a tier column
    else {
      const tier = parseInt(destId.replace('tier-', '')) as Tier;
      
      // Get the current timestamp for consistent ordering (newer items will have higher values)
      const timestamp = new Date().getTime();
      
      // Add timestamp to ensure consistent ordering - later added items always go to the bottom
      dispatch({ 
        type: 'SET_TIER', 
        id: draggableId, 
        tier,
        timestamp // Pass timestamp to reducer
      });
      
      showSnackbar(`Pitch moved to Tier ${tier}`, 'info');
    }
  };

  // Handle interest level change
  const handleInterestChange = (pitchId: string, interestLevel: InterestLevel) => {
    const timestamp = new Date().getTime();
    
    if (interestLevel === null) {
      // Use UNSET_INTEREST action to remove the interest level assignment
      dispatch({
        type: 'UNSET_INTEREST',
        id: pitchId,
        timestamp
      });
      showSnackbar('Pitch moved to unsorted', 'info');
    } else {
      // Set the interest level
      dispatch({ 
        type: 'SET_INTEREST', 
        id: pitchId, 
        interestLevel,
        timestamp 
      });
    
      
      // Convert numeric interest level to descriptive label
      const interestLabels = [
        'Extremely Interested',  // Level 8
        'Very Interested',      // Level 7
        'Fairly Interested',    // Level 6
        'Interested',           // Level 5
        'Moderately Interested', // Level 4
        'Somewhat Interested',  // Level 3
        'Slightly Interested',  // Level 2
        'Not Interested'        // Level 1
      ];
      
      const levelIndex = 8 - interestLevel; // Convert from level (8-1) to index (0-7)
      showSnackbar(`Interest level set to ${interestLabels[levelIndex]}`, 'info');
    }
  };
  
  // Handle appetite change
  const handleAppetiteChange = (pitchId: string, appetite: Appetite | null) => {
    dispatch({ type: 'SET_APPETITE', id: pitchId, appetite });
    if (appetite) {
      showSnackbar(`Appetite set to ${appetite === 'S' ? 'Small' : appetite === 'M' ? 'Medium' : 'Large'}`, 'info');
    }
  };

  // Handle availability setting
  const handleAvailabilitySet = (available: boolean) => {
    dispatch({ type: 'SET_AVAILABILITY', available });
    showSnackbar(`Availability ${available ? 'confirmed' : 'noted - thanks for letting us know'}`, 'success');
  };

  // Toggle between priority and interest stages
  const handleStageChange = (targetStage?: AppStage) => {
    // If specified stage is provided, use it directly
    if (targetStage) {
      dispatch({
        type: 'SET_STAGE',
        stage: targetStage
      });
      return;
    }
    
    // Otherwise toggle between stages as before
    // Toggle between stages
    const nextStage = state.stage === 'priority' ? 'interest' : 'priority';
    
    // Only allow switching to interest stage if conditions are met
    if (nextStage === 'interest' && (!canAccessInterestStage || !priorityStageComplete)) {
      console.log('Cannot access interest stage yet');
      return;
    }

    // All good, switch stages
    dispatch({
      type: 'SET_STAGE',
      stage: nextStage
    });

    // Scroll to the top when stage changes
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

    // Show completion message if moving to interest stage
    if (nextStage === 'interest') {
      // Process each pitch that has a tier but no interest level
      pitches.forEach(pitch => {
        const vote = state.votes[pitch.id];
        const tier = vote?.tier;
        
        // Skip if no tier or already has interest level
        if (!tier || vote?.interestLevel) {
          return;
        }
        
        // Map tier to default interest level (same mapping logic as in InterestRanking component)
        let defaultInterestLevel: InterestLevel;
        if (tier === 1) defaultInterestLevel = 8;        // Tier 1 → Extremely Interested
        else if (tier === 2) defaultInterestLevel = 7;   // Tier 2 → Very Interested
        else if (tier === 3) defaultInterestLevel = 6;   // Tier 3 → Fairly Interested
        else if (tier === 4) defaultInterestLevel = 5;   // Tier 4 → Interested
        else if (tier === 5) defaultInterestLevel = 4;   // Tier 5 → Moderately Interested
        else if (tier === 6) defaultInterestLevel = 3;   // Tier 6 → Somewhat Interested
        else if (tier === 7) defaultInterestLevel = 2;   // Tier 7 → Slightly Interested
        else defaultInterestLevel = 1;                   // Tier 8 → Not Interested
        
        // Set the default interest level and use the same timestamp
        const timestamp = vote.timestamp || new Date().getTime();
        dispatch({ 
          type: 'SET_INTEREST', 
          id: pitch.id, 
          interestLevel: defaultInterestLevel,
          timestamp 
        });
      });
    }
    
    // Set the new stage
    dispatch({ type: 'SET_STAGE', stage: nextStage });
  };

  // Handle showing help dialog
  const handleHelpClick = () => {
    setShowHelp(true);
  };
  
  // Handle closing the initial help dialog
  const handleInitialHelpClose = () => {
    setShowHelp(false);
    setInitialHelpShown(true);
  };
  
  // Handle reset button click
  const handleResetClick = () => {
    setShowResetConfirmation(true);
  };
  
  // Handle reset confirmation
  const handleResetConfirm = () => {
    // Reset all votes and clear voter name
    dispatch({ type: 'RESET_ALL' });
    // Close confirmation dialog
    setShowResetConfirmation(false);
    // Reset help dialog tracking to show instructions again
    setInitialHelpShown(false);
    setShowHelp(true);
    // Show success message
    showSnackbar('All data has been reset. Please enter your name to continue.', 'success');
  };

  // Handle finish/export process
  const handleFinish = () => {
    if (state.voterName && isExportEnabled) {
      // Show feedback dialog before exporting
      setShowFeedback(true);
    } else {
      showSnackbar('Complete at least 50% of appetites and rankings first', 'error');
    }
  };
  
  // Handle feedback submission and export
  const handleFeedbackSubmit = (feedbackData: FeedbackData) => {
    // Close the feedback dialog
    setShowFeedback(false);
    
    if (state.voterName && state.voterRole) { // Add null checks for both name and role
      // Export votes with feedback data
      exportVotes(state.voterName, state.voterRole, state.votes, feedbackData);
      showSnackbar('Thank you for your feedback! Your data has been exported.', 'success');
    }
  };
  
  // Handle feedback dialog close (skip)
  const handleFeedbackClose = () => {
    setShowFeedback(false);
    
    if (state.voterName && state.voterRole) { // Add null checks for both name and role
      // Export votes without feedback
      exportVotes(state.voterName, state.voterRole, state.votes);
      showSnackbar('Your data has been exported successfully!', 'success');
    }
  };
  
  // Dev only: Handle auto-populate
  const handleAutoPopulate = (name: string, votes: Record<string, any>, complete?: boolean) => {
    // Set the name if not already set
    if (!state.voterName) {
      // Default to 'developer' role for auto-populate
      dispatch({ type: 'SET_NAME', name, role: 'developer' });
    }
    
    // Apply each vote
    Object.entries(votes).forEach(([pitchId, vote]) => {
      // Set appetite if present
      if (vote.appetite) {
        dispatch({ 
          type: 'SET_APPETITE', 
          id: pitchId, 
          appetite: vote.appetite 
        });
      }
      
      // Set tier if present
      if (vote.tier) {
        dispatch({ 
          type: 'SET_TIER', 
          id: pitchId, 
          tier: vote.tier,
          timestamp: vote.timestamp || new Date().getTime()
        });
      }
    });
    
    // Show success message
    showSnackbar(`Auto-populated with ${name} and ${complete ? 'complete' : 'partial'} votes!`, 'success');
  };
  
  // Show availability dialog for specific roles after name is set
  // Only ask QMs, devs, QM TLs, and dev TLs
  const showAvailabilityDialog = state.voterName !== null && 
    state.voterRole !== null &&
    isContributorRole(state.voterRole) && 
    state.available === null;

  // Determine which stages are completed and which can be accessed
  const completedStages: AppStage[] = [];
  
  // Priority stage is completed if enough projects are ranked
  if (priorityStageComplete) {
    completedStages.push('priority');
  }
  
  // Interest stage is completed if enough interests are set
  if (interestCount >= Math.ceil(TOTAL / 2)) {
    completedStages.push('interest');
  }
  
  // Determine if a user can access a particular stage
  const canAccessStage = (stage: AppStage): boolean => {
    // Always can access priority stage
    if (stage === 'priority') return true;
    
    // For interest stage, must be a contributor with availability and have completed priority stage
    if (stage === 'interest') {
      return canAccessInterestStage && priorityStageComplete;
    }
    
    // For projects stage, user must have completed priority stage
    if (stage === 'projects') {
      return priorityStageComplete;
    }
    
    return false;
  };

  return (
    <>
      <NameGate 
        onNameSubmit={handleNameSubmit}
        open={!state.voterName && initialHelpShown}
      />
      
      <AvailabilityDialog 
        open={showAvailabilityDialog}
        onAvailabilitySet={handleAvailabilitySet}
      />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TopBar 
          voterName={state.voterName}
          totalPitchCount={TOTAL}
          appetiteCount={appetiteCount}
          rankCount={rankCount}
          interestCount={interestCount}
          onFinish={handleFinish}
          isExportEnabled={isExportEnabled}
          onHelpClick={handleHelpClick}
          onResetClick={handleResetClick}
          stage={state.stage}
          onStageChange={handleStageChange}
          canAccessStage={canAccessStage}
          completedStages={completedStages}
        />
        
        <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden', p: 1 }}>
          {state.stage === 'priority' ? (
            <KanbanContainer
              pitches={pitches}
              votes={state.votes}
              onDragEnd={handleDragEnd}
              onAppetiteChange={handleAppetiteChange}
              userRole={state.voterRole}
              readOnly={state.stage === 'priority' && completedStages.includes('priority')}
            />
          ) : state.stage === 'interest' ? (
            <InterestRanking
              pitches={pitches}
              votes={state.votes}
              onSetInterest={handleInterestChange}
              userRole={state.voterRole}
            />
          ) : (
            // Project priority stage with integrated ProjectPriorityApp
            <ProjectPriorityApp
              projects={mockProjects}
              initialVotes={state.projectVotes}
              userName={state.voterName || ''}
              userRole={state.voterRole || ''}
              onSaveVotes={(projectVotes) => {
                dispatch({ type: 'SET_PROJECT_VOTES', projectVotes });
              }}
            />
          )}
                  
                  {/* Help dialog */}
          <HelpDialog 
            open={showHelp} 
            onClose={handleInitialHelpClose}
            userRole={state.voterRole} 
          />
          
          {/* Reset confirmation dialog */}
          <ConfirmationDialog
            open={showResetConfirmation}
            title="Reset Everything"
            message="Are you sure you want to reset everything? This will clear all your votes and allow you to change your name. You'll also see the instructions page again. This action cannot be undone."
            onConfirm={handleResetConfirm}
            onCancel={() => setShowResetConfirmation(false)}
            confirmText="Yes, Reset Everything"
            severity="warning"
          />
          
          {/* Feedback dialog */}
          <FeedbackDialog
            open={showFeedback}
            onClose={handleFeedbackClose}
            onSubmit={handleFeedbackSubmit}
            userRole={state.voterRole}
          />

          {/* Show availability dialog on first name entry if not set */}
          {state.voterName && state.available === null && (
            <AvailabilityDialog 
              open={true}
              onAvailabilitySet={handleAvailabilitySet}
            />
          )}
          
          {/* Development-only Auto-Populate Tool */}
          {isDevelopmentMode() && (
            <DevAutoPopulate 
              onPopulate={handleAutoPopulate}
              pitchIds={pitches.map(pitch => pitch.id)}
            />
          )}
        </Box>
      </Box>
    </>
  );
};

/**
 * Wrapped app with providers
 */
const App: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SnackbarProvider>
        <AppContent />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default memo(App);
