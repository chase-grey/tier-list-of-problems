import React, { useRef, useEffect } from 'react';
import { 
  Box, 
  Container
} from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import InterestColumn from './InterestColumn';
import type { DropResult } from '@hello-pangea/dnd';
import type { Pitch, Vote, InterestLevel } from '../../types/models';
import { initEnhancedDropDetection, cleanupEnhancedDropDetection } from '../../utils/enhancedDropDetection';
import { mapTierToInterestLevel } from '../../utils/voteActions';

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
}

/**
 * Second stage of voting - allows users to rank their interest level for each problem
 */
const InterestRanking: React.FC<InterestRankingProps> = ({
  pitches,
  votes,
  onSetInterest,
  userRole,
  focusedPitchId
}) => {
  // Reference to the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Setup enhanced drop detection for the container
  useEffect(() => {
    // Initialize enhanced drop detection
    initEnhancedDropDetection();
    
    // Return cleanup function
    return () => {
      cleanupEnhancedDropDetection();
    };
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
  
  // For each interest level, get pitches that have been assigned to it
  const interestColumns = React.useMemo(() => {
    const columns: Record<string, Pitch[]> = {};
    
    // Add unsorted column
    columns['interest-unsorted'] = [];
    
    // Initialize interest level columns with empty arrays
    for (let i = 1; i <= 4; i++) {
      columns[`interest-${i}`] = [];
    }
    
    // Create arrays to collect pitches for each column before randomizing
    const unsortedPitches: Pitch[] = [];
    
    // Process each pitch - now with better error handling to ensure all pitches are accounted for
    pitchesForInterestStage.forEach((pitch) => {
      try {
        // Every pitch should have an ID at this point since we filtered in pitchesForInterestStage
        const pitchId = pitch.id;
        
        // Get interest level and tier with proper null/undefined checking
        const vote = votes ? votes[pitchId] : undefined;
        const interestLevel = vote?.interestLevel;
        const tier = vote?.tier;
        
        // Flag to track if pitch was placed in a column
        let pitchPlaced = false;

        // Handle explicit interest level assignment
        if (interestLevel !== undefined) {
          if (interestLevel === null) {
            // Explicitly set to unsorted
            unsortedPitches.push(pitch);
            pitchPlaced = true;
          } else {
            // Add to the appropriate interest level column
            const columnKey = `interest-${interestLevel}`;
            if (columns[columnKey]) {
              columns[columnKey].push(pitch);
              pitchPlaced = true;
            }
          }
        }
        
        // If pitch hasn't been placed yet, process based on tier
        if (!pitchPlaced) {
          if (!tier) {
            // No tier means it goes in unsorted
            unsortedPitches.push(pitch);
            pitchPlaced = true;
          } else {
            // Map tier to interest level
            const defaultInterestLevel = mapTierToInterestLevel(tier);
            
            if (defaultInterestLevel === null) {
              // Null interest level means unsorted
              unsortedPitches.push(pitch);
              pitchPlaced = true;
            } else {
              // Add to the appropriate interest level column
              const columnKey = `interest-${defaultInterestLevel}`;
              if (columns[columnKey]) {
                columns[columnKey].push(pitch);
                pitchPlaced = true;
              }
            }
          }
        }

        // Safety check - if pitch wasn't placed anywhere yet, put it in unsorted
        if (!pitchPlaced) {
          unsortedPitches.push(pitch);
        }
      } catch (error) {
        // If there's an error processing a pitch, put it in unsorted rather than skipping it
        
        // Even with error, make sure the pitch is included somewhere
        if (pitch && pitch.id) {
          unsortedPitches.push(pitch);
        }
      }
    });
    
    try {
      for (let i = 1; i <= 4; i++) {
        const columnId = `interest-${i}`;
        const columnPitches = columns[columnId];
        
        if (Array.isArray(columnPitches) && columnPitches.length > 0) {
          columns[columnId].sort((a, b) => {
            try {
              const timestampA = votes && a && a.id ? (votes[a.id]?.timestamp || 0) : 0;
              const timestampB = votes && b && b.id ? (votes[b.id]?.timestamp || 0) : 0;
              return timestampA - timestampB;
            } catch (error) {
              return 0;
            }
          });
        }
      }
    } catch (error) {
    }
    
    // Keep unsorted pitches in a stable order (randomization prevents precise insertion/reordering)

    try {
      columns['interest-unsorted'] = Array.isArray(unsortedPitches)
        ? unsortedPitches.sort((a, b) => {
            const timestampA = votes && a && a.id ? (votes[a.id]?.timestamp || 0) : 0;
            const timestampB = votes && b && b.id ? (votes[b.id]?.timestamp || 0) : 0;
            if (timestampA !== timestampB) return timestampA - timestampB;
            return a.id.localeCompare(b.id);
          })
        : [];
    } catch (error) {
      columns['interest-unsorted'] = [];
    }
    
    return columns;
  }, [pitchesForInterestStage, votes]);

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
  
  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Container disableGutters maxWidth={false} sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pt: 0.5, px: 0.5 }}>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Box 
            ref={containerRef}
            sx={{ 
              display: 'flex', 
              flexWrap: { xs: 'wrap', lg: 'nowrap' }, // Wrap on smaller screens, no wrap on large screens
              justifyContent: 'space-between',
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
                width: `calc((100% - 16px) / 5)`, // Dynamic width based on 5 columns (4 interest levels + 1 unsorted)
                minWidth: '200px', // Minimum usable width
                mx: 0.5, // Margin on both sides for spacing
                height: '100%'
              }}
              key="interest-unsorted">
              <InterestColumn
                columnId="interest-unsorted"
                label="Unsorted"
                color="#616161" // Gray color for unsorted
                pitches={interestColumns['interest-unsorted'] || []}
                votes={votes}
                userRole={userRole}
                onSendToBottomUnsorted={handleSendToBottomInterestUnsorted}
                focusedPitchId={focusedPitchId}
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
                    width: `calc((100% - 16px) / 5)`, // Dynamic width based on 5 columns (4 interest levels + 1 unranked)
                    minWidth: '200px', // Minimum usable width
                    mx: 0.5, // Margin on both sides for spacing
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
