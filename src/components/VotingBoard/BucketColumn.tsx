import * as React from 'react';
import { useRef, useEffect, useMemo } from 'react';
import { Paper, Typography, Box, Stack } from '@mui/material';
import { Droppable } from '@hello-pangea/dnd';
import type { DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import { colorTokens } from '../../theme';
import type { Pitch, Vote, Appetite } from '../../types/models';
import PitchCard from './PitchCard/PitchCard';
import { registerDroppable } from '../../utils/enhancedDropDetection';

interface BucketColumnProps {
  tier: number | null; // null for "Unsorted" column
  pitches: Pitch[];
  votes: Record<string, Vote>;
  onAppetiteChange: (pitchId: string, appetite: Appetite | null) => void;
  columnCount?: number; // Total number of visible columns (9 with unsorted, 8 without)
  userRole?: string | null;
}

/**
 * Represents a tier bucket column in the voting board
 */
const BucketColumn = ({ tier, pitches, votes, onAppetiteChange, columnCount = 9, userRole }: BucketColumnProps) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const columnId = tier === null ? 'unsorted' : `tier-${tier}`;
  
  // Register this column with the enhanced drop detection system
  useEffect(() => {
    if (columnRef.current) {
      registerDroppable(columnId, columnRef.current);
    }
  }, [columnId]);
  const isUnsorted = tier === null;
  
  // Get the priority label based on tier number
  const getPriorityLabel = (tierNumber: number | null): string => {
    if (tierNumber === null) return 'Unsorted';
    
    switch (tierNumber) {
      case 1: return 'Highest Priority';
      case 2: return 'Very High Priority';
      case 3: return 'High Priority';
      case 4: return 'Moderate Priority';
      case 5: return 'Low-Moderate Priority';
      case 6: return 'Low Priority';
      case 7: return 'Very Low Priority';
      case 8: return 'Not a Priority';
      default: return `Tier ${tierNumber}`;
    }
  };
  
  const title = getPriorityLabel(tier);
  
  // Get background color for the column header
  const getHeaderColor = () => {
    if (isUnsorted) return 'background.paper'; // Use default paper color
    // Use the tier colors from the spec
    return colorTokens.tiers[tier as keyof typeof colorTokens.tiers];
  };
  
  // Get text color for the header - always white for tier columns
  const getHeaderTextColor = () => isUnsorted ? 'text.primary' : 'white';

  // Filter and sort pitches that belong to this column
  const filteredPitches = useMemo(() => {
    // First, filter pitches that belong to this column
    const filtered = pitches.filter(pitch => {
      if (isUnsorted) {
        // Show in unsorted if it doesn't have a tier assigned
        return !votes[pitch.id]?.tier;
      } 
      // Show in specific tier column if its tier matches
      return votes[pitch.id]?.tier === tier;
    });
    
    // For unsorted column, randomize the order to ensure more even data collection
    // For tier columns, maintain timestamp order
    if (isUnsorted) {
      // Fisher-Yates shuffle algorithm for truly random order
      // We create a copy to avoid mutating the original array
      return [...filtered].sort(() => Math.random() - 0.5);
    } else {
      // Sort by timestamp (oldest first, newest last)
      return filtered.sort((a, b) => {
        const timestampA = votes[a.id]?.timestamp || 0;
        const timestampB = votes[b.id]?.timestamp || 0;
        return timestampA - timestampB;
      });
    }
  }, [pitches, votes, isUnsorted, tier]);

  return (
    <Box 
      sx={{ 
        width: `calc((100% - ${(columnCount - 1) * 2}px) / ${columnCount})`, // Dynamic width based on column count with 2px margin between
        minWidth: '200px', // Minimum usable width
        mx: 1, // Margin on both sides for spacing
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      role="region"
      aria-label={`${title} bucket`}
    >
      {/* Column header */}
      <Paper 
        sx={{
          p: 0.75,
          mb: 1,
          backgroundColor: getHeaderColor(),
          color: getHeaderTextColor(),
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      >
        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
          {title} ({filteredPitches.length})
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
              border: filteredPitches.length === 0 
                ? '2px dashed rgba(255,255,255,0.2)' 
                : 'none',
              display: 'flex',
              flexDirection: 'column'
            }}
            aria-roledescription="bucket"
          >
            {filteredPitches.length === 0 && !snapshot.isDraggingOver && (
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
            
            <Stack spacing={1}>
              {filteredPitches.map((pitch, index) => (
                <PitchCard
                  key={pitch.id}
                  pitch={pitch}
                  vote={votes[pitch.id]}
                  index={index}
                  onAppetiteChange={onAppetiteChange}
                  userRole={userRole}
                />
              ))}
            </Stack>
            
            {provided.placeholder}
          </Paper>
        )}
      </Droppable>
    </Box>
  );
};

export default React.memo(BucketColumn);
