import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Container,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import InterestColumn from './InterestColumn';
import type { DropResult } from '@hello-pangea/dnd';
import type { Pitch, Vote, InterestLevel } from '../../types/models';
import { initEnhancedDropDetection, cleanupEnhancedDropDetection } from '../../utils/enhancedDropDetection';

// Interest level labels that correspond to each level (1-4)
// Display most interested on the left. Saved data semantics: 1 = highest interest, 4 = lowest interest.
const INTEREST_LEVEL_LABELS = [
  'Very Interested',
  'Interested',
  'Somewhat Interested',
  'Not Interested'
];

// Map from display index (0-3) to actual interest level (1-4)
const DISPLAY_TO_INTEREST_LEVEL = [1, 2, 3, 4];

// Interest level column header colors (matches the tier column style but with purple hues)
const INTEREST_LEVEL_COLORS = [
  '#4a148c',  // Very dark purple (Very Interested)
  '#7b1fa2',  // Medium-dark purple (Interested)
  '#ab47bc',  // Light purple (Somewhat Interested)
  '#ce93d8'   // Pale purple (Not Interested)
];

interface InterestRankingProps {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  onSetInterest: (id: string, interestLevel: InterestLevel, timestamp?: number) => void;
  userRole?: string | null;
  focusedPitchId?: string | null;
  onFocusPitch?: (id: string | null) => void;
}

/**
 * Second stage of voting - allows users to rank their interest level for each problem
 */
const InterestRanking: React.FC<InterestRankingProps> = ({
  pitches,
  votes,
  onSetInterest,
  userRole,
  focusedPitchId,
  onFocusPitch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [unsortedSort, setUnsortedSort] = useState<'default' | 'priority' | 'category'>('default');

  useEffect(() => {
    initEnhancedDropDetection();
    return () => { cleanupEnhancedDropDetection(); };
  }, []);
  
  // Get all pitches that should be shown in this stage (includes all pitches now)
  const pitchesForInterestStage = React.useMemo(() => {
    // Make sure we have a valid array of pitches
    if (!Array.isArray(pitches)) {
      return [];
    }
    
    // Filter out any invalid pitches (those without an id)
    const validPitches = pitches.filter(p => p && (p.id !== undefined && p.id !== null));
    
    // Sort the valid pitches
    return validPitches.sort((a, b) => {
      // Sort first by tier (lower tier = higher priority)
      const tierA = votes[a.id]?.tier || 99;
      const tierB = votes[b.id]?.tier || 99;
      
      if (tierA !== tierB) {
        return tierA - tierB;
      }
      
      // Then by timestamp within the same tier
      const timestampA = votes[a.id]?.timestamp || 0;
      const timestampB = votes[b.id]?.timestamp || 0;
      return timestampA - timestampB;
    });
  }, [pitches, votes]);
  
  // Distribute pitches to interest level columns. Pitches with no explicit interestLevel go to unsorted.
  const interestColumns = React.useMemo(() => {
    const columns: Record<string, Pitch[]> = { 'interest-unsorted': [] };
    for (let i = 1; i <= 4; i++) columns[`interest-${i}`] = [];

    const unsortedPitches: Pitch[] = [];

    for (const pitch of pitchesForInterestStage) {
      const vote = votes?.[pitch.id];
      const interestLevel = vote?.interestLevel;

      if (interestLevel !== undefined && interestLevel !== null) {
        const key = `interest-${interestLevel}`;
        if (columns[key]) { columns[key].push(pitch); continue; }
      }
      unsortedPitches.push(pitch);
    }

    // Sort placed columns by drag timestamp
    for (let i = 1; i <= 4; i++) {
      columns[`interest-${i}`].sort((a, b) =>
        (votes?.[a.id]?.timestamp ?? 0) - (votes?.[b.id]?.timestamp ?? 0)
      );
    }

    // Sort unsorted column based on selected sort mode
    if (unsortedSort === 'priority') {
      unsortedPitches.sort((a, b) => {
        const tierA = votes?.[a.id]?.tier ?? 99;
        const tierB = votes?.[b.id]?.tier ?? 99;
        if (tierA !== tierB) return tierA - tierB;
        return a.title.localeCompare(b.title);
      });
    } else if (unsortedSort === 'category') {
      unsortedPitches.sort((a, b) =>
        a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
      );
    } else {
      unsortedPitches.sort((a, b) => {
        const tsA = votes?.[a.id]?.timestamp ?? 0;
        const tsB = votes?.[b.id]?.timestamp ?? 0;
        if (tsA !== tsB) return tsA - tsB;
        return a.id.localeCompare(b.id);
      });
    }

    columns['interest-unsorted'] = unsortedPitches;
    return columns;
  }, [pitchesForInterestStage, votes, unsortedSort]);

  const handleSendToBottomInterestUnsorted = (pitchId: string) => {
    const unsortedPitchIds = (interestColumns['interest-unsorted'] || []).map(p => p.id);

    const maxTimestamp = unsortedPitchIds.reduce((max, id) => {
      const ts = votes[id]?.timestamp ?? 0;
      return ts > max ? ts : max;
    }, 0);

    const now = new Date().getTime();
    const newTimestamp = Math.max(now, maxTimestamp + 1);
    onSetInterest(pitchId, null, newTimestamp);
  };
  
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId, source } = result;
    
    // Drop outside valid area
    if (!destination) {
      return;
    }
    
    const destId = destination.droppableId;

    // No-op drop
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const computeInsertionTimestamp = (
      prevTimestamp: number | undefined,
      nextTimestamp: number | undefined
    ): number => {
      const now = new Date().getTime();

      if (prevTimestamp === undefined && nextTimestamp === undefined) return now;
      if (prevTimestamp === undefined) return (nextTimestamp ?? now) - 1;
      if (nextTimestamp === undefined) return (prevTimestamp ?? now) + 1;

      if (prevTimestamp >= nextTimestamp) return prevTimestamp + 1;

      const mid = prevTimestamp + (nextTimestamp - prevTimestamp) / 2;
      return Number.isFinite(mid) ? mid : now;
    };
    
    try {
      const destInterestLevel: InterestLevel =
        destId === 'interest-unsorted'
          ? null
          : (parseInt(destId.replace('interest-', '')) as InterestLevel);

      const destOrderedIds = (interestColumns[destId] || [])
        .map(p => p.id)
        .filter(id => id !== draggableId);

      const insertIndex = Math.min(destination.index, destOrderedIds.length);
      const prevId = insertIndex > 0 ? destOrderedIds[insertIndex - 1] : undefined;
      const nextId = insertIndex < destOrderedIds.length ? destOrderedIds[insertIndex] : undefined;

      const prevTimestamp = prevId ? votes[prevId]?.timestamp : undefined;
      const nextTimestamp = nextId ? votes[nextId]?.timestamp : undefined;
      const newTimestamp = computeInsertionTimestamp(prevTimestamp, nextTimestamp);

      // If dropped in unsorted column
      if (destId === 'interest-unsorted') {
        // Use null to unset the interest level - the App component will handle it with the proper action
        onSetInterest(draggableId, destInterestLevel, newTimestamp);
      }
      // If dropped in an interest level column
      else if (destId.startsWith('interest-')) {
        // Update the interest level for this pitch
        onSetInterest(draggableId, destInterestLevel, newTimestamp);
      } else {
      }
    } catch (error) {
    }
  };
  
  // Apply an interest level to all currently-unsorted pitches in a given category
  const handleSetAllCategory = (category: string, level: InterestLevel) => {
    const unsortedInCategory = (interestColumns['interest-unsorted'] || []).filter(
      p => p.category === category
    );
    const now = Date.now();
    unsortedInCategory.forEach((pitch, i) => {
      onSetInterest(pitch.id, level, now + i);
    });
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary">Sort unsorted by:</Typography>
        <ToggleButtonGroup
          value={unsortedSort}
          exclusive
          onChange={(_, v) => { if (v) setUnsortedSort(v); }}
          size="small"
        >
          <ToggleButton value="default" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>Recent</ToggleButton>
          <ToggleButton value="priority" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>Priority</ToggleButton>
          <ToggleButton value="category" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>Category</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Container disableGutters maxWidth={false} sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pt: 0.5, px: 0.5 }}>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Box
            ref={containerRef}
            sx={{
              display: 'flex',
              flexWrap: { xs: 'wrap', lg: 'nowrap' }, // Wrap on smaller screens, no wrap on large screens
              gap: 0.5,
              pb: 0.5, // Reduced bottom padding
              flexGrow: 1,
              minHeight: 0,
              maxWidth: '100%', // Ensure it doesn't exceed viewport width
              overflowX: { xs: 'hidden', lg: 'auto' }, // Only allow horizontal scroll on large screens if needed
              overflowY: { xs: 'auto', lg: 'hidden' }, // Allow vertical scroll on small screens

              '&::-webkit-scrollbar': {
                height: '4px',
                width: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.1)'
                    : 'rgba(0, 0, 0, 0.06)',
              },
            }}
          >
            {/* Unsorted column */}
            <Box
              sx={{
                flex: 1,
                minWidth: '200px',
                height: '100%'
              }}
              key="interest-unsorted">
              <InterestColumn
                columnId="interest-unsorted"
                label="Unsorted"
                color="#616161"
                pitches={interestColumns['interest-unsorted'] || []}
                votes={votes}
                userRole={userRole}
                onSendToBottomUnsorted={handleSendToBottomInterestUnsorted}
                onSetAllCategory={handleSetAllCategory}
                focusedPitchId={focusedPitchId}
                onFocusPitch={onFocusPitch}
              />
            </Box>

            {/* Interest level columns 1-4 */}
            {Array.from({ length: 4 }).map((_, index) => {
              // Map the display index to the actual interest level
              const level = DISPLAY_TO_INTEREST_LEVEL[index];
              const columnId = `interest-${level}`;
              const label = INTEREST_LEVEL_LABELS[index];
              const color = INTEREST_LEVEL_COLORS[index];
              const columnPitches = interestColumns[columnId] || [];
              
              return (
                <Box
                  sx={{
                    flex: 1,
                    minWidth: '200px',
                    height: '100%'
                  }}
                  key={columnId}>
                  <InterestColumn
                    columnId={columnId}
                    label={label}
                    color={color}
                    pitches={columnPitches}
                    votes={votes}
                    userRole={userRole}
                    focusedPitchId={focusedPitchId}
                    onFocusPitch={onFocusPitch}
                  />
                </Box>
              );
            })}
          </Box>
        </DragDropContext>
      </Container>
    </Box>
  );
};

export default InterestRanking;
