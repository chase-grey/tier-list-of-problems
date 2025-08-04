import React, { useState, useRef, memo, useMemo } from 'react';
import { Paper, Typography, Box, IconButton, Tooltip, Link } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { Draggable } from '@hello-pangea/dnd';
import type { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import type { Project, ProjectVote } from '../../../types/project-models';
import { colorTokens } from '../../../theme';
// Force TypeScript to recognize the ProjectDetailsModal component
// @ts-ignore - Module exists but TypeScript can't find type declarations
import ProjectDetailsModal from './ProjectDetailsModal';

interface ProjectCardProps {
  project: Project;
  vote: ProjectVote | undefined;
  index: number; // Needed for @hello-pangea/dnd
  userRole?: string | null;
  isDragging?: boolean; // Added for drag overlay optimization
}

/**
 * Represents a single project card that can be dragged between priority columns
 */
const ProjectCard = ({ 
  project, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vote, 
  index,
  userRole,
  isDragging = false
}: ProjectCardProps) => {
  // NOTE: The vote prop appears unused but is actually used in the memo comparison function at the bottom
  // of this file. It's essential for optimization to prevent unnecessary re-renders when votes change.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  
  // Use useMemo for expensive calculations to prevent recalculation on every render
  const appetiteColor = useMemo(() => {
    switch (project.appetite) {
      case 'S': return colorTokens.appetites.small;
      case 'M': return colorTokens.appetites.medium;
      case 'L': return colorTokens.appetites.large;
      default: return colorTokens.appetites.unset;
    }
  }, [project.appetite]);
  
  // Format the project ID with or without a hyperlink based on user role
  const getFormattedProjectId = () => {
    const url = `https://emc2summary/GetSummaryReport.ashx/track/ZQN/${project.id}`;
    
    // For customers, show the ID as clickable text that opens the details modal
    if (userRole === 'customer') {
      return (
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 'medium',
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' }
          }}
          onClick={handleInfoButtonClick}
        >
          {project.id}
        </Typography>
      );
    }
    
    // For all other users, return a hyperlink with dual functionality:
    // - Ctrl+Click or middle-click: open external link
    // - Regular click: open details modal
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Link 
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            // If Ctrl/Cmd key is pressed, let the browser handle the link normally
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) {
              e.preventDefault();
              handleInfoButtonClick(e as unknown as React.MouseEvent);
            }
          }}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{ fontWeight: 'medium', cursor: 'pointer' }}
        >
          {project.id}
        </Link>
        <Tooltip title="Ctrl+Click to open in new tab">
          <Box 
            component="span" 
            sx={{ 
              fontSize: '0.7rem', 
              ml: 0.5, 
              color: 'text.secondary',
              display: { xs: 'none', sm: 'inline' } // Hide on very small screens
            }}
          >
            ↗
          </Box>
        </Tooltip>
      </Box>
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
      <Box component="ul" sx={{ pl: 2, m: 0, maxWidth: '100%' }}>
        {project.deliverables.map((deliverable, index) => (
          <Typography 
            component="li" 
            key={index} 
            variant="body2" 
            sx={{ 
              fontSize: '0.8rem',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              hyphens: 'auto',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
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
            elevation={isDragging || snapshot.isDragging ? 6 : 1}
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
              width: '100%', // Ensure card takes full width of its container
              boxSizing: 'border-box', // Include padding in width calculation
              overflow: 'hidden', // Prevent content from spilling outside
              wordBreak: 'break-word', // Allow words to break to prevent overflow
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
              flexWrap: 'wrap', // Allow wrapping on very small screens
              gap: 0.5 // Add gap for wrapped items
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                flexGrow: 1, 
                minWidth: 0,
                flexWrap: 'wrap', // Allow wrapping when needed
                overflow: 'hidden' // Prevent content overflow
              }}>
                {/* Project ID - Made more prominent */}
                <Box sx={{ fontWeight: 'bold' }}>
                  {getFormattedProjectId()}
                </Box>
                
                {/* Appetite indicator with text */}
                <Tooltip title={project.appetite === 'L' ? 'Large' : project.appetite === 'M' ? 'Medium' : 'Small'}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: appetiteColor,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }}>
                    {project.appetite}
                  </Box>
                </Tooltip>
                
                {/* Hour estimate - Simplified */}
                <Tooltip title={`Hour estimate: ${project.details.hourEstimate} hours`}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {project.details.hourEstimate} hrs
                  </Typography>
                </Tooltip>
              </Box>
              
              {/* Info Button - Now optional since ID is clickable */}
              <Tooltip title="View details">
                <IconButton 
                  size="small" 
                  onClick={handleInfoButtonClick}
                  aria-label="View project details"
                  sx={{ 
                    color: 'text.secondary', // Made less prominent
                    p: 0.5,
                    ml: 0.5,
                    flexShrink: 0,
                    fontSize: '0.9em', // Slightly smaller
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
                hyphens: 'auto', // Add hyphenation for better text wrapping
                width: '100%', // Ensure full width
                overflow: 'hidden', // Hide overflow
                textOverflow: 'ellipsis' // Show ellipsis for overflow
              }}
            >
              {project.title}
            </Typography>
            
            {/* Deliverables list */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 0.5,
              overflow: 'hidden', // Hide overflow
              width: '100%' // Take full width
            }}>
              <Typography variant="caption" color="text.secondary">
                Deliverables:
              </Typography>
              <Box sx={{ overflow: 'hidden' }}>
                {getDeliverablesList()}
              </Box>
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
  // More comprehensive equality check to prevent unnecessary re-renders
  return prevProps.vote?.priority === nextProps.vote?.priority && 
         prevProps.project.id === nextProps.project.id &&
         prevProps.userRole === nextProps.userRole &&
         prevProps.isDragging === nextProps.isDragging;
});
