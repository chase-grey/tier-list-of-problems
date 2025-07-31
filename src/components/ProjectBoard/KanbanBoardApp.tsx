import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import KanbanBoard from './KanbanBoard';
import { convertProjectsToTaskItems } from './KanbanData';
import type { Project, ProjectVote } from '../../types/project-models';

interface KanbanBoardAppProps {
  projects: Project[];
  votes: Record<string, ProjectVote>;
  userRole?: string | null;
}

const KanbanBoardApp: React.FC<KanbanBoardAppProps> = ({ 
  projects, 
  votes,
  userRole 
}) => {
  // Convert projects to task items format for kanban board
  const taskItems = useMemo(() => 
    convertProjectsToTaskItems(projects, votes),
  [projects, votes]);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <KanbanBoard taskItems={taskItems} userRole={userRole} />
    </Box>
  );
};

export default KanbanBoardApp;
