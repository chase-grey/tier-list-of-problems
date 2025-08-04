import type { Project, ProjectVote } from '../../types/project-models';

export interface TaskItem {
  id: string;
  task: string;
  assigned_To: string;
  assignee: string;
  Status: string;
  priority: string;
  due_Date: string;
}



// Define column structure with tasks
export interface KanbanColumn {
  title: string;
  items: TaskItem[];
  color?: string; // Added color property for custom column header styling
}

export interface KanbanColumns {
  [key: string]: KanbanColumn;
}



// Helper function to convert projects to task items
export const convertProjectsToTaskItems = (
  projects: Project[], 
  votes: Record<string, ProjectVote>
): TaskItem[] => {
  return projects.map(project => ({
    id: project.id,
    task: project.title,
    assigned_To: project.details.pointPerson || 'Unassigned',
    assignee: 'Team',
    Status: votes[project.id]?.priority || 'To-Do',
    priority: project.appetite,
    due_Date: project.details.targetDate || 'Not set',
  }));
};
