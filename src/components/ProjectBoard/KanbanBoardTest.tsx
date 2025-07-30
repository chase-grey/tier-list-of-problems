import React from 'react';
import KanbanBoard from './KanbanBoard';
import { TasksData } from './KanbanData';

/**
 * Test component to demonstrate the Kanban board functionality
 */
const KanbanBoardTest: React.FC = () => {
  return (
    <KanbanBoard taskItems={TasksData} userRole="admin" />
  );
};

export default KanbanBoardTest;
