import React, { useEffect, useReducer } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { darkTheme } from '../theme';
import { NameGate } from './NameGate/NameGate';
import { TopBar } from './TopBar/TopBar';
import KanbanContainer from './VotingBoard/KanbanContainer';
import SnackbarProvider, { useSnackbar } from './SnackbarProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { DropResult } from '@hello-pangea/dnd';
import type { AppState, AppAction, Pitch, Vote, Appetite, Tier } from '../types/models';

// Import sample pitch data
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
            appetite: action.appetite,
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
          } as Vote,
        },
      };
    
    case 'RESET_FROM_PITCHES':
      // Sync votes with current pitch IDs
      const syncedVotes = Object.fromEntries(
        action.pitchIds.map(id => [
          id, 
          state.votes[id] || { pitchId: id }
        ])
      );
      
      return {
        ...state,
        votes: syncedVotes,
      };
    
    default:
      return state;
  }
};

/**
 * Main App component
 */
const AppContent: React.FC = () => {
  // Get pitches from JSON
  const pitches = pitchesData as Pitch[];
  const TOTAL = pitches.length;
  
  // Use localStorage for persistence
  const [savedState, setSavedState] = useLocalStorage<{
    voterName: string | null;
    votes: Record<string, Vote>;
  }>('polling.appState', initialState);
  
  // Set up reducer with saved state
  const [state, dispatch] = useReducer(appReducer, savedState);
  
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
  
  // Handle name submission
  const handleNameSubmit = (name: string) => {
    dispatch({ type: 'SET_NAME', name });
    showSnackbar(`Welcome, ${name}!`, 'success');
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
      dispatch({ type: 'SET_TIER', id: draggableId, tier });
      showSnackbar(`Pitch moved to Tier ${tier}`, 'info');
    }
  };
  
  // Handle appetite change
  const handleAppetiteChange = (pitchId: string, appetite: Appetite | null) => {
    dispatch({ type: 'SET_APPETITE', id: pitchId, appetite });
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
        />
        
        <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <KanbanContainer
            pitches={pitches}
            votes={state.votes}
            onDragEnd={handleDragEnd}
            onAppetiteChange={handleAppetiteChange}
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
  console.log('App rendering');
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SnackbarProvider>
        <AppContent />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;
