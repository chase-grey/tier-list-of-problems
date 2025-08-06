import { useState, useEffect, useRef } from 'react';
import { Box, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { Pitch, Vote, Tier, Appetite } from '../../types/models';
import BucketColumn from './BucketColumn';
import ErrorBoundary from '../ErrorBoundary';
import { isDragAndDropSupported } from '../../utils/dndDetection';
import { initEnhancedDropDetection, cleanupEnhancedDropDetection } from '../../utils/enhancedDropDetection';

interface KanbanContainerProps {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  onDragEnd: (result: DropResult) => void;
  onAppetiteChange: (pitchId: string, appetite: Appetite | null) => void;
  userRole?: string | null;
  readOnly?: boolean; // Whether the component is in read-only mode (for completed stages)
}

/**
 * Main drag-and-drop container for organizing pitches into tier buckets
 * with feature detection and fallback for incompatible browsers
 */
const KanbanContainer = ({ 
  pitches, 
  votes, 
  onDragEnd,
  onAppetiteChange,
  userRole,
  readOnly = false
}: KanbanContainerProps) => {
  // Reference to the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);
  // State for drag-and-drop support detection
  const [isDndSupported, setIsDndSupported] = useState<boolean | null>(null);
  const [hasDndError, setHasDndError] = useState(false);
  
  // Generate array of tier numbers 1-8
  const tiers = Array.from({ length: 8 }, (_, i) => i + 1) as Tier[];
  
  // Show total pitch count for validation
  const TOTAL = pitches.length;
  
  // We always show the unsorted column now regardless of whether there are any uncategorized pitches
  const columnCount = 9; // Always 9 columns (8 tier columns + 1 unsorted column)

  // Detect drag-and-drop support on mount and setup auto-scroll and enhanced drop detection
  useEffect(() => {
    // Check for drag-and-drop support
    const supported = isDragAndDropSupported();
    setIsDndSupported(supported);
    
    // Initialize enhanced drop detection
    initEnhancedDropDetection();
    
    // Return cleanup function
    return () => {
      cleanupEnhancedDropDetection();
    };
  }, []);
  
  // Fallback UI for handling pitch tier assignment without drag-and-drop
  const renderFallbackUI = () => {
    // Message to display based on mode
    const message = readOnly
      ? "You're viewing your previous priority rankings in read-only mode."
      : "Using dropdown selection mode for tier assignment since drag-and-drop functionality isn't available in your environment.";
      
    return (
    <Box sx={{ p: 2 }}>
      <Alert 
        severity="info" 
        sx={{ mb: 2 }}
      >
        {message}
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
                disabled={readOnly}
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
                    <MenuItem key={tier} value={tier === null ? '' : tier}>
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
                    // Toggle appetite only if not in read-only mode
                    if (!readOnly) {
                      const currentAppetite = votes[pitch.id]?.appetite;
                      const newAppetite = currentAppetite === appetite ? null : appetite;
                      onAppetiteChange(pitch.id, newAppetite);
                    }
                  }}
                  disabled={readOnly}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: readOnly ? 'default' : 'pointer',
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
  };

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
        <DragDropContext onDragEnd={readOnly ? () => {} : onDragEnd}>
          <Box 
            ref={containerRef}
            sx={{ 
              display: 'flex', 
              flexWrap: { xs: 'wrap', lg: 'nowrap' }, // Wrap on smaller screens, no wrap on large screens
              justifyContent: 'space-between',
              p: 0.5, // Standardized padding (8px)
              pb: 0.5, // Standardized padding (8px)
              height: { xs: 'auto', lg: 'calc(100vh - 100px)' }, // More vertical space on large screens
              maxWidth: '100%', // Ensure it doesn't exceed viewport width
              overflowX: { xs: 'hidden', lg: 'auto' }, // Only allow horizontal scroll on large screens if needed
              overflowY: { xs: 'auto', lg: 'hidden' }, // Allow vertical scroll on small screens

              '&::-webkit-scrollbar': {
                height: '4px',
                width: '4px',
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
            {/* Unsorted column - always visible so users can move cards back to unranked state */}
            <BucketColumn
              tier={null}
              pitches={pitches}
              votes={votes}
              onAppetiteChange={readOnly ? () => {} : onAppetiteChange}
              columnCount={columnCount} // Always 9 columns
              userRole={userRole}
              readOnly={readOnly}
            />
            
            {/* Tier columns 1-8 */}
            {tiers.map(tier => (
              <BucketColumn
                key={`tier-${tier}`}
                tier={tier}
                pitches={pitches}
                votes={votes}
                onAppetiteChange={readOnly ? () => {} : onAppetiteChange}
                columnCount={columnCount} // Always 9 columns
                userRole={userRole}
                readOnly={readOnly}
              />
            ))}
          </Box>
        </DragDropContext>
      </ErrorBoundary>
    </>
  );
};

export default KanbanContainer;
