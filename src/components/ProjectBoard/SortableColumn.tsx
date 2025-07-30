import React, { useMemo, useState, useEffect } from 'react';
import { Paper, Typography, Box, Stack } from '@mui/material';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Project, ProjectVote, ProjectPriority } from '../../types/project-models';
import ProjectCard from './ProjectCard/ProjectCard';
import DropIndicator from '../common/DropIndicator';

// Custom colors for priority columns - using different shades of grayish-green as requested
const PRIORITY_COLORS = {
  'Highest priority': '#496A5C', // Darkest shade of grayish-green
  'High priority': '#5E8272',    // Dark shade of grayish-green
  'Medium Priority': '#739A89',  // Medium shade of grayish-green
  'Low priority': '#88B19F',     // Light shade of grayish-green
  'Not a priority': '#9DC9B6',   // Lightest shade of grayish-green
  'Unsorted': 'background.paper' // Default paper color
};

interface SortableColumnProps {
  priority: ProjectPriority | null; // null for "Unsorted" column
  projects: Project[];
  votes: Record<string, ProjectVote>;
  columnCount?: number; // Total number of visible columns
  userRole?: string | null;
}

/**
 * Represents a priority column in the project voting board with dnd-kit sorting capabilities
 */
const SortableColumn = ({ 
  priority, 
  projects, 
  votes, 
  columnCount = 6, 
  userRole 
}: SortableColumnProps) => {
  // State to track where drop indicators should appear
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isActiveDrop, setIsActiveDrop] = useState(false);
  const isUnsorted = priority === null;
  const columnId = isUnsorted ? 'unsorted' : `priority-${priority.replace(/\s+/g, '-').toLowerCase()}`;
  
  // Set up the droppable area using dnd-kit
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: {
      type: 'column',
      priority
    }
  });
  
  // Get column title
  const title = isUnsorted ? 'Unsorted' : priority;
  
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
    
    // For unsorted column, use deterministic order based on project ID
    // For priority columns, maintain consistent ordering
    if (isUnsorted) {
      // Deterministic sort based on project ID to prevent random reordering on render
      return [...filtered].sort((a, b) => a.id.localeCompare(b.id));
    } else {
      // Sort by both position (primary) and timestamp (secondary fallback)
      return filtered.sort((a, b) => {
        const posA = votes[a.id]?.position ?? Number.MAX_SAFE_INTEGER;
        const posB = votes[b.id]?.position ?? Number.MAX_SAFE_INTEGER;
        
        // If positions are different, use them
        if (posA !== posB) {
          return posA - posB;
        }
        
        // Otherwise use timestamp as fallback
        const timestampA = votes[a.id]?.timestamp || 0;
        const timestampB = votes[b.id]?.timestamp || 0;
        return timestampA - timestampB;
      });
    }
  }, [projects, votes, isUnsorted, priority]);
  
  // Generate unique and stable sortable IDs for each project in this column
  const sortableItemIds = useMemo(() => {
    return filteredProjects.map(project => project.id);
  }, [filteredProjects]);

  // Monitor drag events to update drop indicators
  useDndMonitor({
    onDragOver({ over, active }) {
      if (!over) {
        setDropIndicatorIndex(null);
        setIsActiveDrop(false);
        return;
      }
      
      // If dragging over this column
      if (over.id === columnId) {
        setIsActiveDrop(true);
        setDropTargetId(String(active.id));
        
        const projectCards = Array.from(document.querySelectorAll(`[data-droppable-id="${columnId}"] .project-card`));
        
        if (projectCards.length === 0) {
          setDropIndicatorIndex(0);
          return;
        }
        
        // Get mouse position
        const mouseY = active.rect.current.translated?.top || 0;
        // Get vertical movement direction - with type safety
        const mouseVelocityY = (active as any).delta?.y || 0;
        
        // Calculate closest index with improved accuracy
        let closestIndex = -1;
        let minDistance = Number.MAX_VALUE;
        
        projectCards.forEach((card, index) => {
          const rect = card.getBoundingClientRect();
          // Consider full card height for more accurate positioning
          const cardMiddleY = rect.top + rect.height / 2;
          const distance = Math.abs(mouseY - cardMiddleY);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });
        
        // Apply more sophisticated positioning algorithm
        if (closestIndex >= 0) {
          const closestRect = projectCards[closestIndex].getBoundingClientRect();
          const cardHeight = closestRect.height;
          
          // Apply hysteresis to prevent jitter - only update position if:
          // 1. Mouse is clearly above/below the middle (25% threshold)
          // 2. Consider movement direction for more natural behavior
          const relativePosition = (mouseY - closestRect.top) / cardHeight;
          const isAbove = relativePosition < 0.5;
          
          // If we're very close to the boundary and moving against it, prefer current position
          const isNearBoundary = Math.abs(relativePosition - 0.5) < 0.1;
          const isMovingDown = mouseVelocityY > 0;
          const isMovingUp = mouseVelocityY < 0;
          
          // Determine final indicator position with hysteresis
          let finalPosition;
          if (isNearBoundary) {
            if (isMovingDown && !isAbove) {
              finalPosition = closestIndex + 1;
            } else if (isMovingUp && isAbove) {
              finalPosition = closestIndex;
            } else {
              finalPosition = isAbove ? closestIndex : closestIndex + 1;
            }
          } else {
            finalPosition = isAbove ? closestIndex : closestIndex + 1;
          }
          
          setDropIndicatorIndex(finalPosition);
        } else {
          setDropIndicatorIndex(0);
        }
      } else {
        // Not dragging over this column anymore
        setIsActiveDrop(false);
      }
    },
    onDragEnd() {
      setDropIndicatorIndex(null);
      setIsActiveDrop(false);
      setDropTargetId(null);
    },
    onDragCancel() {
      setDropIndicatorIndex(null);
      setIsActiveDrop(false);
      setDropTargetId(null);
    }
  });
  
  // Reset indicators when component unmounts
  useEffect(() => {
    return () => {
      setDropIndicatorIndex(null);
      setIsActiveDrop(false);
      setDropTargetId(null);
    };
  }, []);
  
  // This section has been moved before the useDndMonitor hook to fix the reference order
  // It is now located above the sortableItemIds constant

  return (
    <Box 
      sx={{ 
        width: `calc(100% / ${columnCount})`, 
        minWidth: '180px',
        height: '100%',
        px: 0.5,
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
      <Paper
        ref={setNodeRef}
        sx={{
          p: 1,
          flexGrow: 1,
          backgroundColor: isOver 
            ? 'rgba(144, 202, 249, 0.08)' 
            : 'background.paper',
          overflowY: 'auto',
          transition: 'background-color 0.3s ease',
          border: filteredProjects.length === 0 
            ? '2px dashed rgba(0,0,0,0.1)' 
            : isOver 
              ? '2px dashed rgba(25, 118, 210, 0.3)' 
              : 'none',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        aria-roledescription="droppable region"
      >
        {filteredProjects.length === 0 && !isOver && (
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
        
        <SortableContext 
          items={sortableItemIds}
          strategy={verticalListSortingStrategy}
        >
          <Stack spacing={1} className="project-column-stack" data-droppable-id={columnId}>
            {/* Add invisible spacer only in empty columns to set the correct initial drop position */}
            {filteredProjects.length === 0 && (
              <Box sx={{ height: '38px', width: '100%', visibility: 'hidden' }} />
            )}
            {/* Insert drop indicator at the top if needed */}
            {dropIndicatorIndex === 0 && isOver && (
              <Box sx={{ position: 'relative', height: '2px', mb: 1 }}>
                <DropIndicator isVisible={true} isAnimated={isActiveDrop} />
              </Box>
            )}
            
            {filteredProjects.map((project, index) => {
              // Used to determine if this card is being dragged
              const isDragTarget = dropTargetId === project.id;
              
              return (
                <React.Fragment key={project.id}>
                  <Box 
                    className="project-card" 
                    sx={{ 
                      opacity: isDragTarget && isOver ? 0.4 : 1,
                      // Remove the transform that was causing the jump
                      transform: 'translateY(0)',
                      // Keep the opacity transition but remove the transform transition
                      transition: 'opacity 200ms ease',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    <ProjectCard
                      project={project}
                      vote={votes[project.id]}
                      index={index}
                      userRole={userRole}
                    />
                  </Box>
                  
                  {/* Insert drop indicator after this card if needed */}
                  {dropIndicatorIndex === index + 1 && isOver && (
                    <Box 
                      sx={{ 
                        position: 'relative', 
                        height: '4px', 
                        my: 1,
                        zIndex: 5 
                      }}
                    >
                      <DropIndicator isVisible={true} isAnimated={isActiveDrop} />
                    </Box>
                  )}
                </React.Fragment>
              );
            })}
            
            {/* Empty columns no longer show text - just a clean empty space */}
          </Stack>
        </SortableContext>
      </Paper>
    </Box>
  );
};

// Use memo to prevent unnecessary re-renders when other columns change
export default React.memo(SortableColumn, (prevProps, nextProps) => {
  // Custom comparison function that only re-renders if:
  // 1. The priority changes
  // 2. The number of filtered projects changes
  // 3. The votes for projects in this column change
  
  // First check if priority changed
  if (prevProps.priority !== nextProps.priority) {
    return false; // priority changed, should re-render
  }
  
  // Get projects for this column
  const isUnsorted = prevProps.priority === null;
  const getRelevantProjects = (props: SortableColumnProps) => {
    if (isUnsorted) {
      return props.projects.filter(p => !props.votes[p.id]?.priority);
    } else {
      return props.projects.filter(p => props.votes[p.id]?.priority === props.priority);
    }
  };
  
  const prevProjects = getRelevantProjects(prevProps);
  const nextProjects = getRelevantProjects(nextProps);
  
  // Check if number of projects changed
  if (prevProjects.length !== nextProjects.length) {
    return false; // count changed, should re-render
  }
  
  // Check if any vote details changed for projects in this column
  for (const project of nextProjects) {
    const prevVote = prevProps.votes[project.id];
    const nextVote = nextProps.votes[project.id];
    
    if (!prevVote && !nextVote) continue; // neither has votes, skip
    if (!prevVote || !nextVote) return false; // one has votes but other doesn't, should re-render
    
    // Check if position or timestamp changed
    if (prevVote.position !== nextVote.position || 
        prevVote.timestamp !== nextVote.timestamp) {
      return false; // vote details changed, should re-render
    }
  }
  
  // If we reached here, nothing important changed, no need to re-render
  return true;
});
