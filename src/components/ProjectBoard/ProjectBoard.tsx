import { useState, useEffect, useRef } from 'react';
import { Box, Alert, FormControl, InputLabel, MenuItem, Select, Typography, Paper } from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { Project, ProjectVote, ProjectPriority } from '../../types/project-models';
import PriorityColumn from './PriorityColumn';
import ErrorBoundary from '../ErrorBoundary';
import { isDragAndDropSupported } from '../../utils/dndDetection';
import { initEnhancedDropDetection, cleanupEnhancedDropDetection } from '../../utils/enhancedDropDetection';

// Console log for debugging
console.log('ProjectBoard component loaded');

interface ProjectBoardProps {
  projects: Project[];
  votes: Record<string, ProjectVote>;
  onDragEnd: (result: DropResult) => void;
  userRole?: string | null;
}

/**
 * Main drag-and-drop container for organizing projects into priority buckets
 */
const ProjectBoard = ({ 
  projects, 
  votes, 
  onDragEnd,
  userRole
}: ProjectBoardProps) => {
  // Reference to the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);
  // State for drag-and-drop support detection
  const [isDndSupported, setIsDndSupported] = useState<boolean | null>(null);
  const [hasDndError, setHasDndError] = useState(false);
  
  // Generate array of priority levels - removed 'Not a priority' as requested
  const priorities: (ProjectPriority | null)[] = [
    null, // Unsorted
    'Highest priority',
    'High priority',
    'Medium Priority',
    'Low priority'
    // 'Not a priority' removed as requested
  ];
  
  // Show total project count for validation
  const TOTAL = projects.length;
  
  // Always show 5 columns (4 priority columns + 1 unsorted column)
  const columnCount = 5;

  // Detect drag-and-drop support on mount and setup auto-scroll and enhanced drop detection
  useEffect(() => {
    try {
      console.log('Checking drag-and-drop support...');
      // Check for drag-and-drop support
      const supported = isDragAndDropSupported();
      console.log('Drag-and-drop supported:', supported);
      setIsDndSupported(supported);
      
      // Initialize enhanced drop detection
      if (supported) {
        console.log('Initializing enhanced drop detection');
        initEnhancedDropDetection();
      }
      
      // Return cleanup function
      return () => {
        if (supported) {
          console.log('Cleaning up enhanced drop detection');
          cleanupEnhancedDropDetection();
        }
      };
    } catch (error) {
      console.error('Error during drag-and-drop initialization:', error);
      setHasDndError(true);
      return () => {}; // Empty cleanup function
    }
  }, []);
  
  // Fallback UI for handling project priority assignment without drag-and-drop
  const renderFallbackUI = () => {
    console.log('Rendering fallback UI due to drag-and-drop compatibility issues');
    
    // Get available priorities for dropdown - removed 'Not a priority' as requested
    const priorityOptions: (ProjectPriority | null)[] = [
      null, // Unsorted
      'Highest priority',
      'High priority',
      'Medium Priority',
      'Low priority'
      // 'Not a priority' removed as requested
    ];
    
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
        >
          Using dropdown selection mode for priority assignment since drag-and-drop functionality isn't available in your environment.
        </Alert>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {projects.map((project) => (
            <Paper 
              key={project.id} 
              sx={{ 
                width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)' },
                p: 2, 
                mb: 2,
                position: 'relative'
              }}
              elevation={2}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {project.title}
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Appetite: {project.appetite}
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                {project.deliverables.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Deliverables:
                    </Typography>
                    {project.deliverables.slice(0, 2).join(', ')}
                    {project.deliverables.length > 2 && ` +${project.deliverables.length - 2} more`}
                  </>
                )}
              </Typography>
              
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={votes[project.id]?.priority || ''}
                  label="Priority"
                  onChange={(e) => {
                    const priorityValue = e.target.value as ProjectPriority | '';
                    
                    // Create a simulated drop result to reuse the same handler
                    if (priorityValue) {
                      const result: DropResult = {
                        draggableId: project.id,
                        type: 'DEFAULT',
                        source: { index: 0, droppableId: 'source' },
                        destination: { 
                          index: 0, 
                          droppableId: `priority-${priorityValue.toLowerCase().replace(/\s+/g, '-')}` 
                        },
                        reason: 'DROP'
                      };
                      onDragEnd(result);
                    } else {
                      // If empty string (unsorted), simulate drop to unsorted
                      const result: DropResult = {
                        draggableId: project.id,
                        type: 'DEFAULT',
                        source: { index: 0, droppableId: 'source' },
                        destination: { index: 0, droppableId: 'unsorted' },
                        reason: 'DROP'
                      };
                      onDragEnd(result);
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Unsorted</em>
                  </MenuItem>
                  {priorityOptions.filter(p => p !== null).map((priority) => (
                    <MenuItem key={priority} value={priority}>
                      {priority}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography variant="body2" sx={{ 
                position: 'absolute', 
                bottom: 8, 
                right: 12, 
                fontSize: '0.75rem',
                fontWeight: 'bold' 
              }}>
                {project.details.hourEstimate} hrs
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  };

  // If we've detected that drag-and-drop isn't supported or an error occurred, show fallback UI
  if (isDndSupported === false || hasDndError) {
    console.log('Using fallback UI due to compatibility issues');
    return renderFallbackUI();
  }
  
  // If we're still detecting support, show a simple loading message
  if (isDndSupported === null) {
    console.log('Still detecting drag-and-drop support...');
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Initializing project board...</Typography>
      </Box>
    );
  }

  // Main drag-and-drop UI with error boundary
  return (
    <ErrorBoundary 
      fallback={renderFallbackUI()}
      onReset={() => setHasDndError(false)}
    >
      <DragDropContext onDragEnd={onDragEnd}>
        <Box 
          ref={containerRef}
          sx={{ 
            display: 'flex', 
            flexWrap: { xs: 'wrap', lg: 'nowrap' }, // Wrap on smaller screens, no wrap on large screens
            justifyContent: 'space-between', // Even distribution across entire width
            p: 0, // Remove padding
            height: { xs: 'auto', lg: '100vh' }, // Full viewport height on large screens
            width: '100%', // Full width
            maxWidth: '100%', // Ensure it doesn't exceed container width
            overflowX: { xs: 'hidden', lg: 'auto' }, // Only allow horizontal scroll on large screens if needed
            overflowY: { xs: 'auto', lg: 'hidden' }, // Allow vertical scroll on small screens

            '&::-webkit-scrollbar': {
              height: '4px',
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            },
          }}
          aria-label={`Project board with ${TOTAL} projects to prioritize`}
        >
          {/* Priority columns */}
          {priorities.map((priority, index) => (
            <PriorityColumn
              key={priority === null ? 'unsorted' : `priority-${index}`}
              priority={priority}
              projects={projects}
              votes={votes}
              columnCount={columnCount}
              userRole={userRole}
            />
          ))}
        </Box>
      </DragDropContext>
    </ErrorBoundary>
  );
};

export default ProjectBoard;
