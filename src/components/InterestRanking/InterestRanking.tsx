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
// We're displaying these in reverse order so the most interested is on the left
const INTEREST_LEVEL_LABELS = [
  'Very Interested',      // Level 4
  'Interested',           // Level 3
  'Somewhat Interested',  // Level 2
  'Not Interested'        // Level 1
];

// Map from display index (0-3) to actual interest level (4-1)
const DISPLAY_TO_INTEREST_LEVEL = [4, 3, 2, 1];

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
  onSetInterest: (id: string, interestLevel: InterestLevel) => void;
  userRole?: string | null;
}

/**
 * Second stage of voting - allows users to rank their interest level for each problem
 */
const InterestRanking: React.FC<InterestRankingProps> = ({ 
  pitches,
  votes,
  onSetInterest,
  userRole
}) => {
  // Reference to the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Debug logging on component mount
  useEffect(() => {
    console.log('[DEBUG] InterestRanking component mounted', {
      pitchesProvided: Array.isArray(pitches) ? pitches.length : 'not an array',
      votesProvided: votes ? Object.keys(votes).length : 'null votes',
      userRole
    });
  }, []);
  
  // Setup enhanced drop detection for the container
  useEffect(() => {
    // Initialize enhanced drop detection
    console.log('[DEBUG] Initializing enhanced drop detection');
    initEnhancedDropDetection();
    
    // Return cleanup function
    return () => {
      console.log('[DEBUG] Cleaning up enhanced drop detection');
      cleanupEnhancedDropDetection();
    };
  }, []);
  
  // Get all pitches that should be shown in this stage (includes all pitches now)
  const pitchesForInterestStage = React.useMemo(() => {
    // Make sure we have a valid array of pitches
    if (!Array.isArray(pitches)) {
      console.error('[DEBUG] pitches is not an array in InterestRanking');
      return [];
    }
    
    // Filter out any invalid pitches (those without an id)
    const validPitches = pitches.filter(p => p && (p.id !== undefined && p.id !== null));
    console.log(`[DEBUG] Found ${validPitches.length}/${pitches.length} valid pitches`);
    
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
    console.log('[DEBUG] Creating interest columns');
    
    const columns: Record<string, Pitch[]> = {};
    
    // Add unsorted column
    columns['interest-unsorted'] = [];
    
    // Initialize interest level columns with empty arrays
    for (let i = 1; i <= 4; i++) {
      columns[`interest-${i}`] = [];
    }
    
    // Create arrays to collect pitches for each column before randomizing
    const unsortedPitches: Pitch[] = [];
    
    console.log('[DEBUG] Column initialization complete', { 
      columnKeys: Object.keys(columns),
      pitchesForInterestStage: Array.isArray(pitchesForInterestStage) ? pitchesForInterestStage.length : 'not an array' 
    });
    
    // Add pitches to their respective columns
    console.log('[DEBUG] Starting to assign pitches to columns');
    
    let processedCount = 0;
    let errorCount = 0;
    
    // Process each pitch - now with better error handling to ensure all pitches are accounted for
    pitchesForInterestStage.forEach((pitch, index) => {
      try {
        // Every pitch should have an ID at this point since we filtered in pitchesForInterestStage
        const pitchId = pitch.id;
        
        // Get interest level and tier with proper null/undefined checking
        const vote = votes ? votes[pitchId] : undefined;
        const interestLevel = vote?.interestLevel;
        const tier = vote?.tier;
        
        // Log for debugging
        console.log(`[DEBUG] Processing pitch ${index}: ${pitch.title?.substring(0, 20) || 'Unknown title'}...`, {
          id: pitchId,
          interestLevel,
          tier,
          hasVote: !!vote
        });

        // Flag to track if pitch was placed in a column
        let pitchPlaced = false;

        // Handle explicit interest level assignment
        if (interestLevel !== undefined) {
          if (interestLevel === null) {
            // Explicitly set to unsorted
            unsortedPitches.push(pitch);
            console.log(`[DEBUG] Pitch ${pitchId} placed in unsorted (explicit unsorted)`);
            pitchPlaced = true;
          } else {
            // Add to the appropriate interest level column
            const columnKey = `interest-${interestLevel}`;
            if (columns[columnKey]) {
              columns[columnKey].push(pitch);
              console.log(`[DEBUG] Pitch ${pitchId} placed in interest level ${interestLevel} (explicit)`);
              pitchPlaced = true;
            }
          }
        }
        
        // If pitch hasn't been placed yet, process based on tier
        if (!pitchPlaced) {
          if (!tier) {
            // No tier means it goes in unsorted
            unsortedPitches.push(pitch);
            console.log(`[DEBUG] Pitch ${pitchId} placed in unsorted (no tier)`);
            pitchPlaced = true;
          } else {
            // Map tier to interest level
            const defaultInterestLevel = mapTierToInterestLevel(tier);
            console.log(`[DEBUG] Mapped tier ${tier} to interest level ${defaultInterestLevel} for pitch ${pitchId}`);
            
            if (defaultInterestLevel === null) {
              // Null interest level means unsorted
              unsortedPitches.push(pitch);
              console.log(`[DEBUG] Pitch ${pitchId} placed in unsorted (null default interest)`);
              pitchPlaced = true;
            } else {
              // Add to the appropriate interest level column
              const columnKey = `interest-${defaultInterestLevel}`;
              if (columns[columnKey]) {
                columns[columnKey].push(pitch);
                console.log(`[DEBUG] Pitch ${pitchId} placed in interest level ${defaultInterestLevel} (default)`);
                pitchPlaced = true;
              }
            }
          }
        }

        // Safety check - if pitch wasn't placed anywhere yet, put it in unsorted
        if (!pitchPlaced) {
          unsortedPitches.push(pitch);
          console.log(`[DEBUG] Pitch ${pitchId} placed in unsorted as a fallback measure`);
        }
        
        processedCount++;
      } catch (error) {
        // If there's an error processing a pitch, put it in unsorted rather than skipping it
        console.error(`[DEBUG] Error processing pitch at index ${index}:`, error);
        errorCount++;
        
        // Even with error, make sure the pitch is included somewhere
        if (pitch && pitch.id) {
          unsortedPitches.push(pitch);
          console.log(`[DEBUG] Pitch ${pitch.id} placed in unsorted due to processing error`);
        }
      }
    });
    
    console.log('[DEBUG] Finished assigning pitches to columns', {
      processedCount,
      errorCount,
      unsortedCount: unsortedPitches.length
    });
    
    // Sort interest level columns by timestamp for consistent ordering
    console.log('[DEBUG] Sorting interest level columns by timestamp');
    
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
              console.error(`[DEBUG] Error sorting column ${columnId}:`, error);
              return 0;
            }
          });
          console.log(`[DEBUG] Sorted column ${columnId} with ${columns[columnId].length} pitches`);
        } else {
          console.log(`[DEBUG] Column ${columnId} has no pitches to sort`);
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error during column sorting:', error);
    }
    
    // Randomize unsorted pitches to ensure more even data collection
    // Make sure unsortedPitches is initialized properly to prevent runtime errors
    console.log('[DEBUG] Randomizing unsorted pitches', { 
      unsortedPitchesIsArray: Array.isArray(unsortedPitches),
      unsortedPitchesLength: Array.isArray(unsortedPitches) ? unsortedPitches.length : 'N/A' 
    });
    
    try {
      columns['interest-unsorted'] = Array.isArray(unsortedPitches) ? 
        unsortedPitches.sort(() => Math.random() - 0.5) : [];
    } catch (error) {
      console.error('[DEBUG] Error randomizing unsorted pitches:', error);
      columns['interest-unsorted'] = [];
    }
    
    // Final column summary for debugging
    const unsortedCount = columns['interest-unsorted']?.length || 0;
    const level1Count = columns['interest-1']?.length || 0;
    const level2Count = columns['interest-2']?.length || 0;
    const level3Count = columns['interest-3']?.length || 0;
    const level4Count = columns['interest-4']?.length || 0;
    
    const totalAssignedPitches = unsortedCount + level1Count + level2Count + level3Count + level4Count;
    
    console.log('[DEBUG] Final interest columns', {
      'interest-unsorted': unsortedCount,
      'interest-1': level1Count,
      'interest-2': level2Count,
      'interest-3': level3Count,
      'interest-4': level4Count,
      totalAssignedPitches,
      originalPitchesCount: Array.isArray(pitches) ? pitches.length : 0,
      validPitchesCount: Array.isArray(pitchesForInterestStage) ? pitchesForInterestStage.length : 0
    });
    
    // Verify that all pitches are accounted for
    if (totalAssignedPitches !== pitchesForInterestStage.length) {
      console.error(`[DEBUG] MISMATCH: ${totalAssignedPitches} pitches in columns vs ${pitchesForInterestStage.length} in original array!`);
      
      // Find missing pitches
      const assignedPitchIds = new Set([
        ...(columns['interest-unsorted'] || []),
        ...(columns['interest-1'] || []),
        ...(columns['interest-2'] || []),
        ...(columns['interest-3'] || []),
        ...(columns['interest-4'] || [])
      ].map(p => p.id));
      
      const missingPitches = pitchesForInterestStage.filter(p => !assignedPitchIds.has(p.id));
      console.error('[DEBUG] Missing pitches:', missingPitches.map(p => ({ id: p.id, title: p.title })));
      
      // Add missing pitches to unsorted as a last resort
      missingPitches.forEach(pitch => {
        columns['interest-unsorted'].push(pitch);
        console.log(`[DEBUG] Added missing pitch ${pitch.id} to unsorted column`);
      });
    }
    
    return columns;
  }, [pitchesForInterestStage, votes]);
  
  const handleDragEnd = (result: DropResult) => {
    console.log('[DEBUG] Drag ended', result);
    
    const { destination, draggableId, source } = result;
    
    // Drop outside valid area
    if (!destination) {
      console.log('[DEBUG] Dropped outside valid area');
      return;
    }
    
    const destId = destination.droppableId;
    console.log(`[DEBUG] Dropped in ${destId} (from ${source.droppableId})`);
    
    try {
      // If dropped in unsorted column
      if (destId === 'interest-unsorted') {
        console.log(`[DEBUG] Setting interest level to null for pitch ${draggableId}`);
        // Use null to unset the interest level - the App component will handle it with the proper action
        onSetInterest(draggableId, null);
      }
      // If dropped in an interest level column
      else if (destId.startsWith('interest-')) {
        const interestLevel = parseInt(destId.replace('interest-', '')) as InterestLevel;
        console.log(`[DEBUG] Setting interest level to ${interestLevel} for pitch ${draggableId}`);
        
        // Update the interest level for this pitch
        onSetInterest(draggableId, interestLevel);
      } else {
        console.warn(`[DEBUG] Dropped in unknown destination: ${destId}`);
      }
    } catch (error) {
      console.error('[DEBUG] Error handling drag end:', error);
    }
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth={false} sx={{ height: '100%', display: 'flex', flexDirection: 'column', pt: 0.5, px: 1 }}>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Box 
            ref={containerRef}
            sx={{ 
              display: 'flex', 
              flexWrap: { xs: 'wrap', lg: 'nowrap' }, // Wrap on smaller screens, no wrap on large screens
              justifyContent: 'space-between',
              pb: 2, // Reduced bottom padding
              height: { xs: 'auto', lg: 'calc(100vh - 100px)' }, // Increased vertical space on large screens
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
          >
            {/* Unsorted column */}
            <Box 
              sx={{ 
                width: `calc((100% - 16px) / 5)`, // Dynamic width based on 5 columns (4 interest levels + 1 unsorted)
                minWidth: '200px', // Minimum usable width
                mx: 1, // Margin on both sides for spacing
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
                    mx: 1, // Margin on both sides for spacing
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
