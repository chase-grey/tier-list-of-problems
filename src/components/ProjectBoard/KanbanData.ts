import { v4 as uuidv4 } from "uuid";
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

// Initial task data
export const TasksData: TaskItem[] = [
  {
    id: "1",
    task: "Research user needs",
    assigned_To: 'Alex',
    assignee: 'Taylor',
    Status: 'To-Do',
    priority: 'High',
    due_Date: "15-Aug-2023",
  },
  {
    id: "2",
    task: "Design UI components",
    assigned_To: 'Jordan',
    assignee: 'Casey',
    Status: 'To-Do',
    priority: 'Medium',
    due_Date: "18-Aug-2023",
  },
  {
    id: "3",
    task: "Implement API integration",
    assigned_To: 'Morgan',
    assignee: 'Riley',
    Status: 'To-Do',
    priority: 'High',
    due_Date: "20-Aug-2023",
  },
  {
    id: "4",
    task: "Set up unit tests",
    assigned_To: 'Jamie',
    assignee: 'Quinn',
    Status: 'In Progress',
    priority: 'Medium',
    due_Date: "22-Aug-2023",
  },
  {
    id: "5",
    task: "Create documentation",
    assigned_To: 'Avery',
    assignee: 'Dakota',
    Status: 'Done',
    priority: 'Low',
    due_Date: "25-Aug-2023",
  },
];

// Define column structure with tasks
export interface KanbanColumn {
  title: string;
  items: TaskItem[];
  color?: string; // Added color property for custom column header styling
}

export interface KanbanColumns {
  [key: string]: KanbanColumn;
}

// Initial column structure
export const columnsFromBackend: KanbanColumns = {
  [uuidv4()]: {
    title: 'To-Do',
    items: TasksData.filter(item => item.Status === 'To-Do'),
  },
  [uuidv4()]: {
    title: 'In Progress',
    items: TasksData.filter(item => item.Status === 'In Progress'),
  },
  [uuidv4()]: {
    title: 'Testing',
    items: [],
  },
  [uuidv4()]: {
    title: 'Done',
    items: TasksData.filter(item => item.Status === 'Done'),
  },
};

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
