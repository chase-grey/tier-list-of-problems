import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import type { Pitch, Vote } from '../../types/models';
import { registerDroppable } from '../../utils/enhancedDropDetection';

interface InterestColumnProps {
  columnId: string;
  label: string;
  color: string;
  pitches: Pitch[];
  votes: Record<string, Vote>;
}

/**
 * A column in the interest ranking board
 */
const InterestColumn = ({
  columnId,
  label,
  color,
  pitches,
  votes
}: InterestColumnProps) => {
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
          {label} ({pitches.length})
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
              border: pitches.length === 0 
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
            {pitches.length === 0 && !snapshot.isDraggingOver && (
              <Typography 
                sx={{ 
                  textAlign: 'center', 
                  color: 'text.secondary',
                  py: 2 
                }}
              >
                Drop cards here
              </Typography>
            )}
            
            {pitches.map((pitch, index) => (
              <Draggable 
                key={pitch.id} 
                draggableId={pitch.id} 
                index={index}
              >
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    elevation={snapshot.isDragging ? 6 : 1}
                    sx={{
                      p: 1,
                      mb: 0.75,
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
                      width: '100%',
                      transform: snapshot.isDragging ? 'rotate(3deg)' : 'none',
                      opacity: snapshot.isDragging ? 0.8 : 1
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Top section with title and info button */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          mr: 1,
                          // Ensure text wraps to avoid overflow
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                          fontSize: '0.85rem',
                        }}
                      >
                        {pitch.title}
                      </Typography>
                      
                      {/* Info button reference passed from parent */}
                      <InterestCardInfoButton pitch={pitch} vote={votes[pitch.id]} />
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

// Info button component with details bubble
const InterestCardInfoButton = ({ pitch, vote }: { pitch: Pitch; vote?: Vote }) => {
  const [detailsAnchor, setDetailsAnchor] = React.useState<HTMLElement | null>(null);
  
  const handleInfoButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDetailsAnchor(event.currentTarget);
  };
  
  const handleCloseDetails = () => {
    setDetailsAnchor(null);
  };
  
  return (
    <>
      <Box 
        component="button"
        onClick={(e: any) => handleInfoButtonClick(e)}
        aria-label="View pitch details"
        sx={{ 
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'primary.main',
          p: 0.5,
          cursor: 'pointer',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '50%',
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)'
          }
        }}
      >
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>i</span>
      </Box>
      
      <React.Suspense fallback={<div />}>
        {/* Import the details bubble lazily */}
        {React.useMemo(() => {
          const DetailsBubble = React.lazy(() => import('./InterestDetailsBubble'));
          return (
            <DetailsBubble 
              pitch={pitch}
              vote={vote}
              anchorEl={detailsAnchor}
              onClose={handleCloseDetails}
            />
          );
        }, [pitch, vote, detailsAnchor])}
      </React.Suspense>
    </>
  );
};

export default InterestColumn;
