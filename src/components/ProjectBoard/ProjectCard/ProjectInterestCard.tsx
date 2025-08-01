import React, { useState, useRef } from 'react';
import { Paper, Typography, Box, IconButton, Tooltip, Link } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import type { Project } from '../../../types/project-models';
import type { Appetite } from '../../../types/models';
import { colorTokens } from '../../../theme';
import ProjectDetailsModal from './ProjectDetailsModal';

interface ProjectInterestCardProps {
  project: Project;
  userRole?: string | null;
}

/**
 * Non-draggable version of ProjectCard specifically for Project Interest section
 * Removed all drag-and-drop related functionality from ProjectCard
 */
const ProjectInterestCard = ({ 
  project,
  userRole 
}: ProjectInterestCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
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
      <Box component="ul" sx={{ pl: 2, m: 0 }}>
        {project.deliverables.map((deliverable, index) => (
          <Typography component="li" key={index} variant="body2" sx={{ fontSize: '0.8rem' }}>
            {deliverable}
          </Typography>
        ))}
      </Box>
    );
  };

  return (
    <>
      <Paper
        ref={cardRef}
        elevation={1}
        onKeyDown={handleKeyDown}
        component="div"
        sx={{
          p: 2,
          mb: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'background.paper',
            boxShadow: 3,
          },
          position: 'relative',
          minHeight: '100px',
        }}
        role="button"
        tabIndex={0}
        aria-expanded={detailsOpen}
        aria-label={`Project: ${project.title}`}
      >
        {/* Project ID and Info Button */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
          {getFormattedProjectId()}
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
        
        {/* Project Title */}
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: 1,
            fontWeight: 'bold',
            // Ensure text wraps to avoid overflow
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        >
          {project.title}
        </Typography>
        
        {/* Appetite circle and hour estimate */}
        <Box sx={{ display: 'flex', mb: 1, alignItems: 'center' }}>
          <Box 
            sx={{ 
              width: 14, 
              height: 14, 
              borderRadius: '50%',
              bgcolor: getAppetiteColor(project.appetite),
              display: 'inline-block'
            }}
          />
          <Typography variant="body2" sx={{ ml: 1, fontSize: '0.75rem', fontWeight: 'bold' }}>
            {project.details.hourEstimate} hrs
          </Typography>
        </Box>
        
        {/* Deliverables list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Deliverables:
          </Typography>
          {getDeliverablesList()}
        </Box>
      </Paper>

      {/* Details modal */}
      <ProjectDetailsModal
        project={project}
        open={detailsOpen}
        onClose={handleCloseDetails}
        userRole={userRole}
      />
    </>
  );
};

export default ProjectInterestCard;
