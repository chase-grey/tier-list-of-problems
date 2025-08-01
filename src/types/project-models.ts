/* ─────────────── PROJECT PRIORITIZATION MODELS ─────────────── */
// Using type-only import to fix module loading issue
import type { Appetite } from './models';

/**
 * Project deliverable options
 * Represents the possible deliverables that can be completed for a project
 */
export type Deliverable = 
  | 'Complete the project'
  | 'In QA1'
  | 'Dev comp\'d'
  | 'Get designs approved'
  | 'Get designs out'
  | 'Create a plan for a future project'
  | 'Create a prototype'
  | 'Complete Investigation'
  | string; // For free-text option

/**
 * Available deliverable options as a constant for UI components
 */
export const DELIVERABLE_OPTIONS = [
  'Complete the project',
  'In QA1',
  'Dev comp\'d',
  'Get designs approved',
  'Get designs out',
  'Create a plan for a future project',
  'Create a prototype',
  'Complete Investigation'
];

/**
 * Project priority tiers (reduced from 8 to 5)
 */
export type ProjectPriority = 
  | 'Highest priority'
  | 'High priority'
  | 'Medium Priority'
  | 'Low priority'
  | 'Not a priority';

/**
 * Task in the breakdown table
 * Each task includes various hour estimates and a calculated weighted hours value
 */
export interface Task {
  name: string;
  bestCaseHours: number;
  expectedHours: number;
  worstCaseHours: number;
  weightedHours: number; // Calculated field: (bestCase + 4*expected + worstCase)/6
}

/**
 * Project entity - represents a project to be prioritized
 */
export interface Project {
  id: string;              // UUID or slug
  title: string;           // Project name
  appetite: Appetite;      // Reuse existing Appetite type, but as a pre-set value
  deliverables: Deliverable[];
  details: {
    inScope: string;       // Description of what is in scope
    outOfScope: string;    // Description of what is out of scope
    hourEstimate: number;  // Total hour estimate for the project
    taskBreakdown: Task[]; // Breakdown of tasks with hour estimates
    assessorName?: string; // Name of the person who assessed the project
    assessmentDate?: Date; // Date when the assessment was done
    hourEstimateRange?: string; // Hour estimate range (e.g., "90-140")
    notes?: string;        // Additional notes that don't fit elsewhere
    [key: string]: any;    // Allow for additional fields
  };
}

/**
 * Vote entity for projects - represents a user's vote on a project's priority
 */
export interface ProjectVote {
  projectId: string;
  priority: ProjectPriority;
  timestamp?: number;      // Used for consistent ordering
  position?: number;       // Used for sorting within a column
}

/**
 * Application state for project prioritization
 */
export interface ProjectAppState {
  voterName: string | null;
  voterRole: string | null;
  votes: Record<string, ProjectVote>;
}

/**
 * Actions for project prioritization state management
 */
export type ProjectAppAction =
  | { type: 'SET_NAME'; name: string; role: string }
  | { type: 'SET_PRIORITY'; id: string; priority: ProjectPriority; timestamp?: number }
  | { type: 'UNSET_PRIORITY'; id: string; timestamp?: number }  // Remove priority assignment
  | { type: 'RESET_FROM_PROJECTS'; projectIds: string[] }  // sync when JSON changes
  | { type: 'RESET_ALL_VOTES' }  // reset all votes but keep voter name
  | { type: 'RESET_ALL' };  // reset everything including voter name

/**
 * Mapping between ProjectPriority and numeric values for sorting and export
 */
export const PROJECT_PRIORITY_VALUES: Record<ProjectPriority, number> = {
  'Highest priority': 1,
  'High priority': 2,
  'Medium Priority': 3,
  'Low priority': 4,
  'Not a priority': 5
};

/**
 * Helper function to get the display name for each priority level
 */
export function getPriorityLabel(priority: ProjectPriority | null): string {
  if (priority === null) return 'Unsorted';
  return priority;
}

/**
 * Helper function to calculate weighted hours using the standard formula
 */
export function calculateWeightedHours(best: number, expected: number, worst: number): number {
  return Math.round(((best + (4 * expected) + worst) / 6) * 10) / 10; // Round to 1 decimal place
}
