import { useState, useRef } from 'react';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Box, Typography } from '@mui/material';
import { Column } from './Column';
import type { Column as ColumnType, Project as ProjectType } from './types';
import type { Project as AppProject } from '../../types/project-models';

const COLUMNS: ColumnType[] = [
  { id: 'UNSORTED', title: 'Unsorted' },
  { id: 'HIGHEST', title: 'Highest Interest' },
  { id: 'HIGH', title: 'High Interest' },
  { id: 'MEDIUM', title: 'Medium Interest' },
  { id: 'LOW', title: 'Low Interest' },
];

interface ProjectInterestRankingProps {
  projects: AppProject[];
  interestVotes: Record<string, any>;
  onSetInterest: (id: string, interestLevel: any) => void;
  userRole?: string | null;
}

/**
 * Project Interest Ranking - Using similar styling as the rank problems section
 */
const ProjectInterestRanking = ({ projects }: ProjectInterestRankingProps) => {
  // Reference to the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Convert app projects to our simpler project type
  const initialProjects: ProjectType[] = projects.map(project => ({
    id: project.id,
    title: project.title,
    description: project.details?.description || 'No description',
    status: 'UNSORTED' // Default to UNSORTED
  }));

  // For demonstration, distribute projects across columns
  const initialTasksWithStatus = initialProjects.map((project, index) => {
    let status: 'UNSORTED' | 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' = 'UNSORTED';
    
    // Distribute evenly for demonstration purposes
    if (index % 5 === 1) status = 'HIGHEST';
    if (index % 5 === 2) status = 'HIGH';
    if (index % 5 === 3) status = 'MEDIUM';
    if (index % 5 === 4) status = 'LOW';
    
    return { ...project, status };
  });

  const [tasksData, setTasksData] = useState<ProjectType[]>(initialTasksWithStatus);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Get the active task being dragged
    const activeTask = tasksData.find(task => task.id === activeId);
    if (!activeTask) return;
    
    // Check if we're dropping directly on a column
    if (overId === 'UNSORTED' || overId === 'HIGHEST' || overId === 'HIGH' || overId === 'MEDIUM' || overId === 'LOW') {
      // We're dropping onto a column - change the task's status
      const newStatus = overId as ProjectType['status'];
      
      // Only update if the status is actually changing
      if (activeTask.status !== newStatus) {
        setTasksData(tasks => 
          tasks.map(task => 
            task.id === activeId ? { ...task, status: newStatus } : task
          )
        );
      }
    } else {
      // We're dropping onto another task
      const overTask = tasksData.find(task => task.id === overId);
      if (!overTask) return;
      
      // If it's the same task or dropping onto itself, do nothing
      if (activeId === overId) return;
      
      // If moving to a different column
      if (activeTask.status !== overTask.status) {
        // Just change the status without reordering
        setTasksData(tasks => 
          tasks.map(task => 
            task.id === activeId ? { ...task, status: overTask.status } : task
          )
        );
        return;
      }
      
      // If reordering within the same column
      setTasksData(tasks => {
        const reorderedTasks = [...tasks];
        
        // First remove the dragged task
        const draggedTaskIndex = reorderedTasks.findIndex(t => t.id === activeId);
        const [draggedTask] = reorderedTasks.splice(draggedTaskIndex, 1);
        
        // Then insert it at the new position
        const dropTargetIndex = reorderedTasks.findIndex(t => t.id === overId);
        reorderedTasks.splice(dropTargetIndex + 1, 0, draggedTask);
        
        return reorderedTasks;
      });
    }
  }

  return (
    <Box sx={{ width: '100%', height: '100%', px: 2, py: 3 }}>
      <Box sx={{ maxWidth: '1200px', margin: '0 auto', mb: 3 }}> 
        <Typography 
          variant="h5" 
          component="h1" 
          sx={{ fontWeight: 'bold', textAlign: 'center', mb: 4 }}
        >
          Project Interest Ranking
        </Typography>
        
        <DndContext onDragEnd={handleDragEnd}>
          <Box 
            ref={containerRef}
            sx={{ 
              display: 'flex', 
              flexWrap: { xs: 'wrap', lg: 'nowrap' }, // Wrap on smaller screens, no wrap on large screens
              justifyContent: 'space-between', // Even distribution across entire width
              p: 1, // Add padding 
              pt: 8, // Extra padding at top to make room for headers
              height: { xs: 'auto', lg: 'calc(100vh - 200px)' }, // Full viewport height minus header on large screens
              width: '100%', // Full width
              maxWidth: '100%', // Ensure it doesn't exceed container width
              overflowX: { xs: 'hidden', lg: 'auto' }, // Only allow horizontal scroll on large screens if needed
              overflowY: 'hidden', // Remove vertical scroll to fix unwanted scrollbar
              gap: 0.5, // Reduced gap between columns
              bgcolor: '#000000', // Black background behind columns
              borderRadius: 2, // Round the corners slightly
              
              '&::-webkit-scrollbar': {
                height: '4px',
                width: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              },
            }}
            aria-label={`Project interest board with ${projects.length} projects`}
          >
            {COLUMNS.map((column) => (
              <Column
                key={column.id}
                column={column}
                projects={tasksData.filter((task) => task.status === column.id)}
              />
            ))}
          </Box>
        </DndContext>
      </Box>
    </Box>
  );
};

export default ProjectInterestRanking;
