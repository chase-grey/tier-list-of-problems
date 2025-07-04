import * as React from 'react';
import { Paper, Typography, Box, Stack } from '@mui/material';
import { Droppable } from '@hello-pangea/dnd';
import type { DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import { colorTokens } from '../../theme';
import type { Pitch, Vote, Appetite } from '../../types/models';
import PitchCard from './PitchCard/PitchCard';

interface BucketColumnProps {
  tier: number | null; // null for "Unsorted" column
  pitches: Pitch[];
  votes: Record<string, Vote>;
  onAppetiteChange: (pitchId: string, appetite: Appetite | null) => void;
}

/**
 * Represents a tier bucket column in the voting board
 */
const BucketColumn = ({ tier, pitches, votes, onAppetiteChange }: BucketColumnProps) => {
  const isUnsorted = tier === null;
  const columnId = isUnsorted ? 'unsorted' : `tier-${tier}`;
  const title = isUnsorted ? 'Unsorted' : `Tier ${tier}`;
  
  // Get background color for the column header
  const getHeaderColor = () => {
    if (isUnsorted) return 'background.paper'; // Use default paper color
    return colorTokens.tiers[tier as keyof typeof colorTokens.tiers];
  };

  // Filter pitches that belong to this column
  const filteredPitches = pitches.filter(pitch => {
    if (isUnsorted) {
      // Show in unsorted if it doesn't have a tier assigned
      return !votes[pitch.id]?.tier;
    } 
    // Show in specific tier column if its tier matches
    return votes[pitch.id]?.tier === tier;
  });

  return (
    <Box 
      sx={{ 
        width: 280, 
        minWidth: 280, 
        mr: 2, 
        height: 'calc(100vh - 136px)',
        display: 'flex',
        flexDirection: 'column'
      }}
      role="region"
      aria-label={`${title} bucket`}
    >
      {/* Column header */}
      <Paper 
        sx={{
          p: 1.5,
          mb: 2,
          backgroundColor: getHeaderColor(),
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      >
        <Typography variant="h6">
          {title} ({filteredPitches.length})
        </Typography>
      </Paper>
      
      {/* Droppable area */}
      <Droppable droppableId={columnId}>
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <Paper
            ref={provided.innerRef}
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
