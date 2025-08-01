import React from 'react';
import KanbanBoard from './KanbanBoard';
import { convertProjectsToTaskItems } from './KanbanData';
// Import sample project data
import { sampleProjects } from '../../data/sampleProjectInterestData';

/**
 * Test component to display Project Interest cards for Stage 2
 * Uses the existing KanbanBoard component with real project data
 */
const KanbanBoardTest: React.FC = () => {
  // Get the user role from session/context - using 'developer' as default for testing
  // In a real implementation, this would come from the app state
  const userRole = 'developer';
  
  // Convert our sample projects to the TaskItem format expected by KanbanBoard
  // Using an empty object for votes since we don't have any votes yet
  const taskItems = convertProjectsToTaskItems(sampleProjects, {});
  
  return (
    <KanbanBoard taskItems={taskItems} userRole={userRole} />
  );
};

export default KanbanBoardTest;
