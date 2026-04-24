import React, { useState, useRef, useEffect, memo } from 'react';
import { Paper, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { InfoOutlined, Autorenew, South } from '@mui/icons-material';
import { Draggable } from '@hello-pangea/dnd';
import type { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import type { Pitch, Vote } from '../../../types/models';
import { getPitchCardDescription } from '../../../utils/accessibility';

// Lazy-loaded details bubble for better performance
const DetailsBubble = React.lazy(() => 
  import('./DetailsBubble')
);

interface PitchCardProps {
  pitch: Pitch;
  vote: Vote | undefined;
  index: number;
  onSendToBottom?: (pitchId: string) => void;
  userRole?: string | null;
  focused?: boolean;
  onSelect?: (id: string) => void;
}

/**
 * Represents a single pitch card that can be dragged between tiers
 */
const PitchCard = ({ pitch, vote, index, onSendToBottom, userRole, focused, onSelect }: PitchCardProps) => {
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLElement | null>(null);
  // Using HTMLElement type to match what Draggable provides
  const cardRef = useRef<HTMLElement>(null);

  // Current tier
  const currentTier = vote?.tier || null;

  // Sync DOM focus and scroll when React focus lands on this card
  useEffect(() => {
    if (focused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      cardRef.current.focus({ preventScroll: true });
    }
  }, [focused]);

  // Listen for keyboard-triggered open/close details events
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent).detail.pitchId === pitch.id) {
        setDetailsAnchor(cardRef.current);
      }
    };
    const onClose = () => setDetailsAnchor(null);
    document.addEventListener('kbdOpenDetails', onOpen);
    document.addEventListener('kbdCloseDetails', onClose);
    return () => {
      document.removeEventListener('kbdOpenDetails', onOpen);
      document.removeEventListener('kbdCloseDetails', onClose);
    };
  }, [pitch.id]);

  // Toggle details bubble
  const handleInfoButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation();
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

  return (
    <Draggable draggableId={pitch.id} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <Paper
          ref={(el: HTMLElement | null) => {
            // Properly handle both refs without @ts-ignore
            if (el) {
              provided.innerRef(el);
              cardRef.current = el;
            }
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={snapshot.isDragging ? 6 : 1}
          onKeyDown={handleKeyDown}
          onClick={() => onSelect?.(pitch.id)}
          sx={{
            p: 0.75,
            mb: 0,
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
            transition: snapshot.isDragging ? 'none' : 'background-color 0.2s ease, box-shadow 0.2s ease',
            cursor: 'grab',
            '&:hover': {
              backgroundColor: 'background.paper',
              boxShadow: 3,
            },
            '&:active': {
              cursor: 'grabbing',
            },
            position: 'relative',
            minHeight: '88px',
            outline: focused ? '3px solid' : 'none',
            outlineColor: focused ? 'primary.main' : 'transparent',
            outlineOffset: '2px',
            boxShadow: focused ? (theme) => `0 0 0 5px ${theme.palette.primary.main}33` : undefined,
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: '2px',
            },
          }}
          role="button"
          tabIndex={0}
          aria-expanded={Boolean(detailsAnchor)}
          aria-label={getPitchCardDescription(pitch.title, currentTier)}
        >
          {/* Top section with title and info button */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                mr: 1,
                minWidth: 0,
                flexGrow: 1,
                whiteSpace: 'normal',
                pr: 4,
                // Ensure text wraps to avoid overflow
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                fontSize: '0.85rem' 
              }}
            >
              {pitch.title}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                flexShrink: 0,
                flexDirection: 'column',
                position: 'absolute',
                top: 4,
                right: 4
              }}
            >
              <Tooltip title="View details">
                <IconButton
                  size="small"
                  onClick={handleInfoButtonClick}
                  aria-label="View pitch details"
                  sx={{
                    color: 'primary.main',
                    p: 0.25,
                    flexShrink: 0, // Prevent button from shrinking
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                    },
                    '& .MuiSvgIcon-root': {
                      fontSize: 18
                    }
                  }}
                >
                  <InfoOutlined fontSize="small" />
                </IconButton>
              </Tooltip>

              {pitch.continuation && (
                <Tooltip title="Continuation of existing development">
                  <Box
                    component="span"
                    aria-label="Continuation of existing development"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary',
                      p: 0.25,
                      '& .MuiSvgIcon-root': {
                        fontSize: 18
                      }
                    }}
                  >
                    <Autorenew fontSize="small" />
                  </Box>
                </Tooltip>
              )}

              {currentTier === null && onSendToBottom && (
                <Tooltip title="Send to bottom">
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSendToBottom(pitch.id);
                    }}
                    aria-label="Send to bottom"
                    sx={{
                      color: 'text.secondary',
                      p: 0.25,
                      flexShrink: 0,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.04)'
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: 18
                      }
                    }}
                  >
                    <South fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {detailsAnchor && (
            <React.Suspense fallback={<div />}>
              <DetailsBubble 
                pitch={pitch}
                anchorEl={detailsAnchor}
                onClose={handleCloseDetails}
                userRole={userRole}
              />
            </React.Suspense>
          )}
        </Paper>
      )}
    </Draggable>
  );
};

// Use memo to avoid unnecessary re-renders
export default memo(PitchCard, (prevProps: PitchCardProps, nextProps: PitchCardProps) => {
  return prevProps.vote?.tier === nextProps.vote?.tier &&
         prevProps.index === nextProps.index &&
         prevProps.focused === nextProps.focused;
});
