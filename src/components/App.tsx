import React, { useEffect, memo, useState } from 'react';
import { ThemeProvider, CssBaseline, Box, Typography } from '@mui/material';
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
import type { AppState, Pitch, Appetite, Tier, InterestLevel } from '../types/models';
import { isContributorRole } from '../types/models';
import { useVoteManagement } from '../hooks/useVoteManagement';

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
  
  // Use our centralized vote management hook
  const {
    state,
    // dispatch is not used directly
    setTier,
    setInterest,
    setAppetite,
    setStage,
    resetAll,
    syncPitches,
    setNameAndRole,
    setAvailability,
    setDefaultInterestLevels,
    getCompletionStats
  } = useVoteManagement(completeState);

  // Access snackbar
  const { showSnackbar } = useSnackbar();
  
  // Sync reducer state with localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSavedState(state);
    }, 250);
    
    return () => clearTimeout(timer);
  }, [state, setSavedState]);

  // Additionally store the voter name in a separate key as per spec ('polling.voterName')
  useEffect(() => {
    if (state.voterName) {
      localStorage.setItem('polling.voterName', state.voterName);
      if (state.voterRole) {
        localStorage.setItem('polling.voterRole', state.voterRole);
      }
    }
  }, [state.voterName, state.voterRole]);
  
  // Sync pitches with votes on initial load or when pitches change
  useEffect(() => {
    const pitchIds = pitches.map(pitch => pitch.id);
    syncPitches(pitchIds);
  }, [pitches]);
  
  // Get completion stats using our utility function
  const stats = getCompletionStats(pitches);
  const { 
    appetiteCount,
    rankCount,
    interestCount,
    // minimumRequired is not used directly
    isPriorityComplete,
    isInterestComplete 
  } = stats;
  
  // Check if the user has a role that can access interest ranking
  // Only QMs, devs, QM TLs, and dev TLs who are available for next quarter can see interest section
  const canAccessInterestStage = state.voterRole !== null && 
    isContributorRole(state.voterRole) && 
    state.available === true;
  
  // Check if the user needs to rank interest (same logic as canAccessInterestStage, kept for backward compatibility)
  const needsInterestRanking = canAccessInterestStage;
  
  // Calculate completion status based on role and availability (now only requires 50%)
  const priorityStageComplete = isPriorityComplete;
  
  // Check if export is enabled based on role and stage
  const isExportEnabled = priorityStageComplete && 
    // For users who don't need to rank interest, enable export immediately
    // For users who need to rank interest, they need 50% completion and must visit the interest page
    (!needsInterestRanking || (needsInterestRanking && state.stage === 'interest' && isInterestComplete));
  
  // Handle name and role submission
  const handleNameSubmit = (name: string, role: string) => {
    setNameAndRole(name, role);
    showSnackbar(`Welcome, ${name}!`, 'success');
    
    // If this is a non-contributor role, automatically set available to false
    // This ensures they skip the availability dialog and can't access interest section
    if (!isContributorRole(role)) {
      // Set availability to false for non-contributors
      setAvailability(false);
    }
  };
  
  // Handle drag end for priority stage
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    
    // Drop outside valid area
    if (!destination) return;
    
    const destId = destination.droppableId;
    
    // If dropped in the unsorted column
    if (destId === 'unsorted') {
      setTier(draggableId, null);
      showSnackbar('Pitch moved to unsorted', 'info');
    }
    // If dropped in a tier column
    else {
      const tier = parseInt(destId.replace('tier-', '')) as Tier;
      setTier(draggableId, tier);
      showSnackbar(`Pitch moved to Tier ${tier}`, 'info');
    }
  };

  // Handle interest level change
  const handleInterestChange = (pitchId: string, interestLevel: InterestLevel) => {
    console.log(`[DEBUG] Setting interest level ${interestLevel} for pitch ${pitchId}`);
    
    try {
      // Find the pitch title for better logging
      const pitch = pitches.find(p => p.id === pitchId);
      const pitchTitle = pitch ? pitch.title.substring(0, 20) : 'unknown';
      
      console.log(`[DEBUG] Interest change for "${pitchTitle}..."`, {
        pitchId,
        interestLevel,
        previousLevel: state.votes[pitchId]?.interestLevel,
        previousTier: state.votes[pitchId]?.tier
      });
      
      // Set the interest level in state
      setInterest(pitchId, interestLevel);
      
      if (interestLevel === null) {
        showSnackbar('Pitch moved to unsorted', 'info');
      } else {
        // Convert numeric interest level to descriptive label
        const interestLabels = [
          'Very Interested',      // Level 4
          'Interested',           // Level 3
          'Somewhat Interested',  // Level 2
          'Not Interested'        // Level 1
        ];
        
        const levelIndex = 4 - interestLevel; // Convert from level (4-1) to index (0-3)
        showSnackbar(`Interest level set to ${interestLabels[levelIndex]}`, 'info');
      }
    } catch (error) {
      console.error('[DEBUG] Error handling interest change:', error);
    }
  };
  
  // Handle appetite change
  const handleAppetiteChange = (pitchId: string, appetite: Appetite | null) => {
    setAppetite(pitchId, appetite);
    if (appetite) {
      showSnackbar(`Appetite set to ${appetite === 'S' ? 'Small' : appetite === 'M' ? 'Medium' : 'Large'}`, 'info');
    }
  };

  // Handle availability setting
  const handleAvailabilitySet = (available: boolean) => {
    setAvailability(available);
    showSnackbar(`Availability ${available ? 'confirmed' : 'noted - thanks for letting us know'}`, 'success');
  };

  // Toggle between priority and interest stages
  const handleStageChange = () => {
    console.log('[DEBUG] Starting stage transition', {
      currentStage: state.stage,
      voterRole: state.voterRole,
      canAccessInterestStage,
      priorityStageComplete,
      available: state.available,
      votesCount: Object.keys(state.votes || {}).length,
      pitchesCount: Array.isArray(pitches) ? pitches.length : 0
    });

    // Toggle between stages
    const newStage = state.stage === 'priority' ? 'interest' : 'priority';
    
    // Only allow switching to interest stage if conditions are met
    if (newStage === 'interest' && (!canAccessInterestStage || !priorityStageComplete)) {
      console.warn('[DEBUG] Interest stage transition blocked', { 
        canAccessInterestStage, 
        priorityStageComplete,
        voterRole: state.voterRole,
        available: state.available 
      });
      
      // Show appropriate error message
      if (!canAccessInterestStage) {
        showSnackbar('Only QM, developers, QM TLs, and dev TLs who have indicated availability can rank interest', 'error');
      } else {
        showSnackbar('You must complete all appetites and priority rankings first', 'error');
      }
      return;
    }
    
    // If switching to interest stage, set default interest levels for all cards
    // But only do this if the user can access the interest stage and has completed priority ranking
    if (newStage === 'interest') {
      if (canAccessInterestStage && priorityStageComplete) {
        console.log('[DEBUG] Setting default interest levels', { 
          pitchCount: Array.isArray(pitches) ? pitches.length : 0 
        });
        setDefaultInterestLevels(pitches);
      } else {
        console.error('[DEBUG] Failed to set interest levels - requirements not met', { 
          canAccessInterestStage, 
          priorityStageComplete 
        });
        // If requirements aren't met, stay on priority stage and show an error
        showSnackbar('You cannot access the interest stage until priority ranking is completed', 'error');
        return;
      }
    }
    
    // Set the new stage
    console.log(`[DEBUG] Setting stage to ${newStage}`);
    setStage(newStage);
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
    resetAll();
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
      setNameAndRole(name, 'developer');
    }
    
    // Apply each vote
    Object.entries(votes).forEach(([pitchId, vote]) => {
      // Set appetite if present
      if (vote.appetite) {
        setAppetite(pitchId, vote.appetite);
      }
      
      // Set tier if present
      if (vote.tier) {
        setTier(pitchId, vote.tier);
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
            // Only render interest ranking if the user has access and priority stage is complete
            canAccessInterestStage && priorityStageComplete ? (
              <InterestRanking
                pitches={Array.isArray(pitches) ? pitches : []}
                votes={state.votes || {}}
                onSetInterest={handleInterestChange}
                userRole={state.voterRole}
              />
            ) : (
              // If user somehow got to interest stage but shouldn't be there, show fallback UI
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="h5" color="text.secondary">
                  You need to complete priority ranking before accessing this section.
                </Typography>
              </Box>
            )
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
