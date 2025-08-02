import { useState, useEffect, useMemo } from 'react';
import { Box, Alert } from '@mui/material';
// Import KanbanBoard instead of ProjectBoard for consistent UI
import KanbanBoard from './KanbanBoard';
import { convertProjectsToTaskItems } from './KanbanData';
import type { Project, ProjectVote, ProjectPriority } from '../../types/project-models';

interface ProjectPriorityAppProps {
  projects: Project[];
  initialVotes?: Record<string, ProjectVote>;
  userRole?: string;
  onSaveVotes?: (votes: Record<string, ProjectVote>) => void;
}

// Note: The vote management logic has been simplified since we're now using KanbanBoard's internal drag-and-drop handling

/**
 * Main component for the Project Prioritization Poll
 */
const ProjectPriorityApp = ({ 
  projects, 
  initialVotes = {}, 
  userRole = '',
  onSaveVotes 
}: ProjectPriorityAppProps) => {
  // State for user's votes
  // Using direct state instead of reducer since we're not updating it directly anymore
  const [votes] = useState(initialVotes);
  
  // Export functionality was removed, only keeping error state for UI feedback if needed
  const [exportError] = useState<string | null>(null);
  
  // Effect to save votes whenever they change
  useEffect(() => {
    if (onSaveVotes) {
      onSaveVotes(votes);
    }
  }, [votes, onSaveVotes]);
  
  // KanbanBoard has its own internal drag handling, but we need to update our votes
  // when the KanbanBoard's state changes. We'll implement a callback for this in the future
  // if needed. For now, we'll just rely on the KanbanBoard's internal state.
  
  // Export functionality removed as it's not currently being used

  // Project counting code removed as it's not being used

  // Convert projects to task items format needed by KanbanBoard
  const taskItems = useMemo(() => {
    // Pass the votes directly to the convertProjectsToTaskItems function
    // since it expects a record of ProjectVote objects
    return convertProjectsToTaskItems(projects, votes);
  }, [projects, votes]);

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Remove the header section with instructions and export CSV button as requested */}
      
      {/* Show error alert if export fails (keeping this for functionality) */}
      {exportError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {exportError}
        </Alert>
      )}
      
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
        {/* Use KanbanBoard instead of ProjectBoard for consistent UI */}
        <KanbanBoard 
          taskItems={taskItems} 
          userRole={userRole} 
        />
      </Box>
    </Box>
  );
};

export default ProjectPriorityApp;
