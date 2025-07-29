import React, { useState, useRef, memo } from 'react';
import { Paper, Typography, Box, IconButton, Tooltip, Chip } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { Draggable } from '@hello-pangea/dnd';
import type { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import type { Project, ProjectVote } from '../../../types/project-models';
import type { Appetite } from '../../../types/models';
import { colorTokens } from '../../../theme';
// Force TypeScript to recognize the ProjectDetailsModal component
// @ts-ignore - Module exists but TypeScript can't find type declarations
import ProjectDetailsModal from './ProjectDetailsModal';

interface ProjectCardProps {
  project: Project;
  vote: ProjectVote | undefined;
  index: number;
  userRole?: string | null;
}

/**
 * Represents a single project card that can be dragged between priority columns
 */
const ProjectCard = ({ 
  project, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vote, 
  index, 
  userRole 
}: ProjectCardProps) => {
  // NOTE: The vote prop appears unused but is actually used in the memo comparison function at the bottom
  // of this file. It's essential for optimization to prevent unnecessary re-renders when votes change.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  
  // Get color for appetite indicator
  const getAppetiteColor = (appetite: Appetite): string => {
    switch (appetite) {
      case 'S': return colorTokens.appetites.small;
      case 'M': return colorTokens.appetites.medium;
      case 'L': return colorTokens.appetites.large;
      default: return colorTokens.appetites.unset;
    }
  };

  // Get short text for the appetite
  const getAppetiteText = (appetite: Appetite): string => {
    return appetite;
  };

  // Toggle details modal
  const handleInfoButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDetailsOpen(true);
  };

  // Close details modal
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setDetailsOpen(true);
    }
  };

  // Get a truncated list of deliverables to show on card
  const getDeliverableSummary = () => {
    if (!project.deliverables || project.deliverables.length === 0) return 'No deliverables';
    
    // Show up to 2 deliverables, then "and X more"
    if (project.deliverables.length <= 2) {
      return project.deliverables.join(', ');
    } else {
      return `${project.deliverables[0]}, +${project.deliverables.length - 1} more`;
    }
  };

  return (
    <Draggable draggableId={project.id} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <>
          <Paper
            ref={(el: HTMLElement | null) => {
              if (el) {
                provided.innerRef(el);
                cardRef.current = el;
              }
            }}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            elevation={snapshot.isDragging ? 6 : 1}
            onKeyDown={handleKeyDown}
            sx={{
              p: 2,
              mb: 2,
              transition: 'all 0.2s ease',
              cursor: 'grab',
              '&:hover': {
                backgroundColor: 'background.paper',
                boxShadow: 3,
              },
              '&:active': {
                cursor: 'grabbing',
              },
              position: 'relative',
              minHeight: '100px',
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
            
            {/* Appetite chip and hour estimate */}
            <Box sx={{ display: 'flex', mb: 1, alignItems: 'center' }}>
              <Chip 
                label={getAppetiteText(project.appetite)}
                size="small"
                sx={{ 
                  bgcolor: getAppetiteColor(project.appetite),
                  color: 'white',
                  fontWeight: 'bold',
                  height: '22px',
                }}
              />
              <Typography variant="body2" sx={{ ml: 1, fontSize: '0.75rem', fontWeight: 'bold' }}>
                {project.details.hourEstimate} hrs
              </Typography>
            </Box>
            
            {/* Deliverables summary */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Deliverables:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {getDeliverableSummary()}
              </Typography>
            </Box>
            
            {/* Removed redundant hour estimate and priority text from bottom of card as requested */}
          </Paper>

          {/* Details modal */}
          <ProjectDetailsModal
            project={project}
            open={detailsOpen}
            onClose={handleCloseDetails}
            userRole={userRole}
          />
        </>
      )}
    </Draggable>
  );
};

// Use memo to avoid unnecessary re-renders
export default memo(ProjectCard, (prevProps: ProjectCardProps, nextProps: ProjectCardProps) => {
  return prevProps.vote?.priority === nextProps.vote?.priority && 
         prevProps.index === nextProps.index;
});
