import React, { useState, useRef, memo } from 'react';
import { Paper, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { Draggable } from '@hello-pangea/dnd';
import type { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import type { Pitch, Appetite, Vote } from '../../../types/models';
import { colorTokens } from '../../../theme';
import { getAppetiteAriaLabel, getPitchCardDescription } from '../../../utils/accessibility';

// Lazy-loaded details bubble for better performance
const DetailsBubble = React.lazy(() => 
  import('./DetailsBubble')
);

interface PitchCardProps {
  pitch: Pitch;
  vote: Vote | undefined;
  index: number;
  onAppetiteChange: (pitchId: string, appetite: Appetite) => void;
}

/**
 * Represents a single pitch card that can be dragged between tiers
 */
const PitchCard = ({ pitch, vote, index, onAppetiteChange }: PitchCardProps) => {
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Current appetite and tier
  const currentAppetite = vote?.appetite || null;
  const currentTier = vote?.tier || null;

  // Get next appetite in the sequence (unset -> S -> M -> L -> unset)
  const getNextAppetite = (current: string | null): Appetite | null => {
    if (!current) return 'S';
    if (current === 'S') return 'M';
    if (current === 'M') return 'L';
    return null; // L -> unset (null)
  };

  // Toggle appetite dot
  const handleAppetiteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextAppetite = getNextAppetite(currentAppetite);
    onAppetiteChange(pitch.id, nextAppetite as Appetite);
  };

  // Toggle details bubble
  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Don't open details if clicking on an appetite dot
    if ((event.target as HTMLElement).closest('.appetite-dot')) {
      return;
    }
    setDetailsAnchor(cardRef.current);
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setDetailsAnchor(cardRef.current);
    }
  };

  // Close details bubble
  const handleCloseDetails = () => {
    setDetailsAnchor(null);
  };

  // Get color for appetite dot
  const getAppetiteColor = (dot: Appetite | null, current: Appetite | null) => {
    if (dot === current) {
      switch (dot) {
        case 'S': return colorTokens.appetites.small;
        case 'M': return colorTokens.appetites.medium;
        case 'L': return colorTokens.appetites.large;
      }
    }
    return colorTokens.appetites.unset;
  };

  return (
    <Draggable draggableId={pitch.id} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <Paper
          ref={(el: HTMLElement | null) => {
            provided.innerRef(el);
            // @ts-ignore - combining refs
            cardRef.current = el;
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={snapshot.isDragging ? 6 : 1}
          onClick={handleCardClick}
          onKeyDown={handleKeyDown}
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
            minHeight: '70px',
          }}
          role="button"
          tabIndex={0}
          aria-expanded={Boolean(detailsAnchor)}
          aria-label={getPitchCardDescription(pitch.title, currentAppetite, currentTier)}
        >
          <Typography variant="subtitle2" gutterBottom>
            {pitch.title}
          </Typography>
          
          {/* Appetite dots */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              display: 'flex',
              gap: 0.5
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="appetite-dots"
          >
            {(['S', 'M', 'L'] as Appetite[]).map((appetite) => (
              <Tooltip 
                key={appetite} 
                title={appetite === 'S' ? 'Small' : appetite === 'M' ? 'Medium' : 'Large'}
              >
                <IconButton
                  size="small"
                  onClick={handleAppetiteToggle}
                  className="appetite-dot"
                  aria-label={getAppetiteAriaLabel(appetite)}
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: getAppetiteColor(appetite, currentAppetite),
                    '&:hover': {
                      bgcolor: getAppetiteColor(appetite, currentAppetite),
                      opacity: 0.8,
                    },
                  }}
                >
                  <Box 
                    component="span" 
                    sx={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold', 
                      color: '#fff' 
                    }}
                  >
                    {appetite}
                  </Box>
                </IconButton>
              </Tooltip>
            ))}
          </Box>

          {/* Details bubble, loaded lazily */}
          <React.Suspense fallback={<div />}>
            <DetailsBubble 
              pitch={pitch}
              anchorEl={detailsAnchor}
              onClose={handleCloseDetails}
            />
          </React.Suspense>
        </Paper>
      )}
    </Draggable>
  );
};

// Use memo to avoid unnecessary re-renders
export default memo(PitchCard, (prevProps: PitchCardProps, nextProps: PitchCardProps) => {
  return prevProps.vote?.appetite === nextProps.vote?.appetite && 
         prevProps.vote?.tier === nextProps.vote?.tier &&
         prevProps.index === nextProps.index;
});
