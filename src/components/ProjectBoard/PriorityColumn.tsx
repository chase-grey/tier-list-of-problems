import * as React from 'react';
import { useRef, useEffect, useMemo, useState } from 'react';
import { Paper, Typography, Box, Stack } from '@mui/material';
import { Droppable } from '@hello-pangea/dnd';
import type { DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import type { Project, ProjectVote, ProjectPriority } from '../../types/project-models';
import ProjectCard from './ProjectCard/ProjectCard';
import { registerDroppable } from '../../utils/enhancedDropDetection';

// Custom colors for priority columns - using different shades of grayish-green as requested
const PRIORITY_COLORS = {
  'Highest priority': '#496A5C', // Darkest shade of grayish-green
  'High priority': '#5E8272',    // Dark shade of grayish-green
  'Medium Priority': '#739A89',  // Medium shade of grayish-green
  'Low priority': '#88B19F',     // Light shade of grayish-green
  'Not a priority': '#9DC9B6',   // Lightest shade of grayish-green
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
  
  // State for shadow visibility
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  
  // Check if scrolling is possible and update shadow visibility
  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      
      // Show top shadow only when scrolled down from top
      setShowTopShadow(scrollTop > 0);
      
      // Show bottom shadow only when there's more content below to scroll to
      // The -1 accounts for potential rounding errors
      setShowBottomShadow(scrollTop < scrollHeight - clientHeight - 1);
    }
  };
  
  // Check scrollability on mount and window resize
  useEffect(() => {
    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);
    
    // Initial check after a short delay to ensure content is rendered
    const timer = setTimeout(checkScrollability, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);
  
  // Recheck whenever projects change
  useEffect(() => {
    const timer = setTimeout(checkScrollability, 100);
    return () => clearTimeout(timer);
  }, [filteredProjects.length]);

  return (
    <Box 
      sx={{ 
        width: `calc(100% / ${columnCount})`, // Simplified width calculation for equal distribution
        minWidth: '180px', // Minimum width to ensure all columns fit
        height: '100%',
        px: 0.5, // Use padding instead of margin to prevent width calculation issues
        display: 'flex',
        flexDirection: 'column'
      }}
      role="region"
      aria-label={`${title} column`}
    >
      {/* Column header - completely separate from droppable area */}
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
      
      {/* Separate box to contain the droppable area */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Droppable area starts here - completely separate from the header */}
        <Droppable droppableId={columnId}>
          {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
            <Box
              sx={{
                flexGrow: 1,
                height: '100%',
                backgroundColor: snapshot.isDraggingOver 
                  ? 'action.hover' 
                  : 'background.paper',
                transition: 'background-color 0.2s ease',
                border: filteredProjects.length === 0 
                  ? '2px dashed rgba(0,0,0,0.1)' 
                  : 'none',
                // This wrapper needs position relative but WITHOUT overflow hidden
                position: 'relative',
              }}
            >
              {/* Simplified direct implementation of scroll shadows */}
              {/* Top shadow debug box - only visible when scrolled down */}
              <Box 
                sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '30px',
                  backgroundColor: '#ff0000', // Bright red for debugging
                  opacity: showTopShadow ? 1 : 0,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />
                
              {/* Scrollable container */}
              <Box
                ref={scrollContainerRef}
                onScroll={checkScrollability}
                sx={{
                  height: '100%',
                  width: '100%',
                  overflowY: 'auto',
                  position: 'relative',
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  },
                }}
                >
                  <Paper
                    ref={(el) => {
                      provided.innerRef(el);
                      if (el) columnRef.current = el;
                    }}
                    {...provided.droppableProps}
                    sx={{
                      p: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                    }}
                    aria-roledescription="droppable region"
                  >
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
                      {/* Keep placeholder inside the stack for proper positioning */}
                      {provided.placeholder}
                    </Stack>
                  </Paper>
                </Box>
                
                {/* Bottom shadow debug box - only visible when more content below */}
                <Box
                  sx={{ 
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '30px',
                    backgroundColor: '#00ff00', // Bright green for debugging
                    opacity: showBottomShadow ? 1 : 0,
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                />
            </Box>
          )}
        </Droppable>
      </Box>
    </Box>
  );
};

export default React.memo(PriorityColumn);
