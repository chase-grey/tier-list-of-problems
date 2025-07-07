import React, { useEffect, useReducer, memo, useState } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { darkTheme } from '../theme';
import { NameGate } from './NameGate/NameGate';
import { TopBar } from './TopBar/TopBar';
import KanbanContainer from './VotingBoard/KanbanContainer';
import AvailabilityDialog from './AvailabilityDialog/AvailabilityDialog';
import InterestRanking from './InterestRanking/InterestRanking';
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

// Initial state
const initialState: AppState = {
  voterName: null,
  voterRole: null,
  available: null,
  stage: 'priority',
  votes: {},
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
          } as Vote,
        },
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
  const appetiteCount = Object.values(state.votes).filter(v => v.appetite).length;
  const rankCount = Object.values(state.votes).filter(v => v.tier).length;
  
  // Check if the user has a role that can access interest ranking
  // Only QMs, devs, QM TLs, and dev TLs who are available for next quarter can see interest section
  const canAccessInterestStage = state.voterRole !== null && 
    isContributorRole(state.voterRole) && 
    state.available === true;
  
  // Check if the user needs to rank interest (same logic as canAccessInterestStage, kept for backward compatibility)
  const needsInterestRanking = canAccessInterestStage;
    
  // Calculate completion status based on role and availability
  const priorityStageComplete = appetiteCount === TOTAL && rankCount === TOTAL;
  
  // Check if export is enabled based on role and stage
  const isExportEnabled = priorityStageComplete && 
    // For users who don't need to rank interest, enable export immediately
    // For users who need to rank interest, they must visit the interest page first
    (!needsInterestRanking || (needsInterestRanking && state.stage === 'interest'));
  
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
    
    // If dropped in a tier column
    if (destId !== 'unsorted') {
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
    dispatch({ 
      type: 'SET_INTEREST', 
      id: pitchId, 
      interestLevel,
      timestamp 
    });
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
  const handleStageChange = () => {
    // Toggle between stages
    const newStage = state.stage === 'priority' ? 'interest' : 'priority';
    
    // Only allow switching to interest stage if conditions are met
    if (newStage === 'interest' && (!canAccessInterestStage || !priorityStageComplete)) {
      // Show appropriate error message
      if (!canAccessInterestStage) {
        showSnackbar('Only QM, developers, QM TLs, and dev TLs who have indicated availability can rank interest', 'error');
      } else {
        showSnackbar('You must complete all appetites and priority rankings first', 'error');
      }
      return;
    }
    
    // If switching to interest stage, set default interest levels for all cards
    // that don't already have an interest level set
    if (newStage === 'interest') {
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
    dispatch({ type: 'SET_STAGE', stage: newStage });
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
      showSnackbar('Complete all appetites and rankings first', 'error');
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

  // We've removed the showNextStageButton variable since we're now always showing the button but conditionally enabling it

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
          onFinish={handleFinish}
          isExportEnabled={isExportEnabled}
          onHelpClick={handleHelpClick}
          onResetClick={handleResetClick}
          stage={state.stage}
          onNextStage={handleStageChange}
          canAccessInterestStage={canAccessInterestStage}
          priorityStageComplete={priorityStageComplete}
        />
        
        <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden', p: 1 }}>
          {state.stage === 'priority' ? (
            <KanbanContainer
              pitches={pitches}
              votes={state.votes}
              onDragEnd={handleDragEnd}
              onAppetiteChange={handleAppetiteChange}
              userRole={state.voterRole}
            />
          ) : (
            <InterestRanking
              pitches={pitches}
              votes={state.votes}
              onSetInterest={handleInterestChange}
              userRole={state.voterRole}
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
