import { Box } from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { Pitch, Vote, Tier, Appetite } from '../../types/models';
import BucketColumn from './BucketColumn';
import AppetiteLegend from './AppetiteLegend';

interface KanbanContainerProps {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  onDragEnd: (result: DropResult) => void;
  onAppetiteChange: (pitchId: string, appetite: Appetite | null) => void;
}

/**
 * Main drag-and-drop container for organizing pitches into tier buckets
 */
const KanbanContainer = ({ 
  pitches, 
  votes, 
  onDragEnd,
  onAppetiteChange
}: KanbanContainerProps) => {
  // Generate array of tier numbers 1-8
  const tiers = Array.from({ length: 8 }, (_, i) => i + 1) as Tier[];
  
  return (
    <>
      <AppetiteLegend />
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Box 
          sx={{ 
            display: 'flex', 
            overflowX: 'auto',
            p: 2,
            pb: 4 // Extra padding at bottom for better scrolling experience
          }}
        >
          {/* Unsorted column first */}
          <BucketColumn
            tier={null}
            pitches={pitches}
            votes={votes}
            onAppetiteChange={onAppetiteChange}
          />
          
          {/* Tier columns 1-8 */}
          {tiers.map(tier => (
            <BucketColumn
              key={`tier-${tier}`}
              tier={tier}
              pitches={pitches}
              votes={votes}
              onAppetiteChange={onAppetiteChange}
            />
          ))}
        </Box>
      </DragDropContext>
    </>
  );
};

export default KanbanContainer;
