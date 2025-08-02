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
  Paper,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Project, Deliverable, Task } from '../../../types/project-models';
import type { Appetite } from '../../../types/models';
import { colorTokens } from '../../../theme';
// Using built-in date formatting instead of date-fns

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
  // Format assessment date if available
  const getFormattedAssessmentDate = () => {
    if (project.details.assessmentDate) {
      const date = new Date(project.details.assessmentDate);
      return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    }
    return null;
  };
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
      case 'L': return 'Large'; // Removed (months/quarter) as requested
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
          <Box>
            <Typography variant="h6">
              <Link 
                href={`https://emc2summary/GetSummaryReport.ashx/track/ZQN/${project.id}`}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ fontWeight: 'bold' }}
              >
                {project.id}
              </Link> - {project.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {project.details.assessorName && `Assessed by ${project.details.assessorName}`}
            </Typography>
          </Box>
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
                  href={`https://emc2summary/GetSummaryReport.ashx/track/ZQN/${project.id}`} 
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
        
        {/* Assessor Information */}
        {project.details.assessorName && (
          <>
            <Box mb={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Assessed By
              </Typography>
              <Box mt={0.5} display="flex" alignItems="center">
                <Typography variant="body1">
                  {project.details.assessorName}
                  {getFormattedAssessmentDate() && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      {getFormattedAssessmentDate()}
                    </Typography>
                  )}
                </Typography>
              </Box>
            </Box>
            <Divider />
          </>
        )}
        
        {/* Appetite and Hour Estimate */}
        <Box mb={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Appetite & Estimate
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={getAppetiteDescription(project.appetite)}
              size="small"
              sx={{ 
                bgcolor: getAppetiteColor(project.appetite),
                color: 'black',
                fontWeight: 'bold'
              }} 
            />

            {/* Hour estimate chip - with proper unit */}
            <Chip
              label={`${project.details.hourEstimate} hours`}
              size="small"
              sx={{ fontWeight: 'medium' }}
            />
            
            {/* Hour range if available */}
            {project.details.hourEstimateRange && (
              <Chip
                label={`Range: ${project.details.hourEstimateRange}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 'medium' }}
              />
            )}
          </Box>
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
        {project.details.outOfScope && (
          <>
            <Box my={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Out of Scope
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                {project.details.outOfScope}
              </Typography>
            </Box>
            <Divider />
          </>
        )}
        
        {/* Additional Notes */}
        {project.details.notes && (
          <>
            <Box my={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Notes
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                {project.details.notes}
              </Typography>
            </Box>
            <Divider />
          </>
        )}
        
        {/* Task Breakdown */}
        {project.details.taskBreakdown && project.details.taskBreakdown.length > 0 && (
          <Box my={2}>
            <Typography variant="subtitle2" color="textSecondary" mb={1}>
              Task Breakdown
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" aria-label="task breakdown table">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Task</TableCell>
                    <TableCell align="right">Best Case</TableCell>
                    <TableCell align="right">Expected Case</TableCell>
                    <TableCell align="right">Worst Case</TableCell>
                    <TableCell align="right">Weighted Hours</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {project.details.taskBreakdown.map((task: Task, index: number) => (
                    <TableRow key={index} sx={{ '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } }}>
                      <TableCell component="th" scope="row" sx={{ whiteSpace: 'pre-line' }}>
                        {task.name}
                      </TableCell>
                      <TableCell align="right">{task.bestCaseHours}</TableCell>
                      <TableCell align="right">{task.expectedHours}</TableCell>
                      <TableCell align="right">{task.worstCaseHours}</TableCell>
                      <TableCell align="right">{task.weightedHours}</TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals Row */}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell component="th" scope="row">
                      <Typography variant="subtitle2">Totals</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">
                        {project.details.taskBreakdown.reduce((sum, task) => sum + task.bestCaseHours, 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">
                        {project.details.taskBreakdown.reduce((sum, task) => sum + task.expectedHours, 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">
                        {project.details.taskBreakdown.reduce((sum, task) => sum + task.worstCaseHours, 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">
                        {project.details.taskBreakdown.reduce((sum, task) => sum + task.weightedHours, 0)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailsModal;
