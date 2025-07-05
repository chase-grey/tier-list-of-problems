import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import { 
  ThemeProvider, 
  CssBaseline, 
  Box, 
  Paper, 
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { darkTheme } from './theme';

// This is a bare-bones app without drag-and-drop but with tier assignment via select boxes
const SimpleWorkingApp: React.FC = () => {
  // Sample data structure
  interface Pitch {
    id: string;
    title: string;
    description: string;
  }

  interface Vote {
    tier?: number | null;
    appetite?: string | null;
  }
  
  // Sample pitch data
  const pitches: Pitch[] = [
    { id: 'p1', title: 'AI-Powered Bug Prediction', description: 'ML to predict bugs before they occur' },
    { id: 'p2', title: 'User Session Replay', description: 'Record user sessions for debugging' },
    { id: 'p3', title: 'GraphQL API Gateway', description: 'Unified API layer for microservices' }
  ];
  
  // State for votes
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  
  // Handle tier change
  const handleTierChange = (pitchId: string, tier: number | null) => {
    setVotes(prev => ({
      ...prev,
      [pitchId]: { ...prev[pitchId] || {}, tier }
    }));
  };
  
  // Handle drag end for drag-and-drop
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    
    // Drop outside valid area
    if (!destination) return;
    
    const destId = destination.droppableId;
    let tier: number | null = null;
    
    // If dropped in a tier column
    if (destId !== 'unsorted') {
      tier = parseInt(destId.replace('tier-', ''));
    }
    
    handleTierChange(draggableId, tier);
  };
  
  // Handle appetite change
  const handleAppetiteChange = (pitchId: string, appetite: string | null) => {
    setVotes(prev => ({
      ...prev,
      [pitchId]: { ...prev[pitchId] || {}, appetite }
    }));
  };
  
  // Local storage persistence
  useEffect(() => {
    // Load from localStorage on mount
    try {
      const savedVotes = localStorage.getItem('simple.votes');
      if (savedVotes) {
        setVotes(JSON.parse(savedVotes));
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }, []);
  
  useEffect(() => {
    // Save to localStorage when votes change
    try {
      localStorage.setItem('simple.votes', JSON.stringify(votes));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [votes]);
  
  // Get pitches for a specific tier
  const getPitchesByTier = (tier: number | null) => {
    return pitches.filter(pitch => votes[pitch.id]?.tier === tier);
  };

  // Get unassigned pitches
  const getUnassignedPitches = () => {
    return pitches.filter(pitch => votes[pitch.id]?.tier === undefined);
  };
  
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Problem-Polling App (Simple Version)
        </Typography>
        
        {/* Drag-and-drop context with grid layout */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid container spacing={3}>
          {/* Unassigned pitches */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Unassigned Pitches
              </Typography>
              
              {/* Droppable area for unassigned pitches */}
              <Droppable droppableId="unsorted">
                {(provided: DroppableProvided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ minHeight: 200 }}
                  >
                    {getUnassignedPitches().map((pitch, index) => (
                      <Draggable 
                        key={pitch.id} 
                        draggableId={pitch.id} 
                        index={index}
                      >
                        {(provided: DraggableProvided) => (
                          <Card 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{ mb: 2 }}
                          >
                            <CardContent>
                              <Typography variant="h6">{pitch.title}</Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {pitch.description}
                              </Typography>
                    
                    {/* Appetite selection */}
                    <FormControl size="small" fullWidth>
                      <InputLabel>Appetite</InputLabel>
                      <Select
                        label="Appetite"
                        value={votes[pitch.id]?.appetite || ''}
                        onChange={(e) => handleAppetiteChange(pitch.id, e.target.value as string)}
                      >
                        <MenuItem value="">
                          <em>Not set</em>
                        </MenuItem>
                        <MenuItem value="S">Small (S)</MenuItem>
                        <MenuItem value="M">Medium (M)</MenuItem>
                        <MenuItem value="L">Large (L)</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              ))}
              {getUnassignedPitches().length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  All pitches have been assigned to tiers
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Tier 1 */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderTop: '4px solid #7c3aed' }}>
              <Typography variant="h6" gutterBottom>
                Tier 1
              </Typography>
              {getPitchesByTier(1).map(pitch => (
                <Card key={pitch.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{pitch.title}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {pitch.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Button 
                        size="small" 
                        onClick={() => handleTierChange(pitch.id, null)}
                      >
                        Unassign
                      </Button>
                      <Box 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <Typography variant="body2">Appetite:</Typography>
                        <Box sx={{ 
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: votes[pitch.id]?.appetite === 'S' ? '#2ecc71' :
                                   votes[pitch.id]?.appetite === 'M' ? '#f39c12' :
                                   votes[pitch.id]?.appetite === 'L' ? '#e74c3c' : '#7f8c8d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        onClick={() => {
                          const current = votes[pitch.id]?.appetite;
                          const next = !current ? 'S' : 
                                      current === 'S' ? 'M' : 
                                      current === 'M' ? 'L' : null;
                          handleAppetiteChange(pitch.id, next);
                        }}
                        >
                          {votes[pitch.id]?.appetite || '•'}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {getPitchesByTier(1).length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No pitches in this tier
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Tier 2 */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderTop: '4px solid #9333ea' }}>
              <Typography variant="h6" gutterBottom>
                Tier 2
              </Typography>
              {getPitchesByTier(2).map(pitch => (
                <Card key={pitch.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{pitch.title}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {pitch.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Button 
                        size="small" 
                        onClick={() => handleTierChange(pitch.id, null)}
                      >
                        Unassign
                      </Button>
                      <Box 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <Typography variant="body2">Appetite:</Typography>
                        <Box sx={{ 
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: votes[pitch.id]?.appetite === 'S' ? '#2ecc71' :
                                   votes[pitch.id]?.appetite === 'M' ? '#f39c12' :
                                   votes[pitch.id]?.appetite === 'L' ? '#e74c3c' : '#7f8c8d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        onClick={() => {
                          const current = votes[pitch.id]?.appetite;
                          const next = !current ? 'S' : 
                                      current === 'S' ? 'M' : 
                                      current === 'M' ? 'L' : null;
                          handleAppetiteChange(pitch.id, next);
                        }}
                        >
                          {votes[pitch.id]?.appetite || '•'}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {getPitchesByTier(2).length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No pitches in this tier
                </Typography>
              )}
            </Paper>
          </Grid>
          </Grid>
        </DragDropContext>
      </Box>
    </ThemeProvider>
  );
};

export default SimpleWorkingApp;
