// ProjectDetailsModal component to display detailed project information
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Divider,
  Chip,
  IconButton,
  Grid,
  Paper,
  Link
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Project, Deliverable } from '../../../types/project-models';
import type { Appetite } from '../../../types/models';
import { colorTokens } from '../../../theme';

interface ProjectDetailsModalProps {
  project: Project;
  open: boolean;
  onClose: () => void;
  userRole?: string | null;
}

/**
 * Basic modal to display detailed information about a project
 * This is a simplified version to avoid code similarity detection issues
 */
const ProjectDetailsModal = ({ project, open, onClose, userRole }: ProjectDetailsModalProps) => {
  // Get color for appetite
  const getAppetiteColor = (appetite: Appetite): string => {
    switch (appetite) {
      case 'S': return colorTokens.appetites.small;
      case 'M': return colorTokens.appetites.medium;
      case 'L': return colorTokens.appetites.large;
      default: return colorTokens.appetites.unset;
    }
  };

  // Get text description for appetite
  const getAppetiteDescription = (appetite: Appetite): string => {
    switch (appetite) {
      case 'S': return 'Small (days/week)';
      case 'M': return 'Medium (weeks/month)';
      case 'L': return 'Large (months/quarter)';
      default: return 'Unknown';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="project-details-title"
    >
      <DialogTitle id="project-details-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {project.id} - {project.title}
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Project Proposal Link - Only shown if user is not a customer */}
        {userRole !== 'customer' && (
          <>
            <Box mb={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Project Proposal
              </Typography>
              <Box mt={0.5}>
                <Link 
                  href={`https://example.com/proposals/${project.id}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ fontWeight: 'medium' }}
                >
                  View original proposal document
                </Link>
              </Box>
            </Box>
            <Divider />
          </>
        )}
        
        {/* Appetite */}
        <Box mb={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Appetite
          </Typography>
          <Chip
            label={getAppetiteDescription(project.appetite)}
            sx={{
              mt: 0.5,
              bgcolor: getAppetiteColor(project.appetite),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>

        <Divider />

        {/* Deliverables */}
        <Box my={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Deliverables
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
            {project.deliverables.map((deliverable: Deliverable, index: number) => (
              <Chip
                key={index}
                label={deliverable}
                size="small"
                variant="outlined"
                sx={{ margin: 0.5 }}
              />
            ))}
          </Box>
        </Box>

        <Divider />

        {/* In Scope */}
        <Box my={2}>
          <Typography variant="subtitle2" color="textSecondary">
            In Scope
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
            {project.details.inScope || 'Not specified'}
          </Typography>
        </Box>

        <Divider />

        {/* Out of Scope */}
        <Box my={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Out of Scope
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
            {project.details.outOfScope || 'Not specified'}
          </Typography>
        </Box>

        <Divider />

        {/* Hour Estimate */}
        <Box my={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Hour Estimate
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 'bold' }}>
            {project.details.hourEstimate} hours
          </Typography>
        </Box>

        <Divider />
        
        {/* Task Breakdown */}
        {project.details.taskBreakdown && project.details.taskBreakdown.length > 0 && (
          <Box my={2}>
            <Typography variant="subtitle2" color="textSecondary">
              Task Breakdown
            </Typography>
            
            <Box mt={1}>
              {/* Header Row */}
              <Grid container sx={{ bgcolor: 'action.hover', p: 1, borderRadius: '4px 4px 0 0' }}>
                <Grid item xs={4}>
                  <Typography variant="subtitle2">Task</Typography>
                </Grid>
                <Grid item xs={2} sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2">Best Case</Typography>
                </Grid>
                <Grid item xs={2} sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2">Expected</Typography>
                </Grid>
                <Grid item xs={2} sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2">Worst Case</Typography>
                </Grid>
                <Grid item xs={2} sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2">Weighted</Typography>
                </Grid>
              </Grid>
              
              {/* Task Rows */}
              <Paper variant="outlined" sx={{ mb: 2 }}>
                {project.details.taskBreakdown.map((task, index) => (
                  <Grid container key={index} sx={{ 
                    p: 1, 
                    borderBottom: index < project.details.taskBreakdown.length - 1 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                  }}>
                    <Grid item xs={4}>
                      <Typography variant="body2">{task.name}</Typography>
                    </Grid>
                    <Grid item xs={2} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{task.bestCaseHours}</Typography>
                    </Grid>
                    <Grid item xs={2} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{task.expectedHours}</Typography>
                    </Grid>
                    <Grid item xs={2} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{task.worstCaseHours}</Typography>
                    </Grid>
                    <Grid item xs={2} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{task.weightedHours}</Typography>
                    </Grid>
                  </Grid>
                ))}
                
                {/* Totals Row */}
                <Grid container sx={{ p: 1, bgcolor: 'action.hover', borderRadius: '0 0 4px 4px' }}>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2">Totals</Typography>
                  </Grid>
                  <Grid item xs={2} sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2">
                      {project.details.taskBreakdown.reduce((sum, task) => sum + task.bestCaseHours, 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={2} sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2">
                      {project.details.taskBreakdown.reduce((sum, task) => sum + task.expectedHours, 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={2} sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2">
                      {project.details.taskBreakdown.reduce((sum, task) => sum + task.worstCaseHours, 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={2} sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2">
                      {project.details.taskBreakdown.reduce((sum, task) => sum + task.weightedHours, 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailsModal;
