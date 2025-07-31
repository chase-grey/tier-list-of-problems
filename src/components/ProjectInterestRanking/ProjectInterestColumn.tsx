import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import type { Project } from '../../types/project-models';
import { registerDroppable } from '../../utils/enhancedDropDetection';

interface ProjectInterestColumnProps {
  columnId: string;
  label: string;
  color: string;
  projects: Project[];
  interestVotes: Record<string, any>;
  userRole?: string | null;
}

/**
 * A column in the project interest ranking board
 */
const ProjectInterestColumn: React.FC<ProjectInterestColumnProps> = ({
  columnId,
  label,
  color,
  projects,
  interestVotes,
  userRole
}) => {
  const columnRef = useRef<HTMLDivElement>(null);
  
  // Register this column with the enhanced drop detection system
  useEffect(() => {
    if (columnRef.current) {
      registerDroppable(columnId, columnRef.current);
    }
  }, [columnId]);
  
  return (
    <Box 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      data-column-id={columnId}
    >
      {/* Column header */}
      <Paper 
        sx={{
          p: 0.75,
          mb: 1,
          backgroundColor: color,
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      >
        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
          {label} ({projects.length})
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
              border: projects.length === 0 
                ? '2px dashed rgba(255,255,255,0.2)' 
                : 'none',
              display: 'flex',
              flexDirection: 'column',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            {projects.length === 0 && !snapshot.isDraggingOver && (
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
            
            {projects.map((project, index) => (
              <Draggable 
                key={project.id} 
                draggableId={project.id} 
                index={index}
              >
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    elevation={snapshot.isDragging ? 6 : 1}
                    sx={{
                      p: 1.5,
                      mb: 1,
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
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      opacity: snapshot.isDragging ? 0.8 : 1
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Project title */}
                    <Typography 
                      variant="subtitle2" 
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
                    
                    {/* Project details */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
                        Appetite:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {project.appetite}
                      </Typography>
                    </Box>
                    
                    {/* Hour estimate */}
                    {project.details?.hourEstimate && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
                          Estimate:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {project.details.hourEstimate} hours
                        </Typography>
                      </Box>
                    )}
                    
                    {/* View details button */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                      <Tooltip title="View details">
                        <IconButton 
                          size="small" 
                          aria-label="View project details"
                          sx={{ 
                            color: 'primary.main',
                            p: 0.5,
                          }}
                        >
                          <InfoOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Paper>
        )}
      </Droppable>
    </Box>
  );
};

export default ProjectInterestColumn;
