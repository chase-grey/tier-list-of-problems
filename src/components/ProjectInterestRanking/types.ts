export type ProjectStatus = 'UNSORTED' | 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Project = {
  id: string;
  status: ProjectStatus;
  title: string;
  description: string;
};

export type Column = {
  id: ProjectStatus;
  title: string;
};
