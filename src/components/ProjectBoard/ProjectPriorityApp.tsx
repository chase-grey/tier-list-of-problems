import { useState, useReducer, useEffect } from 'react';
import { Box, Typography, Button, Paper, Container, Alert } from '@mui/material';
import type { DropResult } from '@hello-pangea/dnd';
import ProjectBoard from './ProjectBoard';
import type { Project, ProjectVote, ProjectPriority } from '../../types/project-models';

interface ProjectPriorityAppProps {
  projects: Project[];
  initialVotes?: Record<string, ProjectVote>;
  userName?: string;
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
  userName = '',
  userRole = '',
  onSaveVotes 
}: ProjectPriorityAppProps) => {
  // State for user's votes
  const [votes, dispatchVote] = useReducer(votesReducer, initialVotes);
  
  // User name state
  const [name, setName] = useState<string>(userName);
  
  // State for export status
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  
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
  
  // Export votes as CSV
  const handleExportCsv = () => {
    try {
      setIsExporting(true);
      setExportError(null);
      
      // Create CSV header
      const headers = ['Project ID', 'Project Title', 'Appetite', 'Priority', 'Hour Estimate'];
      
      // Create CSV rows
      const rows = projects.map(project => {
        const vote = votes[project.id];
        const priority = vote?.priority || 'Unsorted';
        
        return [
          project.id,
          `"${project.title.replace(/"/g, '""')}"`, // Escape quotes in title
          project.appetite,
          priority,
          project.details.hourEstimate
        ].join(',');
      });
      
      // Combine header and rows
      const csv = [headers.join(','), ...rows].join('\n');
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `project-priorities-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsExporting(false);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      setExportError('Failed to export CSV');
      setIsExporting(false);
    }
  };

  // Count how many projects have been prioritized
  const prioritizedCount = Object.keys(votes).length;
  const totalProjects = projects.length;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Project Prioritization
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {prioritizedCount} of {totalProjects} projects prioritized
            </Typography>
            
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleExportCsv}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </Box>
        </Box>
        
        {exportError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {exportError}
          </Alert>
        )}
        
        <Typography variant="body2" sx={{ mb: 3 }}>
          Drag and drop projects into the appropriate priority columns. Your selections will be saved automatically.
        </Typography>
      </Paper>
      
      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <ProjectBoard 
          projects={projects} 
          votes={votes} 
          onDragEnd={handleDragEnd}
          userRole={userRole} 
        />
      </Box>
    </Container>
  );
};

export default ProjectPriorityApp;
