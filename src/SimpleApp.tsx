import { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  CssBaseline, 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button,
  Container,
  Dialog,
  TextField,
  Paper,
  Grid
} from '@mui/material';
import { darkTheme } from './theme';

// Simple data model
interface Pitch {
  id: string;
  title: string;
  problem: string;
}

type Appetite = 'S' | 'M' | 'L' | null;
type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;

interface Vote {
  pitchId: string;
  appetite: Appetite;
  tier: Tier;
}

// Sample data
const pitches: Pitch[] = [
  { id: 'p1', title: 'AI-Powered Bug Prediction', problem: 'Developers waste time debugging issues that follow predictable patterns.' },
  { id: 'p2', title: 'User Session Replay', problem: 'Hard to diagnose UX issues without seeing what users actually experienced.' },
  { id: 'p3', title: 'GraphQL API Gateway', problem: 'Multiple API endpoints cause client complexity and performance issues.' },
];

// Colors
const colors = {
  appetites: {
    S: '#2ecc71', // Green
    M: '#f39c12', // Amber
    L: '#e74c3c', // Red
    null: '#7f8c8d' // Gray
  },
  tiers: {
    1: '#7c3aed',
    8: '#f472b6'
  }
};

// Main App
function SimpleApp() {
  // State
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(true);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  
  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('polling.appState');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.voterName) {
          setUserName(data.voterName);
          setShowNameDialog(false);
        }
        if (data.votes) {
          setVotes(data.votes);
        }
      } catch (e) {
        console.error('Error loading from localStorage', e);
      }
    }
  }, []);
  
  // Save to localStorage
  useEffect(() => {
    if (userName) {
      const data = { voterName: userName, votes };
      localStorage.setItem('polling.appState', JSON.stringify(data));
    }
  }, [userName, votes]);
  
  // Handle name submission
  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setUserName(nameInput);
      setShowNameDialog(false);
    }
  };
  
  // Handle appetite change
  const handleAppetiteChange = (pitchId: string) => {
    const current = votes[pitchId]?.appetite || null;
    let next: Appetite;
    
    if (current === null) next = 'S';
    else if (current === 'S') next = 'M';
    else if (current === 'M') next = 'L';
    else next = null;
    
    setVotes(prev => ({
      ...prev,
      [pitchId]: {
        ...(prev[pitchId] || { pitchId, tier: null }),
        appetite: next
      }
    }));
  };
  
  // Handle tier change
  const handleTierChange = (pitchId: string, tier: Tier) => {
    setVotes(prev => ({
      ...prev,
      [pitchId]: {
        ...(prev[pitchId] || { pitchId, appetite: null }),
        tier
      }
    }));
  };
  
  // Calculate stats
  const appetiteCount = Object.values(votes).filter(v => v.appetite !== null).length;
  const rankedCount = Object.values(votes).filter(v => v.tier !== null).length;
  const TOTAL = pitches.length;
  
  // Export to CSV
  const handleExport = () => {
    const rows = [
      ['voterName', 'pitchId', 'appetite', 'tier'],
      ...Object.values(votes).map(v => [
        userName,
        v.pitchId,
        v.appetite || '',
        v.tier || ''
      ])
    ];
    
    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `poll-votes_${userName?.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      {/* Name dialog */}
      <Dialog open={showNameDialog}>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>Enter Your Name</Typography>
          <TextField
            fullWidth
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            label="Your Name"
            margin="normal"
            autoFocus
          />
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNameSubmit}
              disabled={!nameInput.trim()}
              fullWidth
            >
              Continue
            </Button>
          </Box>
        </Box>
      </Dialog>
      
      {/* Main app */}
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* App Bar */}
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Problem Polling: {userName || 'User'}
            </Typography>
            <Typography variant="body2" sx={{ mr: 2 }}>
              🍽 Appetites {appetiteCount}/{TOTAL} • 🗂 Ranked {rankedCount}/{TOTAL}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              disabled={appetiteCount < TOTAL || rankedCount < TOTAL}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
          {/* Legend */}
          <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'center', gap: 3 }}>
            {Object.entries(colors.appetites).map(([key, color]) => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: color }} />
                <Typography>{key === 'null' ? 'Unset' : key}</Typography>
              </Box>
            ))}
          </Paper>
          
          {/* Columns */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {/* Unsorted column */}
            <Box>
              <Paper sx={{ p: 2, height: '100%', minHeight: 400 }}>
                <Typography variant="h6" align="center" gutterBottom>
                  Unsorted
                </Typography>
                <Box>
                  {pitches.filter(p => !votes[p.id]?.tier).map(pitch => (
                    <Paper 
                      key={pitch.id}
                      sx={{ 
                        p: 2, 
                        mb: 2, 
                        position: 'relative',
                        cursor: 'grab'
                      }}
                      onClick={() => handleTierChange(pitch.id, 1)} // Simplified: just put in Tier 1
                    >
                      <Typography variant="subtitle1">{pitch.title}</Typography>
                      <Typography variant="body2">{pitch.problem}</Typography>
                      
                      {/* Appetite dot */}
                      <Box 
                        sx={{ 
                          position: 'absolute',
                          right: 8,
                          bottom: 8,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: colors.appetites[votes[pitch.id]?.appetite || 'null'],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppetiteChange(pitch.id);
                        }}
                      >
                        {votes[pitch.id]?.appetite || '•'}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Paper>
            </Grid>
            
            {/* Tier columns */}
            {Array.from({ length: 8 }, (_, i) => i + 1).map(tier => (
              <Box key={`tier-${tier}`}>
                <Paper sx={{ 
                  p: 2, 
                  height: '100%', 
                  minHeight: 400,
                  borderTop: `4px solid ${tier === 1 ? colors.tiers[1] : 
                              tier === 8 ? colors.tiers[8] : 
                              '#9946d4'}`
                }}>
                  <Typography variant="h6" align="center" gutterBottom>
                    Tier {tier}
                  </Typography>
                  <Box>
                    {pitches.filter(p => votes[p.id]?.tier === tier).map(pitch => (
                      <Paper 
                        key={pitch.id}
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          position: 'relative',
                          cursor: 'grab'
                        }}
                      >
                        <Typography variant="subtitle1">{pitch.title}</Typography>
                        <Typography variant="body2">{pitch.problem}</Typography>
                        
                        {/* Appetite dot */}
                        <Box 
                          sx={{ 
                            position: 'absolute',
                            right: 8,
                            bottom: 8,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: colors.appetites[votes[pitch.id]?.appetite || 'null'],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                          onClick={() => handleAppetiteChange(pitch.id)}
                        >
                          {votes[pitch.id]?.appetite || '•'}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Paper>
              </Box>
            ))}
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default SimpleApp;
