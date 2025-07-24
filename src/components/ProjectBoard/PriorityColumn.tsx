import * as React from 'react';
import { useRef, useEffect, useMemo } from 'react';
import { Paper, Typography, Box, Stack } from '@mui/material';
import { Droppable } from '@hello-pangea/dnd';
import type { DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import { colorTokens } from '../../theme';
import type { Project, ProjectVote, ProjectPriority } from '../../types/project-models';
import ProjectCard from './ProjectCard/ProjectCard';
import { registerDroppable } from '../../utils/enhancedDropDetection';

// Custom colors for priority columns
const PRIORITY_COLORS = {
  'Highest priority': '#e74c3c', // Red
  'High priority': '#f39c12',    // Orange
  'Medium Priority': '#3498db',  // Blue
  'Low priority': '#2ecc71',     // Green
  'Not a priority': '#95a5a6',   // Gray
  'Unsorted': 'background.paper' // Default paper color
};

interface PriorityColumnProps {
  priority: ProjectPriority | null; // null for "Unsorted" column
  projects: Project[];
  votes: Record<string, ProjectVote>;
  columnCount?: number; // Total number of visible columns (6 with unsorted, 5 without)
  userRole?: string | null;
}

/**
 * Represents a priority column in the project voting board
 */
const PriorityColumn = ({ 
  priority, 
  projects, 
  votes, 
  columnCount = 6, 
  userRole 
}: PriorityColumnProps) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const columnId = priority === null ? 'unsorted' : `priority-${priority.replace(/\s+/g, '-').toLowerCase()}`;
  
  // Register this column with the enhanced drop detection system
  useEffect(() => {
    if (columnRef.current) {
      registerDroppable(columnId, columnRef.current);
    }
  }, [columnId]);
  
  const isUnsorted = priority === null;
  
  // Get column title
  const getColumnTitle = () => {
    return isUnsorted ? 'Unsorted' : priority;
  };
  
  const title = getColumnTitle();
  
  // Get background color for the column header
  const getHeaderColor = () => {
    if (isUnsorted) return PRIORITY_COLORS.Unsorted;
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS];
  };
  
  // Get text color for the header - always white for priority columns
  const getHeaderTextColor = () => isUnsorted ? 'text.primary' : 'white';

  // Filter and sort projects that belong to this column
  const filteredProjects = useMemo(() => {
    // Filter projects that belong to this column
    const filtered = projects.filter(project => {
      if (isUnsorted) {
        // Show in unsorted if it doesn't have a priority assigned
        return !votes[project.id]?.priority;
      } 
      // Show in specific priority column if its priority matches
      return votes[project.id]?.priority === priority;
    });
    
    // For unsorted column, randomize the order to ensure more even data collection
    // For priority columns, maintain timestamp order
    if (isUnsorted) {
      // Fisher-Yates shuffle algorithm for truly random order
      return [...filtered].sort(() => Math.random() - 0.5);
    } else {
      // Sort by timestamp (oldest first, newest last)
      return filtered.sort((a, b) => {
        const timestampA = votes[a.id]?.timestamp || 0;
        const timestampB = votes[b.id]?.timestamp || 0;
        return timestampA - timestampB;
      });
    }
  }, [projects, votes, isUnsorted, priority]);

  return (
    <Box 
      sx={{ 
        width: `calc((100% - ${(columnCount - 1) * 2}px) / ${columnCount})`, // Dynamic width based on column count
        minWidth: '200px', // Minimum usable width
        mx: 1, // Margin on both sides for spacing
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      role="region"
      aria-label={`${title} column`}
    >
      {/* Column header */}
      <Paper 
        sx={{
          p: 1,
          mb: 1,
          backgroundColor: getHeaderColor(),
          color: getHeaderTextColor(),
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      >
        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
          {title} ({filteredProjects.length})
        </Typography>
      </Paper>
      
      {/* Droppable area */}
      <Droppable droppableId={columnId}>
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <Paper
            ref={(el) => {
              provided.innerRef(el);
              if (el) columnRef.current = el;
            }}
            {...provided.droppableProps}
            sx={{
              p: 1,
              flexGrow: 1,
              backgroundColor: snapshot.isDraggingOver 
                ? 'action.hover' 
                : 'background.paper',
              overflowY: 'auto',
              transition: 'background-color 0.2s ease',
              border: filteredProjects.length === 0 
                ? '2px dashed rgba(0,0,0,0.1)' 
                : 'none',
              display: 'flex',
              flexDirection: 'column'
            }}
            aria-roledescription="droppable region"
          >
            {filteredProjects.length === 0 && !snapshot.isDraggingOver && (
              <Typography 
                sx={{ 
                  textAlign: 'center', 
                  color: 'text.secondary',
                  py: 2 
                }}
              >
                Drop projects here
              </Typography>
            )}
            
            <Stack spacing={1}>
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  vote={votes[project.id]}
                  index={index}
                  userRole={userRole}
                />
              ))}
            </Stack>
            
            {provided.placeholder}
          </Paper>
        )}
      </Droppable>
    </Box>
  );
};

export default React.memo(PriorityColumn);
