import { useState, useReducer, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import type { DropResult } from '@hello-pangea/dnd';
import ProjectBoard from './ProjectBoard';
import type { Project, ProjectVote, ProjectPriority } from '../../types/project-models';

interface ProjectPriorityAppProps {
  projects: Project[];
  initialVotes?: Record<string, ProjectVote>;
  userRole?: string;
  onSaveVotes?: (votes: Record<string, ProjectVote>) => void;
}

// Simple reducer for vote state management
type VoteAction = 
  | { type: 'SET_PRIORITY'; projectId: string; priority: ProjectPriority }
  | { type: 'UNSET_PRIORITY'; projectId: string }
  | { type: 'RESET_ALL' };

function votesReducer(state: Record<string, ProjectVote>, action: VoteAction): Record<string, ProjectVote> {
  switch (action.type) {
    case 'SET_PRIORITY': {
      return {
        ...state,
        [action.projectId]: {
          projectId: action.projectId,
          priority: action.priority,
          timestamp: Date.now()
        }
      };
    }
    case 'UNSET_PRIORITY': {
      const newState = { ...state };
      delete newState[action.projectId];
      return newState;
    }
    case 'RESET_ALL': {
      return {};
    }
    default:
      return state;
  }
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
  // State for user's votes
  const [votes, dispatchVote] = useReducer(votesReducer, initialVotes);
  
  // Export functionality was removed, only keeping error state for UI feedback if needed
  const [exportError] = useState<string | null>(null);
  
  // Effect to save votes whenever they change
  useEffect(() => {
    if (onSaveVotes) {
      onSaveVotes(votes);
    }
  }, [votes, onSaveVotes]);
  
  // Handle when a project card is dragged to a priority column
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    
    // If dropped outside a droppable area, do nothing
    if (!destination) return;
    
    const dropId = destination.droppableId;
    
    // Handle drop in different columns
    if (dropId.startsWith('priority-')) {
      // Extract priority from column id (format: priority-highest-priority, etc.)
      const priorityParts = dropId.replace('priority-', '').split('-');
      const priority = priorityParts.join(' ') as ProjectPriority;
      
      // Update vote
      dispatchVote({
        type: 'SET_PRIORITY',
        projectId: draggableId,
        priority
      });
    } else if (dropId === 'unsorted') {
      // If dropped in unsorted, remove priority
      dispatchVote({
        type: 'UNSET_PRIORITY',
        projectId: draggableId
      });
    }
  };
  
  // Export functionality removed as it's not currently being used

  // Project counting code removed as it's not being used

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Remove the header section with instructions and export CSV button as requested */}
      
      {/* Show error alert if export fails (keeping this for functionality) */}
      {exportError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {exportError}
        </Alert>
      )}
      
      <Box sx={{ height: '100%', pt: 0 }}>
        <ProjectBoard 
          projects={projects} 
          votes={votes} 
          onDragEnd={handleDragEnd}
          userRole={userRole} 
        />
      </Box>
    </Box>
  );
};

export default ProjectPriorityApp;
