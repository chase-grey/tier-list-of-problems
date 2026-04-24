import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip, Stack, Menu, MenuItem } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Autorenew from '@mui/icons-material/Autorenew';
import South from '@mui/icons-material/South';
import InterestDetailsBubble from './InterestDetailsBubble';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import type { Pitch, Vote, InterestLevel } from '../../types/models';
import { registerDroppable } from '../../utils/enhancedDropDetection';

// Interest level options shown in the "Set all" menu on category group headers
const SET_ALL_OPTIONS: { label: string; level: InterestLevel; color: string }[] = [
  { label: 'Very Interested',     level: 1, color: '#4a148c' },
  { label: 'Interested',          level: 2, color: '#7b1fa2' },
  { label: 'Somewhat Interested', level: 3, color: '#ab47bc' },
  { label: 'Not Interested',      level: 4, color: '#ce93d8' },
];

// Short display names for category group headers
const CATEGORY_SHORT: Record<string, string> = {
  'Support AI Charting': 'AI Charting',
  'Create and Improve Tools and Framework': 'Tools & Framework',
  'Mobile Feature Parity': 'Mobile',
  'Address Technical Debt': 'Tech Debt',
};

// Dot colors for category group headers
const CATEGORY_COLORS: Record<string, string> = {
  'Support AI Charting': '#1565c0',
  'Create and Improve Tools and Framework': '#2e7d32',
  'Mobile Feature Parity': '#e65100',
  'Address Technical Debt': '#6a1b9a',
};

interface InterestColumnProps {
  columnId: string;
  label: string;
  color: string;
  pitches: Pitch[];
  votes: Record<string, Vote>;
  userRole?: string | null;
  onSendToBottomUnsorted?: (pitchId: string) => void;
  onSetAllCategory?: (category: string, level: InterestLevel) => void;
  focusedPitchId?: string | null;
  onFocusPitch?: (id: string | null) => void;
}

/**
 * A column in the interest ranking board
 */
const InterestColumn = ({
  columnId,
  label,
  color,
  pitches,
  votes,
  userRole,
  onSendToBottomUnsorted,
  onSetAllCategory,
  focusedPitchId,
  onFocusPitch,
}: InterestColumnProps) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const isUnsorted = columnId === 'interest-unsorted';

  // Build a flat list of items for the unsorted column: category group headers interspersed with pitch items.
  // Draggable indices are global (0, 1, 2...) regardless of headers.
  const groupedItems = React.useMemo(() => {
    if (!isUnsorted || !Array.isArray(pitches)) return null;
    const categoryOrder = [...new Set(pitches.map(p => p.category))];
    const items: Array<
      | { type: 'header'; category: string; count: number }
      | { type: 'pitch'; pitch: Pitch; globalIndex: number }
    > = [];
    let idx = 0;
    for (const cat of categoryOrder) {
      const catPitches = pitches.filter(p => p.category === cat);
      if (catPitches.length === 0) continue;
      items.push({ type: 'header', category: cat, count: catPitches.length });
      for (const pitch of catPitches) {
        items.push({ type: 'pitch', pitch, globalIndex: idx++ });
      }
    }
    return items;
  }, [isUnsorted, pitches]);

  // Register this column with the enhanced drop detection system
  useEffect(() => {
    if (columnRef.current) {
      registerDroppable(columnId, columnRef.current);
    } else {
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
          color: (theme) => theme.palette.getContrastText(color),
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      >
        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
          {label} ({Array.isArray(pitches) ? pitches.length : 0})
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
                ? (theme) =>
                    theme.palette.mode === 'dark'
                      ? '2px dashed rgba(255,255,255,0.2)'
                      : '2px dashed rgba(0,0,0,0.2)'
                : 'none',
              display: 'flex',
              flexDirection: 'column',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&:focus, &:focus-visible': { outline: 'none' },
            }}
          >
            {(!Array.isArray(pitches) || pitches.length === 0) && !snapshot.isDraggingOver && (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 2 }}>
                Drop cards here
              </Typography>
            )}

            <Stack spacing={1}>
              {/* Unsorted column: render category group headers between pitch cards */}
              {isUnsorted && groupedItems
                ? groupedItems.map(item => {
                    if (item.type === 'header') {
                      return (
                        <CategoryGroupHeader
                          key={`header-${item.category}`}
                          category={item.category}
                          count={item.count}
                          onSetAll={onSetAllCategory}
                        />
                      );
                    }
                    const { pitch, globalIndex } = item;
                    if (!pitch?.id) return null;
                    const isFocused = focusedPitchId === pitch.id;
                    return (
                      <Draggable key={pitch.id} draggableId={pitch.id} index={globalIndex}>
                        {(provided, snapshot) => {
                          const { style, ...draggableProps } = provided.draggableProps;
                          return (
                            <InterestCardShell
                              pitch={pitch}
                              vote={votes[pitch.id]}
                              innerRef={provided.innerRef}
                              draggableProps={draggableProps}
                              dragHandleProps={provided.dragHandleProps}
                              style={style}
                              isDragging={snapshot.isDragging}
                              focused={isFocused}
                              columnId={columnId}
                              onSendToBottomUnsorted={onSendToBottomUnsorted}
                              userRole={userRole}
                              onFocusPitch={onFocusPitch}
                            />
                          );
                        }}
                      </Draggable>
                    );
                  })
                : Array.isArray(pitches) && pitches.map((pitch, index) => {
                if (!pitch?.id) return null;
                const isFocused = focusedPitchId === pitch.id;

                return (
                  <Draggable
                    key={pitch.id}
                    draggableId={pitch.id}
                    index={index}
                  >
                    {(provided, snapshot) => {
                      const { style, ...draggableProps } = provided.draggableProps;

                      return (
                        <InterestCardShell
                          pitch={pitch}
                          vote={votes[pitch.id]}
                          innerRef={provided.innerRef}
                          draggableProps={draggableProps}
                          dragHandleProps={provided.dragHandleProps}
                          style={style}
                          isDragging={snapshot.isDragging}
                          focused={isFocused}
                          columnId={columnId}
                          onSendToBottomUnsorted={onSendToBottomUnsorted}
                          userRole={userRole}
                          onFocusPitch={onFocusPitch}
                        />
                      );
                    }}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </Stack>
          </Paper>
        )}
      </Droppable>
    </Box>
  );
};

// Category group header rendered inside the unsorted column
const CategoryGroupHeader = ({
  category,
  count,
  onSetAll,
}: {
  category: string;
  count: number;
  onSetAll?: (category: string, level: InterestLevel) => void;
}) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 0.5,
        pt: 0.5,
        pb: 0.25,
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        '&:first-of-type': { borderTop: 'none', pt: 0 },
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: CATEGORY_COLORS[category] ?? 'text.disabled',
          flexShrink: 0,
        }}
      />
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, flexGrow: 1, fontSize: '0.72rem' }}
        title={category}
      >
        {CATEGORY_SHORT[category] ?? category}
        <span style={{ fontWeight: 400, marginLeft: 4, opacity: 0.7 }}>({count})</span>
      </Typography>

      {onSetAll && (
        <>
          <Tooltip title="Apply one interest level to all pitches in this category">
            <Typography
              variant="caption"
              component="span"
              onClick={e => setMenuAnchor(e.currentTarget as HTMLElement)}
              sx={{
                color: 'primary.main',
                cursor: 'pointer',
                fontSize: '0.7rem',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Set all
            </Typography>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {SET_ALL_OPTIONS.map(opt => (
              <MenuItem
                key={opt.level}
                dense
                onClick={() => {
                  onSetAll(category, opt.level);
                  setMenuAnchor(null);
                }}
                sx={{ gap: 1 }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opt.color, flexShrink: 0 }} />
                <Typography variant="body2">{opt.label}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  );
};

// Card shell component — handles focus ring, scroll-into-view, and kbdOpenDetails/kbdCloseDetails events
const InterestCardShell = ({
  pitch,
  vote,
  innerRef,
  draggableProps,
  dragHandleProps,
  style,
  isDragging,
  focused,
  columnId,
  onSendToBottomUnsorted,
  userRole,
  onFocusPitch,
}: {
  pitch: Pitch;
  vote?: Vote;
  innerRef: (el: HTMLElement | null) => void;
  draggableProps: Record<string, unknown>;
  dragHandleProps: Record<string, unknown> | null | undefined;
  style: React.CSSProperties | undefined;
  isDragging: boolean;
  focused: boolean;
  columnId: string;
  onSendToBottomUnsorted?: (pitchId: string) => void;
  userRole?: string | null;
  onFocusPitch?: (id: string | null) => void;
}) => {
  const cardRef = useRef<HTMLElement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        setDetailsOpen(true);
      }
    };
    const onClose = () => setDetailsOpen(false);
    document.addEventListener('kbdOpenDetails', onOpen);
    document.addEventListener('kbdCloseDetails', onClose);
    return () => {
      document.removeEventListener('kbdOpenDetails', onOpen);
      document.removeEventListener('kbdCloseDetails', onClose);
    };
  }, [pitch.id]);

  return (
    <Paper
      ref={(el: HTMLElement | null) => {
        innerRef(el);
        cardRef.current = el;
      }}
      {...draggableProps}
      {...dragHandleProps}
      style={{ ...style, height: 'auto', maxHeight: 'none' }}
      elevation={isDragging ? 6 : 1}
      onClick={() => onFocusPitch?.(pitch.id)}
      sx={{
        p: 0.75,
        mb: 0,
        backgroundColor: (theme: import('@mui/material').Theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
        transition: isDragging ? 'none' : 'background-color 0.2s ease, box-shadow 0.2s ease',
        cursor: 'grab',
        '&:hover': {
          backgroundColor: 'background.paper',
          boxShadow: 3,
        },
        '&:active': {
          cursor: 'grabbing',
        },
        position: 'relative',
        overflow: 'visible',
        minHeight: '88px',
        opacity: isDragging ? 0.8 : 1,
        outline: focused ? '2px solid' : 'none',
        outlineColor: focused ? 'primary.main' : 'transparent',
        outlineOffset: '1px',
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '1px',
        },
      }}
      role="button"
      tabIndex={0}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Typography
          variant="subtitle2"
          sx={{
            mr: 1,
            minWidth: 0,
            flexGrow: 1,
            whiteSpace: 'normal',
            pr: 4,
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            fontSize: '0.85rem',
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
          <InterestCardInfoButton
            pitch={pitch}
            vote={vote}
            userRole={userRole}
            externalOpen={detailsOpen}
            onExternalClose={() => setDetailsOpen(false)}
          />

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

          {columnId === 'interest-unsorted' && onSendToBottomUnsorted && (
            <Tooltip title="Send to bottom">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onSendToBottomUnsorted(pitch.id);
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
    </Paper>
  );
};

// Info button component with details bubble
const InterestCardInfoButton = ({ pitch, vote, userRole, externalOpen, onExternalClose }: { pitch: Pitch; vote?: Vote; userRole?: string | null; externalOpen?: boolean; onExternalClose?: () => void }) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  // Merge internal and external open state
  const isOpen = detailsOpen || (externalOpen ?? false);

  const handleInfoButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    onExternalClose?.();
  };

  return (
    <>
      <Tooltip title="View details">
        <IconButton
          ref={buttonRef}
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

      {/* Only render the details bubble when open - fixes the positioning bug */}
      {isOpen && (
        <InterestDetailsBubble
          pitch={pitch}
          vote={vote}
          anchorEl={buttonRef.current}
          onClose={handleCloseDetails}
          userRole={userRole}
        />
      )}
    </>
  );
};

export default InterestColumn;
