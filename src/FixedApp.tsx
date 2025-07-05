import { useEffect, useReducer } from 'react';
import { ThemeProvider, CssBaseline, Box, Paper, Typography } from '@mui/material';
import { darkTheme } from './theme';
import { NameGate } from './components/NameGate/NameGate';
import { TopBar } from './components/TopBar/TopBar';
import SnackbarProvider, { useSnackbar } from './components/SnackbarProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Pitch, Vote, Appetite, Tier } from './types/models';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';

// Import sample pitch data
import pitchesData from './assets/pitches.json';

// Initial state and types
interface AppState {
  voterName: string | null;
  votes: Record<string, Vote>;
}

interface Vote {
  pitchId: string;
  appetite?: Appetite | null;
  tier?: Tier;
}

interface AppAction {
  type: 'SET_NAME' | 'SET_APPETITE' | 'SET_TIER' | 'RESET_FROM_PITCHES';
  name?: string;
  id?: string;
  appetite?: Appetite | null;
  tier?: Tier;
  pitchIds?: string[];
}

const initialState: AppState = {
  voterName: null,
  votes: {},
};

// Reducer for state management
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, voterName: action.name || null };
    
    case 'SET_APPETITE':
      if (action.id) {
        return {
          ...state,
          votes: {
            ...state.votes,
            [action.id]: {
              ...state.votes[action.id] || { pitchId: action.id },
              appetite: action.appetite as Appetite | null | undefined,
            } as Vote,
          },
        };
      }
      return state;
    
    case 'SET_TIER':
      if (action.id && action.tier) {
        return {
          ...state,
          votes: {
            ...state.votes,
            [action.id]: {
              ...state.votes[action.id] || { pitchId: action.id },
              tier: action.tier,
            },
          },
        };
      }
      return state;
      
    case 'RESET_FROM_PITCHES':
      if (action.pitchIds) {
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
      }
      return state;
      
    default:
      return state;
  }
};

/**
 * Main App component without drag-and-drop
 */
const AppContent = () => {
  // Get pitches from JSON
  const pitches = pitchesData;
  const TOTAL = pitches.length;
  
  // Use localStorage for persistence
  const [savedState, setSavedState] = useLocalStorage('polling.appState', initialState);
  
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
  
  // Handle name submission
  const handleNameSubmit = (name: string) => {
    dispatch({ type: 'SET_NAME', name });
    showSnackbar(`Welcome, ${name}!`, 'success');
  };
  
  // Handle drag end for drag-and-drop functionality
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
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Box 
            component="main" 
            sx={{ 
              flexGrow: 1, 
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Implement drag-and-drop columns */}
            <Box sx={{ p: 2, display: 'flex', overflowX: 'auto' }}>
              {/* Unsorted column with droppable area */}
              <Box sx={{ width: 280, minWidth: 280, mr: 2, height: 'calc(100vh - 136px)' }}>
                <Paper sx={{ p: 1.5, mb: 2, textAlign: 'center' }}>
                  <Typography variant="h6">
                    Unsorted ({pitches.filter(p => !state.votes[p.id]?.tier).length})
                  </Typography>
                </Paper>
                
                <Droppable droppableId="unsorted">
                  {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        p: 1,
                        height: 'calc(100% - 60px)',
                        backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                        overflowY: 'auto',
                        transition: 'background-color 0.2s ease',
                        border: pitches.filter(p => !state.votes[p.id]?.tier).length === 0 ? 
                          '2px dashed rgba(255,255,255,0.2)' : 'none'
                      }}
                    >
                      {pitches.filter(p => !state.votes[p.id]?.tier).length === 0 && !snapshot.isDraggingOver && (
                        <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 2 }}>
                          Drop cards here
                        </Typography>
                      )}
                      
                      {pitches
                        .filter(pitch => !state.votes[pitch.id]?.tier)
                        .map((pitch, index) => (
                          <Draggable key={pitch.id} draggableId={pitch.id} index={index}>
                            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                              <Paper
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                  p: 2,
                                  mb: 1,
                                  backgroundColor: snapshot.isDragging ? 'primary.dark' : 'background.paper',
                                  boxShadow: snapshot.isDragging ? 6 : 1,
                                  position: 'relative'
                                }}
                              >
                                <Typography variant="subtitle1">{pitch.title}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(pitch as any).details?.problem || 'No problem statement'}
                                </Typography>
                                
                                {/* Appetite indicator */}
                                <Box sx={{ 
                                  position: 'absolute', 
                                  right: 8, 
                                  bottom: 8, 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: '50%',
                                  bgcolor: state.votes[pitch.id]?.appetite === 'S' ? '#2ecc71' :
                                           state.votes[pitch.id]?.appetite === 'M' ? '#f39c12' :
                                           state.votes[pitch.id]?.appetite === 'L' ? '#e74c3c' : '#7f8c8d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem'
                                }}
                                onClick={() => handleAppetiteChange(pitch.id, 'S')}
                                >
                                  {state.votes[pitch.id]?.appetite || '•'}
                                </Box>
                              </Paper>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </Paper>
                  )}
                </Droppable>
              </Box>
              
              {/* Tier 1 column with droppable area */}
              <Box sx={{ width: 280, minWidth: 280, mr: 2, height: 'calc(100vh - 136px)' }}>
                <Paper sx={{ 
                  p: 1.5, 
                  mb: 2, 
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  textAlign: 'center' 
                }}>
                  <Typography variant="h6">
                    Tier 1 ({pitches.filter(p => state.votes[p.id]?.tier === 1).length})
                  </Typography>
                </Paper>
                
                <Droppable droppableId="tier-1">
                  {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        p: 1,
                        height: 'calc(100% - 60px)',
                        backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                        overflowY: 'auto',
                        transition: 'background-color 0.2s ease',
                        border: pitches.filter(p => state.votes[p.id]?.tier === 1).length === 0 ? 
                          '2px dashed rgba(255,255,255,0.2)' : 'none'
                      }}
                    >
                      {pitches.filter(p => state.votes[p.id]?.tier === 1).length === 0 && !snapshot.isDraggingOver && (
                        <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 2 }}>
                          Drop cards here
                        </Typography>
                      )}
                      
                      {pitches
                        .filter(pitch => state.votes[pitch.id]?.tier === 1)
                        .map((pitch, index) => (
                          <Draggable key={pitch.id} draggableId={pitch.id} index={index}>
                            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                              <Paper
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                  p: 2,
                                  mb: 1,
                                  backgroundColor: snapshot.isDragging ? 'primary.dark' : 'background.paper',
                                  boxShadow: snapshot.isDragging ? 6 : 1,
                                  position: 'relative'
                                }}
                              >
                                <Typography variant="subtitle1">{pitch.title}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(pitch as any).details?.problem || 'No problem statement'}
                                </Typography>
                                
                                {/* Appetite indicator */}
                                <Box sx={{ 
                                  position: 'absolute', 
                                  right: 8, 
                                  bottom: 8, 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: '50%',
                                  bgcolor: state.votes[pitch.id]?.appetite === 'S' ? '#2ecc71' :
                                           state.votes[pitch.id]?.appetite === 'M' ? '#f39c12' :
                                           state.votes[pitch.id]?.appetite === 'L' ? '#e74c3c' : '#7f8c8d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem'
                                }}
                                onClick={() => handleAppetiteChange(pitch.id, 'S')}
                                >
                                  {state.votes[pitch.id]?.appetite || '•'}
                                </Box>
                              </Paper>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </Paper>
                  )}
                </Droppable>
              </Box>
            </Box>
          </Box>
        </DragDropContext>
      </Box>
    </>
  );
};

/**
 * Wrapped app with providers
 */
const FixedApp = () => {
  console.log('FixedApp rendering');
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SnackbarProvider>
        <AppContent />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default FixedApp;
