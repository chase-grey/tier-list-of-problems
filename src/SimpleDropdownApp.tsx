import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  CssBaseline, 
  Box, 
  Paper, 
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  AppBar,
  Toolbar
} from '@mui/material';
import { GetApp as DownloadIcon } from '@mui/icons-material';
import { darkTheme } from './theme';
import { unparse } from 'papaparse';

// Define types
interface Pitch {
  id: string;
  title: string;
  description?: string;
  details: {
    problem: string;
    ideaForSolution?: string;
    characteristics?: string;
    whyNow?: string;
    smartToolsFit?: string;
    epicFit?: string;
    success?: string;
    maintenance?: string;
    internCandidate?: boolean;
  };
}

type Appetite = 'S' | 'M' | 'L';
type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface Vote {
  pitchId: string;
  appetite?: Appetite;
  tier?: Tier;
}

// Import sample pitch data
import pitchesData from './assets/pitches.json';

const SimpleDropdownApp: React.FC = () => {
  // State
  const [voterName, setVoterName] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [showNameDialog, setShowNameDialog] = useState(true);
  const [nameInput, setNameInput] = useState('');
  
  // Get pitches from JSON
  const pitches = pitchesData as Pitch[];
  const TOTAL = pitches.length;
  
  // Calculate completion stats
  const appetiteCount = Object.values(votes).filter(v => v.appetite).length;
  const rankCount = Object.values(votes).filter(v => v.tier).length;
  const isExportEnabled = appetiteCount === TOTAL && rankCount === TOTAL && voterName !== null;

  // Handle tier change
  const handleTierChange = (pitchId: string, tier: Tier | undefined) => {
    setVotes(prev => ({
      ...prev,
      [pitchId]: { ...prev[pitchId] || { pitchId }, tier }
    }));
  };
  
  // Handle appetite change
  const handleAppetiteChange = (pitchId: string, appetite: Appetite | undefined) => {
    setVotes(prev => ({
      ...prev,
      [pitchId]: { ...prev[pitchId] || { pitchId }, appetite }
    }));
  };

  // Handle name submission
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setVoterName(nameInput.trim());
      localStorage.setItem('polling.voterName', nameInput.trim());
      setShowNameDialog(false);
    }
  };
  
  // Export votes to CSV
  const exportVotes = () => {
    if (!voterName || !isExportEnabled) return;
    
    const rows = Object.values(votes).map(v => ({
      voterName,
      pitchId: v.pitchId,
      appetite: v.appetite || '',
      tier: v.tier || '',
    }));
    
    const csv = unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const name = `poll-votes_${voterName.replace(/\\s+/g, '_')}_${
      new Date().toISOString().slice(0, 10)
    }.csv`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  
  // Local storage persistence
  useEffect(() => {
    // Load from localStorage on mount
    try {
      const savedVotes = localStorage.getItem('polling.votes');
      if (savedVotes) {
        setVotes(JSON.parse(savedVotes));
      }
      
      const savedName = localStorage.getItem('polling.voterName');
      if (savedName) {
        setVoterName(savedName);
        setShowNameDialog(false);
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }, []);
  
  useEffect(() => {
    // Save to localStorage when votes change
    try {
      localStorage.setItem('polling.votes', JSON.stringify(votes));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [votes]);

  // Tier colors
  const getTierColor = (tier: Tier): string => {
    const colors = {
      1: '#7c3aed', // violet 400
      2: '#9333ea',
      3: '#a855f7',
      4: '#c084fc',
      5: '#d946ef',
      6: '#e879f9',
      7: '#f0abfc',
      8: '#f472b6', // rose 400
    };
    return colors[tier];
  };
  
  // Appetite colors
  const getAppetiteColor = (appetite: Appetite): string => {
    const colors = {
      'S': '#2ecc71', // green
      'M': '#f39c12', // amber
      'L': '#e74c3c', // red
    };
    return colors[appetite];
  };
  
  // Render name dialog
  const renderNameDialog = () => (
    <Box 
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Paper 
        sx={{ 
          p: 4, 
          maxWidth: '400px', 
          width: '100%'
        }}
      >
        <Typography variant="h5" component="h2" gutterBottom>
          Welcome to Problem Polling
        </Typography>
        <form onSubmit={handleNameSubmit}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Your Name</InputLabel>
            <input 
              style={{
                padding: '10px',
                fontSize: '16px',
                width: '100%',
                marginTop: '20px',
                borderRadius: '4px',
                border: '1px solid #555'
              }}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Enter your name"
            />
          </FormControl>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth
            disabled={!nameInput.trim()}
          >
            Continue
          </Button>
        </form>
      </Paper>
    </Box>
  );

  // Render header
  const renderHeader = () => (
    <AppBar position="sticky" sx={{ height: 64, mb: 3 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Problem Polling: {voterName || 'User'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography variant="subtitle1">
            🍽 Appetites {appetiteCount}/{TOTAL} • 🗂 Ranked {rankCount}/{TOTAL}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          disabled={!isExportEnabled}
          onClick={exportVotes}
          aria-label="Export results to CSV"
          sx={{
            fontWeight: isExportEnabled ? 'bold' : 'normal',
            '&:not(:disabled)': {
              boxShadow: 3
            }
          }}
        >
          Export CSV
        </Button>
      </Toolbar>
    </AppBar>
  );

  // Render appetite legend
  const renderAppetiteLegend = () => (
    <Paper 
      sx={{ 
        p: 1.5, 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3,
        mb: 3,
        width: 'fit-content',
        mx: 'auto'
      }}
    >
      {['S', 'M', 'L'].map((appetite) => (
        <Box 
          key={appetite} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}
        >
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: getAppetiteColor(appetite as Appetite)
            }}
          />
          <Typography variant="body2">
            {appetite === 'S' ? 'Small' : appetite === 'M' ? 'Medium' : 'Large'}
          </Typography>
        </Box>
      ))}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}
      >
        <Box 
          sx={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            backgroundColor: '#7f8c8d'
          }}
        />
        <Typography variant="body2">
          Unset
        </Typography>
      </Box>
    </Paper>
  );

  // Render pitch cards
  const renderPitchCards = () => (
    <Grid container spacing={3}>
      {pitches.map(pitch => (
        <Grid item xs={12} sm={6} md={4} key={pitch.id}>
          <Card 
            sx={{ 
              mb: 2,
              borderLeft: votes[pitch.id]?.tier ? 
                `4px solid ${getTierColor(votes[pitch.id]?.tier as Tier)}` : 
                'none'
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>{pitch.title}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {pitch.details.problem}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Tier</InputLabel>
                    <Select
                      label="Tier"
                      value={votes[pitch.id]?.tier || ''}
                      onChange={(e) => handleTierChange(pitch.id, e.target.value as Tier | undefined)}
                    >
                      <MenuItem value="">
                        <em>Not set</em>
                      </MenuItem>
                      {Array.from({ length: 8 }, (_, i) => i + 1).map((tier) => (
                        <MenuItem key={tier} value={tier}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box 
                              sx={{ 
                                width: 10, 
                                height: 10, 
                                borderRadius: '50%', 
                                backgroundColor: getTierColor(tier as Tier),
                                mr: 1
                              }} 
                            />
                            Tier {tier}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Appetite</InputLabel>
                    <Select
                      label="Appetite"
                      value={votes[pitch.id]?.appetite || ''}
                      onChange={(e) => handleAppetiteChange(pitch.id, e.target.value as Appetite | undefined)}
                    >
                      <MenuItem value="">
                        <em>Not set</em>
                      </MenuItem>
                      <MenuItem value="S">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%', 
                              backgroundColor: getAppetiteColor('S'),
                              mr: 1
                            }} 
                          />
                          Small (S)
                        </Box>
                      </MenuItem>
                      <MenuItem value="M">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%', 
                              backgroundColor: getAppetiteColor('M'),
                              mr: 1
                            }} 
                          />
                          Medium (M)
                        </Box>
                      </MenuItem>
                      <MenuItem value="L">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%', 
                              backgroundColor: getAppetiteColor('L'),
                              mr: 1
                            }} 
                          />
                          Large (L)
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {showNameDialog && renderNameDialog()}
      {renderHeader()}
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Problem-Polling App
        </Typography>
        {renderAppetiteLegend()}
        {renderPitchCards()}
      </Box>
    </ThemeProvider>
  );
};

export default SimpleDropdownApp;
