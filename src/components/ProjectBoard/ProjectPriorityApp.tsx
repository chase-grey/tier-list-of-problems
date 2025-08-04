import { useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import KanbanBoard from './KanbanBoard';
import { convertProjectsToTaskItems } from './KanbanData';
import type { Project, ProjectVote, ProjectPriority } from '../../types/project-models';

interface ProjectPriorityAppProps {
  projects: Project[];
  initialVotes?: Record<string, ProjectVote>;
  userRole?: string;
  onSaveVotes?: (votes: Record<string, ProjectVote>) => void;
  onColumnCountsChange?: (counts: {
    unsorted: number;
    ranked: number; // Sum of highest, high, medium, low columns
    total: number; // Sum of all columns
  }) => void;
}



/**
 * Main component for the Project Prioritization Poll
 */
const ProjectPriorityApp = ({ 
  projects, 
  initialVotes = {}, 
  userRole = '',
  onSaveVotes,
  onColumnCountsChange
}: ProjectPriorityAppProps) => {
  // State for user's votes - initialize from props 
  const [votes, setVotes] = useState(initialVotes);
  
  // Effect to save votes when they change
  // Add a short delay to prevent excessive updates
  useEffect(() => {
    // Make sure onSaveVotes exists and we have votes to save
    if (onSaveVotes && Object.keys(votes).length > 0) {
      // Add a short debounce to prevent excessive updates
      const handler = setTimeout(() => {
        console.log('Saving votes to App state:', votes);
        onSaveVotes(votes);
      }, 300);
      
      // Clean up timeout on unmount
      return () => clearTimeout(handler);
    }
  }, [votes, onSaveVotes]);

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
          onColumnsChange={(columnCounts) => {
            // Calculate ranked and total counts
            const ranked = columnCounts.highest + columnCounts.high + 
                         columnCounts.medium + columnCounts.low;
            const total = ranked + columnCounts.unsorted;
            
            // Update project votes based on current column positions
            const newVotes = {...votes};
            
            // For each project in each priority column, update its vote
            Object.entries(columnCounts).forEach(([columnName, count]) => {
              // Skip processing if the column is empty
              if (count === 0) return;
              
              // Find the items in this column from taskItems
              const columnItems = taskItems.filter(item => {
                // Map column names to status values
                let status = '';
                if (columnName === 'unsorted') status = 'To-Do';
                else if (columnName === 'highest') status = 'Highest';
                else if (columnName === 'high') status = 'High';
                else if (columnName === 'medium') status = 'Medium';
                else if (columnName === 'low') status = 'Low';
                
                return item.Status === status;
              });
              
              // Update votes for each item in this column
              columnItems.forEach(item => {
                if (columnName !== 'unsorted') {
                  // Convert column name to a proper ProjectPriority type
                  let priority: ProjectPriority = 'Medium Priority';
                  
                  if (columnName === 'highest') priority = 'Highest priority';
                  else if (columnName === 'high') priority = 'High priority';
                  else if (columnName === 'medium') priority = 'Medium Priority';
                  else if (columnName === 'low') priority = 'Low priority';
                  
                  newVotes[item.id] = { projectId: item.id, priority: priority };
                } else {
                  // Remove vote for unsorted projects
                  if (newVotes[item.id]) {
                    delete newVotes[item.id];
                  }
                }
              });
            });
            
            // Update votes state
            setVotes(newVotes);
            
            // Report counts to parent component if callback exists
            if (onColumnCountsChange) {
              onColumnCountsChange({
                unsorted: columnCounts.unsorted,
                ranked,
                total
              });
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default ProjectPriorityApp;
