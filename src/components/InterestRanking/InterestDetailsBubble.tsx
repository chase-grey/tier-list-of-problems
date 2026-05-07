import {
  Popover,
  Typography,
  Box,
  Divider,
  Paper,
  Chip
} from '@mui/material';
import type { Pitch, Vote } from '../../types/models';

const TIER_LABEL: Record<number, string> = { 1: 'Highest', 2: 'High', 3: 'Medium', 4: 'Low' };

interface InterestDetailsBubbleProps {
  pitch: Pitch;
  vote: Vote | undefined;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  userRole?: string | null;
}

/**
 * Displays detailed information about a pitch in the interest ranking stage
 * Including the priority tier that the user had set
 */
const InterestDetailsBubble = ({ pitch, vote, anchorEl, onClose, userRole }: InterestDetailsBubbleProps) => {
  // Check if user is a customer
  const isCustomer = userRole === 'customer';
  const open = Boolean(anchorEl);
  const id = open ? `details-popover-${pitch.id}` : undefined;

  const priorityLabel = vote?.tier != null && vote.tier > 0
    ? `${TIER_LABEL[vote.tier] ?? `Tier ${vote.tier}`} (${vote.tier})`
    : vote?.tier === 0 ? 'Unsorted' : null;
  
  const renderDetailSection = (label: string, content?: string | boolean) => {
    const cleaned = typeof content === 'string'
      ? content.replace(/^\*+\s*|\s*\*+$/g, '').trim()
      : content;
    if (cleaned === undefined || cleaned === '' || cleaned === null || cleaned === false) return null;

    return (
      <>
        <Box sx={{ mb: 1, mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {typeof cleaned === 'boolean' ? 'Yes' : cleaned}
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
          maxWidth: { xs: 320, md: 450, lg: 550 },
          maxHeight: '70vh',
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
        
        {/* Add developer info if available */}
        {pitch.developer && (
          <>
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Developer
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {pitch.developer}
              </Typography>
            </Box>
            <Divider />
          </>
        )}
        
        {/* Add priority tier information at the top */}
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Your Priority Ranking
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
            {priorityLabel != null
              ? <Chip label={priorityLabel} color="primary" size="small" variant="outlined" />
              : <Typography variant="body2" color="text.disabled">Not ranked (votes not in this browser)</Typography>
            }
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
