import type { Project, Task, Deliverable } from '../../types/project-models';
import { calculateWeightedHours } from '../../types/project-models';
import type { Appetite } from '../../types/models';

// Helper function to create task with weighted hours
const createTask = (name: string, best: number, expected: number, worst: number): Task => {
  return {
    name,
    bestCaseHours: best,
    expectedHours: expected,
    worstCaseHours: worst,
    weightedHours: calculateWeightedHours(best, expected, worst)
  };
};

// Helper to create project data
const createProject = (
  id: string,
  title: string,
  appetite: Appetite,
  deliverables: Deliverable[],
  inScope: string,
  outOfScope: string,
  tasks: Task[]
): Project => {
  // Calculate total hours from task weighted hours
  const hourEstimate = Math.round(tasks.reduce((sum, task) => sum + task.weightedHours, 0));
  
  return {
    id,
    title,
    appetite,
    deliverables,
    details: {
      inScope,
      outOfScope,
      hourEstimate,
      taskBreakdown: tasks
    }
  };
};

// Sample mock data for testing
export const mockProjects: Project[] = [
  createProject(
    'PROJ-001',
    'Project Prioritization Polling App',
    'M',
    ['Complete the project', 'Dev comp\'d'],
    'Implement project prioritization polling app with drag-and-drop functionality, project cards with details, and CSV export.',
    'Does not include integration with external systems or authentication.',
    [
      createTask('Setup project structure', 2, 3, 4),
      createTask('Implement data models', 1, 2, 3),
      createTask('Create UI components', 4, 8, 12),
      createTask('Implement drag-and-drop', 2, 4, 6),
      createTask('Add CSV export', 1, 2, 3),
      createTask('Testing and bug fixes', 2, 4, 8)
    ]
  ),
  createProject(
    'PROJ-002',
    'User Authentication System',
    'L',
    ['Get designs approved', 'Create a prototype'],
    'Design and implement a user authentication system with login, registration, password reset, and profile management.',
    'Does not include SSO integration or advanced security features.',
    [
      createTask('Requirements gathering', 4, 8, 16),
      createTask('Design system architecture', 8, 16, 24),
      createTask('Implement authentication API', 16, 24, 40),
      createTask('Create frontend components', 16, 24, 32),
      createTask('Integration testing', 8, 16, 24),
      createTask('Security review', 8, 16, 24)
    ]
  ),
  createProject(
    'PROJ-003',
    'Performance Optimization',
    'S',
    ['Complete Investigation', 'Create a plan for a future project'],
    'Analyze current system performance and identify bottlenecks.',
    'No actual code changes or optimizations will be implemented in this phase.',
    [
      createTask('Profiling and analysis', 4, 8, 16),
      createTask('Database query optimization review', 2, 4, 8),
      createTask('Frontend performance analysis', 2, 4, 8),
      createTask('Documentation and recommendations', 4, 8, 12)
    ]
  ),
  createProject(
    'PROJ-004',
    'Mobile App Feature Enhancement',
    'M',
    ['Get designs out', 'In QA1'],
    'Add new features to the mobile app: push notifications, offline mode, and social sharing.',
    'No changes to the existing authentication or profile features.',
    [
      createTask('Design push notification system', 4, 8, 12),
      createTask('Implement offline storage', 8, 16, 24),
      createTask('Add social sharing features', 4, 8, 12),
      createTask('Update UI components', 4, 8, 12),
      createTask('Testing and bug fixes', 4, 8, 16)
    ]
  ),
  createProject(
    'PROJ-005',
    'Data Analytics Dashboard',
    'L',
    ['Create a prototype', 'Complete the project'],
    'Create a comprehensive analytics dashboard with real-time data visualization and reporting.',
    'Will not include data collection or storage solutions, only visualization of existing data.',
    [
      createTask('Design dashboard layouts', 8, 16, 24),
      createTask('Implement chart components', 16, 24, 32),
      createTask('Create filtering and search', 8, 16, 24),
      createTask('Add export functionality', 4, 8, 16),
      createTask('Performance optimization', 8, 16, 24),
      createTask('Testing and bug fixes', 8, 16, 24)
    ]
  ),
  createProject(
    'PROJ-006',
    'API Integration Framework',
    'M',
    ['Dev comp\'d', 'Create a plan for a future project'],
    'Design and implement a framework for easy integration with third-party APIs.',
    'Will not include actual integrations with specific third-party services.',
    [
      createTask('Research and architecture', 8, 12, 16),
      createTask('Core framework implementation', 16, 24, 32),
      createTask('Documentation', 4, 8, 12),
      createTask('Example integration', 8, 12, 16),
      createTask('Testing', 4, 8, 12)
    ]
  ),
  createProject(
    'PROJ-007',
    'Automated Testing Suite',
    'S',
    ['Complete the project'],
    'Set up automated testing infrastructure and implement basic test cases.',
    'Will not include extensive test coverage of all existing features.',
    [
      createTask('Setup test environment', 2, 4, 8),
      createTask('Create testing utilities', 4, 6, 8),
      createTask('Implement unit tests', 4, 8, 12),
      createTask('Add integration tests', 4, 8, 16),
      createTask('Documentation', 2, 4, 6)
    ]
  ),
  createProject(
    'PROJ-008',
    'Design System Implementation',
    'M',
    ['Get designs approved', 'Complete the project'],
    'Implement a comprehensive design system with reusable components.',
    'Will not include redesign of existing UI components or pages.',
    [
      createTask('Audit existing UI components', 8, 12, 16),
      createTask('Design component library', 16, 24, 32),
      createTask('Implement core components', 24, 32, 48),
      createTask('Create documentation', 8, 12, 16),
      createTask('Integration examples', 8, 12, 16)
    ]
  )
];

// Sample initial votes for testing
export const mockInitialVotes = {
  'PROJ-001': { projectId: 'PROJ-001', priority: 'Highest priority' },
  'PROJ-003': { projectId: 'PROJ-003', priority: 'High priority' },
  'PROJ-007': { projectId: 'PROJ-007', priority: 'Medium Priority' }
};
