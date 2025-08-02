import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Paper, Typography, Box, IconButton, Tooltip, Link } from "@mui/material";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { type TaskItem } from "./KanbanData";
import { colorTokens } from '../../theme';
import ProjectDetailsModal from './ProjectCard/ProjectDetailsModal';
// Use the complete data source with all 29 projects
import { allProjects } from '../../data/allProjectsData';

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
  
  // Find the full project data from our complete data using the ID
  const project = allProjects.find(p => p.id === item.id);
  
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
      return <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.7rem' }}>{item.id}</Typography>;
    }
    
    // For all other users, return a hyperlink
    return (
      <Link 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        sx={{ fontWeight: 'medium', color: '#ffffff', fontSize: '0.7rem' }}
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
              mb: 1.5, 
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
              height: 'auto !important', 
              width: '100%',
              opacity: snapshot.isDragging ? 0.8 : 1,
              overflow: 'visible', 
              boxSizing: 'border-box', 
              marginBottom: '16px !important' 
            }}
          >
            {/* Project ID, Appetite indicator, Hours and Info Button in one row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0, flexWrap: 'wrap' }}>
                {/* Project ID - Made more prominent */}
                <Box sx={{ fontWeight: 'bold' }}>
                  {getFormattedProjectId()}
                </Box>
                
                {/* Appetite indicator with text in colored box */}
                <Tooltip title={item.priority === 'L' ? 'Large' : item.priority === 'M' ? 'Medium' : 'Small'}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: getAppetiteColor(item.priority),
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }}>
                    {item.priority}
                  </Box>
                </Tooltip>
                
                {/* Hour estimate - Simplified */}
                {project && (
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
                )}
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
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Project Title */}
            <Typography 
              variant="subtitle2" 
              sx={{ 
                mb: 0.5,
                fontWeight: 'bold',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                lineHeight: 1.2, // Slightly tighter line height
              }}
            >
              {item.task}
            </Typography>
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
