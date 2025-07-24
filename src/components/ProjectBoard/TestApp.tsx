import { useState } from 'react';
import { Container, Box, Button, Typography, Paper } from '@mui/material';
import ProjectPriorityApp from './ProjectPriorityApp';
import { mockProjects, mockInitialVotes } from './mockData';
import type { ProjectVote } from '../../types/project-models';

/**
 * Test application for the Project Prioritization Polling App
 * This component demonstrates how to use the ProjectPriorityApp
 * with mock data for testing and development purposes.
 */
const TestApp = () => {
  // State for managing saved votes
  const [savedVotes, setSavedVotes] = useState<Record<string, ProjectVote>>(mockInitialVotes);
  
  // Handler for saving votes
  const handleSaveVotes = (votes: Record<string, ProjectVote>) => {
    console.log('Votes saved:', votes);
    setSavedVotes(votes);
  };
  
  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh', overflow: 'hidden' }}>
      <Paper sx={{ p: 2, borderRadius: 0, boxShadow: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h5">Project Prioritization Polling App - Demo</Typography>
      </Paper>
      
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This is a demo of the Project Prioritization Polling App. 
          It shows how the app works with mock data.
        </Typography>
        
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => setSavedVotes(mockInitialVotes)}
          sx={{ mb: 2 }}
        >
          Reset to Initial Votes
        </Button>
      </Box>
      
      <ProjectPriorityApp 
        projects={mockProjects}
        initialVotes={savedVotes}
        userName="Test User"
        userRole="developer"
        onSaveVotes={handleSaveVotes}
      />
    </Container>
  );
};

export default TestApp;
