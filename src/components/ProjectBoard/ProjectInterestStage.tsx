import React from 'react';
import { Box, Typography, Grid, Container } from '@mui/material';
import ProjectInterestCard from './ProjectCard/ProjectInterestCard';
import type { Project } from '../../types/project-models';

interface ProjectInterestStageProps {
  userRole?: string | null;
  projects: Project[];
}

export const ProjectInterestStage: React.FC<ProjectInterestStageProps> = ({ userRole = 'developer', projects }) => {
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 3 }}>
        <Typography variant="h4" gutterBottom>
          Project Interest - Stage 2
        </Typography>
        <Typography variant="body1" paragraph>
          These cards represent projects that you may be interested in. Click the info icon to see more details.
        </Typography>
        
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
                <ProjectInterestCard 
                project={project} 
                userRole={userRole} 
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default ProjectInterestStage;
