import { useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import KanbanBoard from './KanbanBoard';
import { convertProjectsToTaskItems } from './KanbanData';
import type { Project, ProjectVote } from '../../types/project-models';

interface ProjectPriorityAppProps {
  projects: Project[];
  initialVotes?: Record<string, ProjectVote>;
  userRole?: string;
  onSaveVotes?: (votes: Record<string, ProjectVote>) => void;
}



/**
 * Main component for the Project Prioritization Poll
 */
const ProjectPriorityApp = ({ 
  projects, 
  initialVotes = {}, 
  userRole = '',
  onSaveVotes 
}: ProjectPriorityAppProps) => {
  // State for user's votes - initialize from props 
  const [votes] = useState(initialVotes);
  
  // Effect to save votes on initial load only
  useEffect(() => {
    if (onSaveVotes) {
      onSaveVotes(votes);
    }
    // Only run once on component mount or when onSaveVotes changes
  }, [onSaveVotes]);

  // Convert projects to task items format needed by KanbanBoard
  const taskItems = useMemo(() => {
    // Pass the votes directly to the convertProjectsToTaskItems function
    // since it expects a record of ProjectVote objects
    return convertProjectsToTaskItems(projects, votes);
  }, [projects, votes]);

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden' }}>

      

      
      <Box sx={{ 
        width: '100%', 
        height: 'calc(100vh - 64px)', 
        bgcolor: '#000000',
        position: 'absolute',
        left: 0,
        right: 0,
        top: 64, // Account for header height
        bottom: 0,
        overflow: 'hidden'
      }}>

        <KanbanBoard 
          taskItems={taskItems} 
          userRole={userRole} 
        />
      </Box>
    </Box>
  );
};

export default ProjectPriorityApp;
