import React, { useState, useRef, memo } from 'react';
import { Paper, Typography, Box, IconButton, Tooltip, Link } from '@mui/material';
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

  
  
  // Format the project ID with or without a hyperlink based on user role
  const getFormattedProjectId = () => {
    const url = `https://emc2summary/GetSummaryReport.ashx/track/ZQN/${project.id}`;
    
    // For customers, just return the ID as plain text
    if (userRole === 'customer') {
      return <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{project.id}</Typography>;
    }
    
    // For all other users, return a hyperlink
    return (
      <Link 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        sx={{ fontWeight: 'medium' }}
      >
        {project.id}
      </Link>
    );
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

  // Get deliverables list to display on card
  const getDeliverablesList = () => {
    if (!project.deliverables || project.deliverables.length === 0) {
      return <Typography variant="body2">No deliverables</Typography>;
    }
    
    return (
      <Box component="ul" sx={{ pl: 2, m: 0, width: '100%' }}>
        {project.deliverables.map((deliverable, index) => (
          <Typography 
            component="li" 
            key={index} 
            variant="body2" 
            sx={{ 
              fontSize: '0.8rem',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              width: '100%'
            }}
          >
            {deliverable}
          </Typography>
        ))}
      </Box>
    );
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
              height: 'auto', // Allow height to grow based on content
              display: 'flex',
              flexDirection: 'column',
            }}
            role="button"
            tabIndex={0}
            aria-expanded={detailsOpen}
            aria-label={`Project: ${project.title}`}
          >
            {/* Project ID, Appetite indicator, Hours and Info Button in one row */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: 0.75,
              width: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}>
                {/* Project ID */}
                {getFormattedProjectId()}
                
                {/* Appetite indicator circle */}
                <Box 
                  sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%',
                    bgcolor: getAppetiteColor(project.appetite),
                    display: 'inline-block',
                    flexShrink: 0,
                    ml: 0.5
                  }}
                  title={`Appetite: ${project.appetite}`}
                />
                
                {/* Hour estimate */}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {project.details.hourEstimate} hrs
                </Typography>
              </Box>
              
              {/* Info Button */}
              <Tooltip title="View details">
                <IconButton 
                  size="small" 
                  onClick={handleInfoButtonClick}
                  aria-label="View project details"
                  sx={{ 
                    color: 'primary.main',
                    p: 0.5,
                    ml: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <InfoOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Project Title */}
            <Typography 
              variant="subtitle1" 
              sx={{ 
                mb: 1,
                fontWeight: 'bold',
                // Ensure text wraps to avoid overflow
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                width: '100%',
              }}
            >
              {project.title}
            </Typography>
            
            {/* Deliverables list */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 0.5,
              width: '100%',
              flexGrow: 1, // Allow this section to grow to fit content
            }}>
              <Typography variant="caption" color="text.secondary">
                Deliverables:
              </Typography>
              {getDeliverablesList()}
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
