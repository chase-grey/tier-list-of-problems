import React from 'react';
import {
  Popover,
  Typography,
  Box,
  Divider,
  Paper
} from '@mui/material';
import { Pitch } from '../../../types/models';

interface DetailsBubbleProps {
  pitch: Pitch;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

/**
 * Displays detailed information about a pitch in a popover
 */
const DetailsBubble = ({ pitch, anchorEl, onClose }: DetailsBubbleProps) => {
  const open = Boolean(anchorEl);
  const id = open ? `details-popover-${pitch.id}` : undefined;

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
          {pitch.title}
        </Typography>
        
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

// Using React.lazy for code splitting as specified
export default DetailsBubble;
