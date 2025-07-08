import {
  Popover,
  Typography,
  Box,
  Divider,
  Paper,
  Chip
} from '@mui/material';
import type { Pitch, Vote } from '../../types/models';

interface InterestDetailsBubbleProps {
  pitch: Pitch;
  vote: Vote | undefined;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  userRole?: string | null;
}

/**
 * Displays detailed information about a pitch in the interest ranking stage
 * Including the priority tier and appetite that the user had set
 */
const InterestDetailsBubble = ({ pitch, vote, anchorEl, onClose, userRole }: InterestDetailsBubbleProps) => {
  // Check if user is a customer
  const isCustomer = userRole === 'customer';
  const open = Boolean(anchorEl);
  const id = open ? `details-popover-${pitch.id}` : undefined;

  // Get priority tier label
  const getPriorityLabel = (tier?: number | null) => {
    if (!tier) return 'Not Set';
    
    switch (tier) {
      case 1: return 'Highest Priority';
      case 2: return 'Very High Priority';
      case 3: return 'High Priority';
      case 4: return 'Moderate Priority';
      case 5: return 'Low-Moderate Priority';
      case 6: return 'Low Priority';
      case 7: return 'Very Low Priority';
      case 8: return 'Not a Priority';
      default: return `Tier ${tier}`;
    }
  };
  
  // Get appetite label
  const getAppetiteLabel = (appetite?: string) => {
    if (!appetite) return 'Not Set';
    
    switch (appetite) {
      case 'S': return 'Small';
      case 'M': return 'Medium';
      case 'L': return 'Large';
      default: return appetite;
    }
  };
  
  // Get appetite color
  const getAppetiteColor = (appetite?: string) => {
    if (!appetite) return 'default';
    
    switch (appetite) {
      case 'S': return 'success';
      case 'M': return 'warning';
      case 'L': return 'error';
      default: return 'default';
    }
  };

  // Renders a detail section if the content exists
  const renderDetailSection = (label: string, content?: string | boolean) => {
    if (content === undefined || content === '' || content === null) return null;
    
    return (
      <>
        <Box sx={{ mb: 1, mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2">
            {typeof content === 'boolean' ? 'Yes' : content}
          </Typography>
        </Box>
        <Divider />
      </>
    );
  };

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      sx={{
        mt: 1, // 8px margin top
      }}
    >
      <Paper
        sx={{
          p: 2,
          maxWidth: 320,
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        <Typography variant="h6" gutterBottom>
          {isCustomer ? (
            <Box component="span" sx={{ fontWeight: 'bold' }}>{pitch.id}</Box>
          ) : (
            <Box component="a" 
              href={`https://emc2summary/GetSummaryReport.ashx/track/ZQN/${pitch.id}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                color: 'primary.main',
                textDecoration: 'none',
                fontWeight: 'bold',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}>
              {pitch.id}
            </Box>
          )}
          {" - "}
          {pitch.title}
        </Typography>
        
        <Divider />
        
        {/* Add priority tier and appetite information at the top */}
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Priority Ranking
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
            <Chip 
              label={`Tier ${vote?.tier || 'N/A'}: ${getPriorityLabel(vote?.tier)}`}
              color="primary"
              size="small"
              variant="outlined"
            />
            
            <Chip 
              label={`Appetite: ${getAppetiteLabel(vote?.appetite)}`}
              color={getAppetiteColor(vote?.appetite)}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
        
        <Divider />
        
        {renderDetailSection('Problem', pitch.details.problem)}
        {renderDetailSection('Idea for Solution', pitch.details.ideaForSolution)}
        {renderDetailSection('Characteristics', pitch.details.characteristics)}
        {renderDetailSection('Why Now', pitch.details.whyNow)}
        {renderDetailSection('Smart Tools Fit', pitch.details.smartToolsFit)}
        {renderDetailSection('Epic Fit', pitch.details.epicFit)}
        {renderDetailSection('Success Metrics', pitch.details.success)}
        {renderDetailSection('Maintenance', pitch.details.maintenance)}
        {renderDetailSection('Intern Candidate', pitch.details.internCandidate)}
      </Paper>
    </Popover>
  );
};

export default InterestDetailsBubble;
