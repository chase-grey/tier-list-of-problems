import React, { useState, useEffect } from 'react';
import {
  ThemeProvider, 
  CssBaseline, 
  Box, 
  AppBar,
  Toolbar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Grid,
  IconButton
} from '@mui/material';
import { GetApp as DownloadIcon } from '@mui/icons-material';
import { darkTheme } from './theme';

// Data model types
type Appetite = 'S' | 'M' | 'L';
type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface Pitch {
  id: string;
  title: string;
  details: {
    problem: string;
    ideaForSolution?: string;
    characteristics?: string;
  };
}

interface Vote {
  pitchId: string;
  appetite?: Appetite;
  tier?: Tier;
}

// Sample data
const samplePitches: Pitch[] = [
  {
    id: 'p1',
    title: 'AI-Powered Bug Prediction',
    details: {
      problem: 'Developers waste time debugging issues that follow predictable patterns.',
      ideaForSolution: 'Use ML to identify patterns and suggest fixes before they cause issues.'
    }
  },
  {
    id: 'p2',
    title: 'User Session Replay',
    details: {
      problem: 'Hard to diagnose UX issues without seeing what users experienced.',
      characteristics: 'Privacy-focused recording for web and mobile apps.'
    }
  },
  {
    id: 'p3',
    title: 'GraphQL API Gateway',
    details: {
      problem: 'Multiple API endpoints cause client complexity and performance issues.',
      ideaForSolution: 'Create a unified GraphQL layer.'
    }
  }
];

// Color definitions
const appetiteColors = {
  S: '#2ecc71', // Green
  M: '#f39c12', // Amber
  L: '#e74c3c', // Red
  unset: '#7f8c8d' // Gray
};

// Main app component
const MinimalApp: React.FC = () => {
  // State
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(true);
  const [votes, setVotes] = useState<Record<string, Vote>>({});

  // Load from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('polling.appState');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
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
      setUserName(nameInput.trim());
      setShowNameDialog(false);
    }
  };

  // Handle appetite change
  const handleAppetiteChange = (pitchId: string) => {
    setVotes(prev => {
      const current = prev[pitchId]?.appetite;
      let next: Appetite | undefined;
      
      if (!current) next = 'S';
      else if (current === 'S') next = 'M';
      else if (current === 'M') next = 'L';
      else next = undefined;
      
      return {
        ...prev,
        [pitchId]: {
          ...(prev[pitchId] || { pitchId }),
          appetite: next
        }
      };
    });
  };

  // Handle tier assignment
  const handleTierChange = (pitchId: string, tier: Tier) => {
    setVotes(prev => ({
      ...prev,
      [pitchId]: {
        ...(prev[pitchId] || { pitchId }),
        tier
      }
    }));
  };

  // Calculate stats
  const appetiteCount = Object.values(votes).filter(v => v.appetite).length;
  const rankedCount = Object.values(votes).filter(v => v.tier).length;
  const TOTAL = samplePitches.length;

  // Export to CSV
  const handleExport = () => {
    const rows = [
      ['voterName', 'pitchId', 'title', 'appetite', 'tier'],
      ...Object.values(votes).map(v => {
        const pitch = samplePitches.find(p => p.id === v.pitchId);
        return [
          userName,
          v.pitchId,
          pitch?.title || '',
          v.appetite || '',
          v.tier || ''
        ];
      })
    ];
    
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      rows.map(r => r.join(',')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `poll-votes_${userName?.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      {/* Name Dialog */}
      <Dialog open={showNameDialog} aria-labelledby="name-dialog-title">
        <DialogTitle id="name-dialog-title">Welcome to Problem-Polling</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Your Name"
            type="text"
            fullWidth
            variant="outlined"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleNameSubmit}
            color="primary"
            variant="contained"
            disabled={!nameInput.trim()}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Main App */}
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* App Bar */}
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Problem Polling: {userName || 'User'}
            </Typography>
            <Typography variant="subtitle1" sx={{ mr: 2 }}>
              🍽 Appetites {appetiteCount}/{TOTAL} • 🗂 Ranked {rankedCount}/{TOTAL}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<DownloadIcon />}
              disabled={appetiteCount < TOTAL || rankedCount < TOTAL}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </Toolbar>
        </AppBar>
        
        {/* Main Content */}
        <Box sx={{ p: 2, flexGrow: 1 }}>
          {/* Legend */}
          <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            {['unset', 'S', 'M', 'L'].map(key => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box 
                  sx={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: '50%', 
                    bgcolor: appetiteColors[key as keyof typeof appetiteColors] 
                  }}
                />
                <Typography>{key === 'unset' ? 'Unset' : key}</Typography>
              </Box>
            ))}
          </Paper>
          
          {/* Board */}
          <Grid container spacing={2}>
            {/* Unsorted Column */}
            <Grid item xs={12} md={3}>
              <Paper 
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  minHeight: '70vh',
                  bgcolor: 'background.paper'
                }}
              >
                <Typography variant="h6" align="center" gutterBottom>
                  Unsorted
                </Typography>
                <Box>
                  {samplePitches
                    .filter(p => !votes[p.id]?.tier)
                    .map(pitch => (
                    <Paper
                      key={pitch.id}
                      sx={{
                        p: 2,
                        mb: 2,
                        position: 'relative',
                        cursor: 'grab',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handleTierChange(pitch.id, 1)}
                    >
                      <Typography variant="subtitle1">{pitch.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pitch.details.problem}
                      </Typography>
                      
                      {/* Appetite dots */}
                      <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 0.5 }}>
                        {['S', 'M', 'L'].map((a) => (
                          <IconButton 
                            key={a}
                            size="small"
                            sx={{
                              width: 24,
                              height: 24,
                              bgcolor: votes[pitch.id]?.appetite === a ? 
                                appetiteColors[a as Appetite] : 
                                'transparent',
                              border: votes[pitch.id]?.appetite === a ? 
                                'none' : 
                                `1px solid ${appetiteColors[a as Appetite]}`,
                              color: votes[pitch.id]?.appetite === a ? 
                                'white' : 
                                appetiteColors[a as Appetite],
                              '&:hover': {
                                bgcolor: votes[pitch.id]?.appetite === a ? 
                                  appetiteColors[a as Appetite] : 
                                  'rgba(0,0,0,0.04)'
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppetiteChange(pitch.id);
                            }}
                            aria-label={`Mark as ${a === 'S' ? 'Small' : a === 'M' ? 'Medium' : 'Large'} effort`}
                          >
                            {a}
                          </IconButton>
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Paper>
            </Grid>
            
            {/* Tier Columns */}
            {Array.from({ length: 8 }, (_, i) => i + 1).map(tier => (
              <Grid item xs={12} md={3} key={`tier-${tier}`}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    height: '100%',
                    minHeight: '70vh',
                    bgcolor: 'background.paper',
                    borderTop: 4,
                    borderColor: tier === 1 ? '#7c3aed' : 
                                tier === 8 ? '#f472b6' : 
                                `rgba(124, 58, 237, ${1 - ((tier - 1) * 0.1)})`
                  }}
                >
                  <Typography variant="h6" align="center" gutterBottom>
                    Tier {tier}
                  </Typography>
                  <Box>
                    {samplePitches
                      .filter(p => votes[p.id]?.tier === tier)
                      .map(pitch => (
                      <Paper
                        key={pitch.id}
                        sx={{
                          p: 2,
                          mb: 2,
                          position: 'relative',
                          cursor: 'grab',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            boxShadow: 2
                          }
                        }}
                      >
                        <Typography variant="subtitle1">{pitch.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pitch.details.problem}
                        </Typography>
                        
                        {/* Appetite dots */}
                        <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 0.5 }}>
                          {['S', 'M', 'L'].map((a) => (
                            <IconButton 
                              key={a}
                              size="small"
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: votes[pitch.id]?.appetite === a ? 
                                  appetiteColors[a as Appetite] : 
                                  'transparent',
                                border: votes[pitch.id]?.appetite === a ? 
                                  'none' : 
                                  `1px solid ${appetiteColors[a as Appetite]}`,
                                color: votes[pitch.id]?.appetite === a ? 
                                  'white' : 
                                  appetiteColors[a as Appetite],
                                '&:hover': {
                                  bgcolor: votes[pitch.id]?.appetite === a ? 
                                    appetiteColors[a as Appetite] : 
                                    'rgba(0,0,0,0.04)'
                                }
                              }}
                              onClick={() => handleAppetiteChange(pitch.id)}
                              aria-label={`Mark as ${a === 'S' ? 'Small' : a === 'M' ? 'Medium' : 'Large'} effort`}
                            >
                              {a}
                            </IconButton>
                          ))}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </ThemeProvider>
  );

};

export default MinimalApp;
