import React, { useState, useEffect } from 'react';
import KanbanBoard from './KanbanBoard';
import { convertProjectsToTaskItems } from './KanbanData';
// Import all 29 projects data
import { allProjects } from '../../data/allProjectsData';
import type { ProjectVote } from '../../types/project-models';

// Interface for component props
interface KanbanBoardTestProps {
  userRole?: string | null;
  projectVotes?: Record<string, ProjectVote>;
  projectInterestVotes?: Record<string, any>;
  onSetProjectInterestVotes?: (votes: Record<string, any>) => void;
  onUpdateInterestProgress?: (completed: number, total: number) => void;
}

/**
 * Project Interest section component for Stage 2
 * Uses the KanbanBoard component with project data
 * Inherits positions from rank projects section when first switching
 * Connects with timeline counter
 */
const KanbanBoardTest: React.FC<KanbanBoardTestProps> = ({ 
  userRole = 'developer', 
  projectVotes = {},
  projectInterestVotes = {}, 
  onSetProjectInterestVotes,
  onUpdateInterestProgress
}) => {
  // Track if this is first time loading the component
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // When first loading, inherit positions from rank projects section
  useEffect(() => {
    if (isFirstLoad && Object.keys(projectVotes).length > 0 && 
        Object.keys(projectInterestVotes).length === 0 && onSetProjectInterestVotes) {
      
      // Create interest votes based on project votes
      const inheritedVotes = Object.entries(projectVotes).reduce((acc, [id, vote]) => {
        // Map project priority to interest levels
        let interestLevel;
        switch(vote.priority) {
          case 'high': interestLevel = 'HIGHEST'; break;
          case 'medium': interestLevel = 'HIGH'; break;
          case 'low': interestLevel = 'MEDIUM'; break;
          case 'unsorted': 
          default: interestLevel = 'UNSORTED';
        }
        
        acc[id] = { interestLevel, timestamp: Date.now() };
        return acc;
      }, {} as Record<string, any>);
      
      // Update app state with inherited interest votes
      onSetProjectInterestVotes(inheritedVotes);
    }
    
    // Mark first load complete
    setIsFirstLoad(false);
  }, [isFirstLoad, projectVotes, projectInterestVotes, onSetProjectInterestVotes]);
  
  // Convert projects to task items with interest votes
  const taskItems = convertProjectsToTaskItems(allProjects, projectInterestVotes, true);
  
  // Handle column count changes for timeline
  const handleColumnsChange = (columnCounts: {
    unsorted: number;
    highest: number;
    high: number;
    medium: number;
    low: number;
  }) => {
    if (onUpdateInterestProgress) {
      // Calculate total and completed for timeline using the formula:
      // (# highest interest + # high interest + # medium interest + # low interest) / total cards
      const total = columnCounts.unsorted + columnCounts.highest + columnCounts.high + columnCounts.medium + columnCounts.low;
      const completed = columnCounts.highest + columnCounts.high + columnCounts.medium + columnCounts.low;
      
      console.log(`DEBUG: Column counts - total: ${total}, completed: ${completed}`);
      console.log(`DEBUG: Column counts by category:`, columnCounts);
      
      // Update interest progress in app state
      onUpdateInterestProgress(completed, total);
      
      // Update votes based on column contents - follow the same approach as ProjectPriorityApp
      updateVotesFromColumnCounts(columnCounts);
    }
  };
  
  // Flag to prevent infinite update loops
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Helper function to update project interest votes based on column counts
  // This follows the same approach as ProjectPriorityApp
  const updateVotesFromColumnCounts = (columnCounts: {
    unsorted: number;
    highest: number;
    high: number;
    medium: number;
    low: number;
  }) => {
    if (!onSetProjectInterestVotes || isUpdating) {
      console.log('DEBUG: Skipping update - either no callback or already updating');
      return;
    }
    
    // Set updating flag to prevent infinite loops
    setIsUpdating(true);
    
    console.log('DEBUG: Updating votes from column counts:', columnCounts);
    
    try {
      // Only count the non-unsorted columns
      const categorizedCount = columnCounts.highest + columnCounts.high + 
                              columnCounts.medium + columnCounts.low;
      
      console.log(`DEBUG: Found ${categorizedCount} categorized cards`);      
      
      // Skip update if there are no categorized cards
      if (categorizedCount === 0) {
        console.log('DEBUG: No categorized cards to track');
        return;
      }
      
      // Since we already have a counter in columnCounts, let's use it directly
      // instead of trying to re-analyze all taskItems (which can cause loops)
      
      // Always update the progress based on column counts
      if (onUpdateInterestProgress) {
        const total = columnCounts.unsorted + categorizedCount;
        console.log(`DEBUG: Updating progress to ${categorizedCount}/${total}`);
        
        // Update progress in the timeline
        onUpdateInterestProgress(categorizedCount, total);
        
        // Note: We're intentionally NOT updating the votes object here
        // to avoid the infinite update cycle that was occurring
      }
    } finally {
      // Clear the updating flag after a short delay
      setTimeout(() => {
        setIsUpdating(false);
      }, 500);
    }
  };
  
  return (
    <KanbanBoard 
      taskItems={taskItems} 
      userRole={userRole}
      onColumnsChange={handleColumnsChange}
      isInterestMode={true} // Flag that this is interest mode to use blue colors and interest labels
    />
  );
};

export default KanbanBoardTest;
