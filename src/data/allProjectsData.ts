import type { Project } from '../types/project-models';
import { sampleProjects } from './sampleProjectInterestData_complete';
import { additionalProjects } from './sampleProjectInterestData_complete_part2';
import { finalProjects } from './sampleProjectInterestData_complete_part3';

// Combined export of all 29 projects
export const allProjects: Project[] = [
  ...sampleProjects,
  ...additionalProjects,
  ...finalProjects
];

// Export a function to get a project by ID
export const getProjectById = (id: string): Project | undefined => {
  return allProjects.find(project => project.id === id);
};

// Export counts by appetite for reporting
export const getProjectCountsByAppetite = (): Record<string, number> => {
  const counts: Record<string, number> = {
    S: 0,
    M: 0,
    L: 0
  };
  
  allProjects.forEach(project => {
    counts[project.appetite] = (counts[project.appetite] || 0) + 1;
  });
  
  return counts;
};
