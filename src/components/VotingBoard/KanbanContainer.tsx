import { useState, useEffect } from 'react';
import { Box, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { Pitch, Vote, Tier, Appetite } from '../../types/models';
import BucketColumn from './BucketColumn';
import AppetiteLegend from './AppetiteLegend';
import ErrorBoundary from '../ErrorBoundary';
import { isDragAndDropSupported } from '../../utils/dndDetection';

interface KanbanContainerProps {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  onDragEnd: (result: DropResult) => void;
  onAppetiteChange: (pitchId: string, appetite: Appetite | null) => void;
}

/**
 * Main drag-and-drop container for organizing pitches into tier buckets
 * with feature detection and fallback for incompatible browsers
 */
const KanbanContainer = ({ 
  pitches, 
  votes, 
  onDragEnd,
  onAppetiteChange
}: KanbanContainerProps) => {
  // State for drag-and-drop support detection
  const [isDndSupported, setIsDndSupported] = useState<boolean | null>(null);
  const [hasDndError, setHasDndError] = useState(false);
  
  // Generate array of tier numbers 1-8
  const tiers = Array.from({ length: 8 }, (_, i) => i + 1) as Tier[];
  
  // Show total pitch count for validation
  const TOTAL = pitches.length;

  // Detect drag-and-drop support on mount
  useEffect(() => {
    // Check for drag-and-drop support
    const supported = isDragAndDropSupported();
    setIsDndSupported(supported);
  }, []);
  
  // Fallback UI for handling pitch tier assignment without drag-and-drop
  const renderFallbackUI = () => (
    <Box sx={{ p: 2 }}>
      <Alert 
        severity="info" 
        sx={{ mb: 2 }}
      >
        Using dropdown selection mode for tier assignment since drag-and-drop functionality isn't available in your environment.
      </Alert>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {pitches.map((pitch) => (
          <Box 
            key={pitch.id} 
            sx={{ 
              width: 280, 
              p: 2, 
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 1,
              mb: 2 
            }}
          >
            <Box sx={{ mb: 2 }}>
              <strong>{pitch.title}</strong>
              <div>{pitch.details.problem}</div>
            </Box>
            
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel>Tier</InputLabel>
              <Select
                value={votes[pitch.id]?.tier || ''}
                label="Tier"
                onChange={(e) => {
                  const tier = e.target.value ? Number(e.target.value) as Tier : undefined;
                  const result = {
                    draggableId: pitch.id,
                    destination: tier ? { droppableId: `tier-${tier}` } : null
                  } as DropResult;
                  onDragEnd(result);
                }}
              >
                <MenuItem value="">
                  <em>Unsorted</em>
                </MenuItem>
                {tiers.map(tier => (
                  <MenuItem key={tier} value={tier}>
                    Tier {tier}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {(['S', 'M', 'L'] as Appetite[]).map(appetite => (
                <Box 
                  key={appetite}
                  component="button"
                  onClick={() => {
                    // Toggle appetite
                    const currentAppetite = votes[pitch.id]?.appetite;
                    const newAppetite = currentAppetite === appetite ? null : appetite;
                    onAppetiteChange(pitch.id, newAppetite);
                  }}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    bgcolor: votes[pitch.id]?.appetite === appetite ? 
                      appetite === 'S' ? '#2ecc71' : 
                      appetite === 'M' ? '#f39c12' : 
                      '#e74c3c' : 
                      'rgba(255,255,255,0.1)',
                    color: '#fff',
                    '&:hover': {
                      opacity: 0.9
                    }
                  }}
                >
                  {appetite}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );

  // We set hasDndError directly in the onReset prop of ErrorBoundary

  // If we've detected that drag-and-drop isn't supported or an error occurred, show fallback UI
  if (isDndSupported === false || hasDndError) {
    return (
      <>
        <AppetiteLegend />
        {renderFallbackUI()}
      </>
    );
  }

  // Main drag-and-drop UI with error boundary
  return (
    <>
      <AppetiteLegend />
      
      <ErrorBoundary 
        fallback={renderFallbackUI()}
        onReset={() => setHasDndError(false)}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <Box 
            sx={{ 
              display: 'flex', 
              overflowX: 'auto',
              p: 2,
              pb: 4, // Extra padding at bottom for better scrolling experience
              height: 'calc(100vh - 148px)', // Adjust height to account for AppBar and padding
              '&::-webkit-scrollbar': {
                height: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
            }}
            aria-label={`Kanban board with ${TOTAL} pitches to categorize`}
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
      </ErrorBoundary>
    </>
  );
};

export default KanbanContainer;
