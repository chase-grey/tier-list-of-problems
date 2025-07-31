import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Paper, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import type { Project } from './types';
import { useState, useEffect, useRef } from 'react';

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  // Track whether this card is being dragged
  const [isBeingDragged, setIsBeingDragged] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  // Make card draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  });
  
  // Make card droppable for reordering
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: project.id,
  });
  
  // Combine the refs
  const setRefs = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDroppableRef(node);
    cardRef.current = node;
  };

  // Update dragging state when it changes
  useEffect(() => {
    setIsBeingDragged(isDragging);
    
    // When drag ends, we need a small delay before transitions are re-enabled
    // This prevents the "jumping" animation when cards reposition
    if (!isDragging) {
      const timer = setTimeout(() => {
        if (cardRef.current) {
          // Re-enable transitions after the DOM has settled
          cardRef.current.style.transition = 'all 0.2s ease';
        }
      }, 50); // Small delay to ensure positions are updated first
      
      return () => clearTimeout(timer);
    } else if (cardRef.current) {
      // Disable transitions during drag to prevent animation conflicts
      cardRef.current.style.transition = 'none';
    }
  }, [isDragging]);

  // Toggle details modal (placeholder for future functionality)
  const handleInfoButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDetailsOpen(true);
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setDetailsOpen(true);
    }
  };

  return (
    <Paper
      ref={setRefs}
      {...listeners}
      {...attributes}
      elevation={isBeingDragged ? 6 : 1}
      onKeyDown={handleKeyDown}
      sx={{
        p: 2,
        mb: 1,
        // Transitions will be managed via JS in the useEffect to prevent animation issues
        transition: isBeingDragged ? 'none' : 'all 0.2s ease',
        cursor: isBeingDragged ? 'grabbing' : 'grab',
        '&:hover': {
          backgroundColor: 'background.paper',
          boxShadow: 3,
        },
        position: 'relative',
        minHeight: '100px',
        // Using translate3d for hardware acceleration and smoother animations
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isBeingDragged ? 1000 : 1,
        // Prevent text selection during drag operations
        userSelect: 'none',
        // Improve positioning accuracy
        transformOrigin: '0 0',
      }}
      role="button"
      tabIndex={0}
      aria-expanded={detailsOpen}
      aria-label={`Project: ${project.title}`}
    >
      {/* Top section with title and info button */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mr: 1,
            fontWeight: 'bold',
            // Ensure text wraps to avoid overflow
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        >
          {project.title}
        </Typography>
        <Tooltip title="View details">
          <IconButton 
            size="small" 
            onClick={handleInfoButtonClick}
            aria-label="View project details"
            sx={{ 
              color: 'primary.main',
              p: 0.5,
              mt: -0.5,
              flexShrink: 0,
            }}
          >
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Description */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          {project.description}
        </Typography>
      </Box>
    </Paper>
  );
}
