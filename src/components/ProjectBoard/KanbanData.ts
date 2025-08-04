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
  votes: Record<string, ProjectVote>,
  isInterestMode: boolean = false
): TaskItem[] => {
  return projects.map(project => {
    // Get the vote for this project
    const vote = votes[project.id];
    
    // Determine status based on mode (interest or priority)
    let status = 'unsorted'; // Default status
    
    if (isInterestMode) {
      // Interest mode - map interestLevel to Status
      if (vote?.interestLevel) {
        // Convert interest level to column ID format (lowercase)
        switch(vote.interestLevel) {
          case 'HIGHEST': status = 'highest'; break;
          case 'HIGH': status = 'high'; break;
          case 'MEDIUM': status = 'medium'; break;
          case 'LOW': status = 'low'; break;
          default: status = 'unsorted';
        }
      }
    } else {
      // Priority mode - use priority directly
      status = vote?.priority || 'unsorted';
    }
    
    return {
      id: project.id,
      task: project.title,
      assigned_To: project.details.pointPerson || 'Unassigned',
      assignee: 'Team',
      Status: status,
      priority: project.appetite,
      due_Date: project.details.targetDate || 'Not set',
    };
  });
};
