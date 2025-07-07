import React, { useRef, useEffect } from 'react';
import { 
  Box, 
  Container
} from '@mui/material';
import { DragDropContext } from '@hello-pangea/dnd';
import InterestColumn from './InterestColumn';
import type { DropResult } from '@hello-pangea/dnd';
import type { Pitch, Vote, InterestLevel } from '../../types/models';
import { setupAutoScroll } from '../../utils/autoScroll';
import { initEnhancedDropDetection, cleanupEnhancedDropDetection } from '../../utils/enhancedDropDetection';

// Use InterestColumn component now

// Interest level labels that correspond to each level (1-8)
// We're displaying these in reverse order so the most interested is on the left
const INTEREST_LEVEL_LABELS = [
  'Extremely Interested',  // Level 8
  'Very Interested',      // Level 7
  'Fairly Interested',    // Level 6
  'Interested',           // Level 5
  'Moderately Interested', // Level 4
  'Somewhat Interested',  // Level 3
  'Slightly Interested',  // Level 2
  'Not Interested'        // Level 1
];

// Map from display index (0-7) to actual interest level (8-1)
const DISPLAY_TO_INTEREST_LEVEL = [8, 7, 6, 5, 4, 3, 2, 1];

// Interest level column header colors (matches the tier column style but with purple hues)
const INTEREST_LEVEL_COLORS = [
  '#4a148c',  // Very dark purple (Extremely Interested)
  '#6a1b9a',  // Dark purple (Very Interested)
  '#7b1fa2',  // Medium-dark purple (Fairly Interested)
  '#8e24aa',  // Medium purple (Interested) 
  '#9c27b0',  // Purple (Moderately Interested)
  '#ab47bc',  // Light purple (Somewhat Interested)
  '#ba68c8',  // Very light purple (Slightly Interested)
  '#ce93d8'   // Pale purple (Not Interested)
];

interface InterestRankingProps {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  onSetInterest: (id: string, interestLevel: InterestLevel) => void;
}

/**
 * Second stage of voting - allows users to rank their interest level for each problem
 */
const InterestRanking: React.FC<InterestRankingProps> = ({ 
  pitches,
  votes,
  onSetInterest
}) => {
  // Reference to the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Setup auto-scroll and enhanced drop detection for the container
  useEffect(() => {
    // Setup auto-scroll for the container
    const cleanupScroll = setupAutoScroll(containerRef.current);
    
    // Initialize enhanced drop detection
    initEnhancedDropDetection();
    
    // Return cleanup function
    return () => {
      if (cleanupScroll) cleanupScroll();
      cleanupEnhancedDropDetection();
    };
  }, []);
  // Filter pitches that have a tier assigned
  const rankedPitches = React.useMemo(() => {
    return pitches
      .filter(pitch => votes[pitch.id]?.tier !== undefined)
      .sort((a, b) => {
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
    
    // Initialize columns with empty arrays
    for (let i = 1; i <= 8; i++) {
      columns[`interest-${i}`] = [];
    }
    
    // Add pitches to their respective columns
    rankedPitches.forEach(pitch => {
      const interestLevel = votes[pitch.id]?.interestLevel;
      if (interestLevel) {
        columns[`interest-${interestLevel}`].push(pitch);
      } else {
        // Default new pitches to a corresponding interest level based on their priority tier
        const tier = votes[pitch.id]?.tier;
        if (!tier) {
          // If there's no tier assigned, don't try to default it
          return;
        }
        
        // More nuanced interest level defaulting
        let defaultInterestLevel: InterestLevel;
        
        // Map tier 1 (highest priority) to level 8 (extremely interested), and so on
        if (tier === 1) defaultInterestLevel = 8;       // Tier 1 → Extremely Interested
        else if (tier === 2) defaultInterestLevel = 7;  // Tier 2 → Very Interested
        else if (tier === 3) defaultInterestLevel = 6;  // Tier 3 → Fairly Interested
        else if (tier === 4) defaultInterestLevel = 5;  // Tier 4 → Interested
        else if (tier === 5) defaultInterestLevel = 4;  // Tier 5 → Moderately Interested
        else if (tier === 6) defaultInterestLevel = 3;  // Tier 6 → Somewhat Interested
        else if (tier === 7) defaultInterestLevel = 2;  // Tier 7 → Slightly Interested
        else defaultInterestLevel = 1;                  // Tier 8 → Not Interested
        
        columns[`interest-${defaultInterestLevel}`].push(pitch);
      }
    });
    
    return columns;
  }, [rankedPitches, votes]);
  
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    
    // Drop outside valid area
    if (!destination) return;
    
    const destId = destination.droppableId;
    
    // If dropped in an interest level column
    if (destId.startsWith('interest-')) {
      const interestLevel = parseInt(destId.replace('interest-', '')) as InterestLevel;
      
      // Update the interest level for this pitch
      onSetInterest(draggableId, interestLevel);
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
            {Array.from({ length: 8 }).map((_, index) => {
              // Map the display index to the actual interest level
              const level = DISPLAY_TO_INTEREST_LEVEL[index];
              const columnId = `interest-${level}`;
              const label = INTEREST_LEVEL_LABELS[index];
              const color = INTEREST_LEVEL_COLORS[index];
              const columnPitches = interestColumns[columnId] || [];
              
              return (
                <Box 
                  sx={{ 
                    width: `calc((100% - 14px) / 8)`, // Dynamic width based on column count with 2px margin between
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
