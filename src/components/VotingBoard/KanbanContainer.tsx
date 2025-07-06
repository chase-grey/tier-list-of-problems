import { useState, useEffect } from 'react';
import { Box, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { Pitch, Vote, Tier, Appetite } from '../../types/models';
import BucketColumn from './BucketColumn';
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
  
  // Check if there are any uncategorized pitches
  const hasUncategorizedPitches = pitches.some(pitch => !votes[pitch.id]?.tier);

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
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between' }}>
        {pitches.map((pitch) => (
          <Box 
            key={pitch.id} 
            sx={{ 
              width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)', lg: 'calc(25% - 16px)' },
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
                {tiers.map(tier => {
                  // Get descriptive priority name for each tier
                  const priorityName = (() => {
                    switch (tier) {
                      case 1: return 'Highest Priority';
                      case 2: return 'Very High Priority';
                      case 3: return 'High Priority';
                      case 4: return 'Moderate Priority';
                      case 5: return 'Low-Moderate Priority';
                      case 6: return 'Low Priority';
                      case 7: return 'Very Low Priority';
                      case 8: return 'Not a Priority';
                      default: return `Tier ${tier}`;
                    }
                  })();
                  
                  return (
                    <MenuItem key={tier} value={tier}>
                      {priorityName}
                    </MenuItem>
                  );
                })}
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
    return renderFallbackUI();
  }

  // Main drag-and-drop UI with error boundary
  return (
    <>
      <ErrorBoundary 
        fallback={renderFallbackUI()}
        onReset={() => setHasDndError(false)}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <Box 
            sx={{ 
              display: 'flex', 
              flexWrap: { xs: 'wrap', lg: 'nowrap' }, // Wrap on smaller screens, no wrap on large screens
              justifyContent: 'space-between',
              p: 2,
              pb: 4, // Extra padding at bottom for better scrolling experience
              height: { xs: 'auto', lg: 'calc(100vh - 148px)' }, // Full height on large screens
              maxWidth: '100%', // Ensure it doesn't exceed viewport width
              overflowX: { xs: 'hidden', lg: 'auto' }, // Only allow horizontal scroll on large screens if needed
              overflowY: { xs: 'auto', lg: 'hidden' }, // Allow vertical scroll on small screens
              '&::-webkit-scrollbar': {
                height: '8px',
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
            aria-label={`Kanban board with ${TOTAL} pitches to categorize`}
          >
            {/* Unsorted column - only show if there are uncategorized pitches */}
            {hasUncategorizedPitches && (
              <BucketColumn
                tier={null}
                pitches={pitches}
                votes={votes}
                onAppetiteChange={onAppetiteChange}
                columnCount={hasUncategorizedPitches ? 9 : 8} // 9 columns if showing unsorted, 8 otherwise
              />
            )}
            
            {/* Tier columns 1-8 */}
            {tiers.map(tier => (
              <BucketColumn
                key={`tier-${tier}`}
                tier={tier}
                pitches={pitches}
                votes={votes}
                onAppetiteChange={onAppetiteChange}
                columnCount={hasUncategorizedPitches ? 9 : 8} // 9 columns if showing unsorted, 8 otherwise
              />
            ))}
          </Box>
        </DragDropContext>
      </ErrorBoundary>
    </>
  );
};

export default KanbanContainer;
