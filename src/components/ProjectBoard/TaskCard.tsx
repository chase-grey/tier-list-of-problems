import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Paper, Typography, Box, IconButton, Tooltip, Link } from "@mui/material";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { type TaskItem } from "./KanbanData";
import { colorTokens } from '../../theme';
import ProjectDetailsModal from './ProjectCard/ProjectDetailsModal';
import { sampleProjects } from '../../data/sampleProjectInterestData';

interface TaskCardProps {
  item: TaskItem;
  index: number;
  userRole?: string | null;
}

/**
 * Get color for appetite indicator based on the priority (which stores the appetite value)
 */
const getAppetiteColor = (appetite: string): string => {
  switch (appetite) {
    case 'S': return colorTokens.appetites.small;
    case 'M': return colorTokens.appetites.medium;
    case 'L': return colorTokens.appetites.large;
    default: return colorTokens.appetites.unset;
  }
};

/**
 * TaskCard component that displays project information in a draggable card
 */
const TaskCard = ({ item, index, userRole }: TaskCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Ensure draggable ID is always a string
  const draggableId = `task-${item.id}`;
  
  // Find the full project data from our sample data using the ID
  const project = sampleProjects.find(p => p.id === item.id);
  
  // Handle info button click to open details modal
  const handleInfoButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDetailsOpen(true);
  };

  // Close details modal
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };
  
  // Format the project ID with or without a hyperlink based on user role
  const getFormattedProjectId = () => {
    const url = `https://emc2summary/GetSummaryReport.ashx/track/ZQN/${item.id}`;
    
    // For customers, just return the ID as plain text
    if (userRole === 'customer') {
      return <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{item.id}</Typography>;
    }
    
    // For all other users, return a hyperlink
    return (
      <Link 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        sx={{ fontWeight: 'medium', color: '#ffffff' }}
      >
        {item.id}
      </Link>
    );
  };
  
  // Render the card only if we found a matching project
  if (!project) {
    // Render a placeholder or fallback card if no project found
    return (
      <Draggable draggableId={draggableId} index={index}>
        {(provided, snapshot) => (
          <Paper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            elevation={1}
            sx={{
              p: 1,
              mb: 0.75,
              borderRadius: '12px',
              backgroundColor: '#333333',
              minHeight: '80px',
            }}
          >
            <Typography variant="subtitle2">{item.task}</Typography>
          </Paper>
        )}
      </Draggable>
    );
  }

  // Render the full project card if project is found
  return (
    <>
      <Draggable draggableId={draggableId} index={index}>
        {(provided, snapshot) => (
          <Paper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            elevation={snapshot.isDragging ? 3 : 1}
            sx={{
              p: 1, 
              mb: 0.75, 
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              cursor: 'grab',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              '&:hover': {
                backgroundColor: '#2d2d2d',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              },
              '&:active': {
                cursor: 'grabbing',
              },
              position: 'relative',
              backgroundColor: snapshot.isDragging ? '#2d2d2d' : '#333333',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '80px',
              opacity: snapshot.isDragging ? 0.8 : 1
            }}
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
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Project Title */}
            <Typography 
              variant="subtitle2" 
              sx={{ 
                mb: 1,
                fontWeight: 'bold',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {item.task}
            </Typography>
            
            {/* Appetite circle and hour estimate */}
            <Box sx={{ display: 'flex', mb: 1, alignItems: 'center' }}>
              <Box 
                sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%',
                  bgcolor: getAppetiteColor(item.priority),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                {item.priority}
              </Box>
              <Typography variant="body2" sx={{ ml: 1, fontSize: '0.75rem', fontWeight: 'bold' }}>
                {project.details.hourEstimate} hrs
              </Typography>
            </Box>
          </Paper>
        )}
      </Draggable>
      
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

export default TaskCard;
