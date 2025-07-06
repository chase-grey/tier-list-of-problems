import React, { useEffect, useReducer, memo, useState } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { darkTheme } from '../theme';
import { NameGate } from './NameGate/NameGate';
import { TopBar } from './TopBar/TopBar';
import KanbanContainer from './VotingBoard/KanbanContainer';
import SnackbarProvider, { useSnackbar } from './SnackbarProvider';
import HelpDialog from './HelpDialog/HelpDialog';
import ConfirmationDialog from './ConfirmationDialog/ConfirmationDialog';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { exportVotes } from '../utils/csv';
import type { DropResult } from '@hello-pangea/dnd';
import type { AppState, AppAction, Pitch, Vote, Appetite, Tier } from '../types/models';

// Import pitch data
import pitchesData from '../assets/pitches.json';

// Initial state
const initialState: AppState = {
  voterName: null,
  votes: {},
};

// Reducer for state management
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, voterName: action.name };
    
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
    
    case 'RESET_FROM_PITCHES':
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
  const [showHelp, setShowHelp] = useState(false);
  // State to track if this is first login
  const [isFirstLogin, setIsFirstLogin] = useState(true);
  // State to control reset confirmation dialog
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  // Get pitches from JSON
  const pitches = pitchesData as Pitch[];
  const TOTAL = pitches.length;
  
  // Use localStorage for persistence
  const [savedState, setSavedState] = useLocalStorage<AppState>('polling.appState', initialState);
  
  // Set up reducer with saved state
  const [state, dispatch] = useReducer(appReducer, savedState);

  // Additionally store the voter name in a separate key as per spec ('polling.voterName')
  useEffect(() => {
    if (state.voterName) {
      localStorage.setItem('polling.voterName', state.voterName);
    }
  }, [state.voterName]);
  
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
  
  // Check if export is enabled
  const isExportEnabled = appetiteCount === TOTAL && rankCount === TOTAL;
  
  // Handle name submission
  const handleNameSubmit = (name: string) => {
    dispatch({ type: 'SET_NAME', name });
    showSnackbar(`Welcome, ${name}!`, 'success');
    
    // Show help dialog after name is submitted for first time users
    if (isFirstLogin) {
      setTimeout(() => setShowHelp(true), 500); // Small delay for better UX
      setIsFirstLogin(false);
    }
  };
  
  // Handle drag end
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
  
  // Handle appetite change
  const handleAppetiteChange = (pitchId: string, appetite: Appetite | null) => {
    dispatch({ type: 'SET_APPETITE', id: pitchId, appetite });
    if (appetite) {
      showSnackbar(`Appetite set to ${appetite === 'S' ? 'Small' : appetite === 'M' ? 'Medium' : 'Large'}`, 'info');
    }
  };
  
  // Handle showing help dialog
  const handleHelpClick = () => {
    setShowHelp(true);
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
    // Reset first login flag to show instructions again
    setIsFirstLogin(true);
    // Show success message
    showSnackbar('All data has been reset. Please enter your name to continue.', 'success');
  };

  // Handle export
  const handleExport = () => {
    if (state.voterName && isExportEnabled) {
      exportVotes(state.voterName, state.votes);
      showSnackbar('Votes exported successfully!', 'success');
    } else {
      showSnackbar('Complete all appetites and rankings first', 'error');
    }
  };
  
  return (
    <>
      <NameGate 
        onNameSubmit={handleNameSubmit}
        open={!state.voterName}
      />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TopBar
          voterName={state.voterName || 'User'}
          votes={state.votes}
          totalPitchCount={TOTAL}
          appetiteCount={appetiteCount}
          rankCount={rankCount}
          onExport={handleExport}
          isExportEnabled={isExportEnabled}
          onHelpClick={handleHelpClick}
          onResetClick={handleResetClick}
        />
        
        <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden', p: 1 }}>
          <KanbanContainer
            pitches={pitches}
            votes={state.votes}
            onDragEnd={handleDragEnd}
            onAppetiteChange={handleAppetiteChange}
          />

          {/* Help Dialog */}
          <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
          
          {/* Reset Confirmation Dialog */}
          <ConfirmationDialog
            open={showResetConfirmation}
            title="Reset Everything"
            message="Are you sure you want to reset everything? This will clear all your votes and allow you to change your name. You'll also see the instructions page again. This action cannot be undone."
            onConfirm={handleResetConfirm}
            onCancel={() => setShowResetConfirmation(false)}
            confirmText="Yes, Reset Everything"
            severity="warning"
          />
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
