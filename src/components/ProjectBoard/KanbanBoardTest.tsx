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
      
      // Update interest progress in app state
      onUpdateInterestProgress(completed, total);
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
