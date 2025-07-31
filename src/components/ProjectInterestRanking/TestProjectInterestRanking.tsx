import React, { useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import ProjectInterestRanking from './ProjectInterestRanking';
import { mockProjects } from '../ProjectBoard/mockData';

/**
 * Test component for ProjectInterestRanking to visualize its functionality independently
 */
const TestProjectInterestRanking: React.FC = () => {
  // Local state to store the interest votes
  const [interestVotes, setInterestVotes] = useState<Record<string, any>>({});
  
  // Handle setting interest level for a project
  const handleSetInterest = (id: string, interestLevel: any) => {
    setInterestVotes(prev => ({
      ...prev,
      [id]: { ...prev[id], interestLevel }
    }));
  };
  
  // Reset all votes
  const handleReset = () => {
    setInterestVotes({});
  };
  
  // Show current votes in console
  const handleShowVotes = () => {
    console.log('Current votes:', interestVotes);
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Project Interest Ranking Test
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            onClick={handleShowVotes} 
            sx={{ mr: 1 }}
          >
            Log Votes
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleReset}
          >
            Reset
          </Button>
        </Box>
      </Box>
      
      {/* Render the ProjectInterestRanking component with mock data */}
      <ProjectInterestRanking
        projects={mockProjects}
        interestVotes={interestVotes}
        onSetInterest={handleSetInterest}
        userRole="contributor"
      />
    </Container>
  );
};

export default TestProjectInterestRanking;
