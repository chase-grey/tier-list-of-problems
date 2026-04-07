import { Tooltip, Box } from '@mui/material';
import type { InterestLevel } from '../../types/allocationTypes';

const DOT_CONFIG: Record<number, { bg: string; border?: string; label: string }> = {
  1: { bg: '#1565c0', label: 'Highest interest' },
  2: { bg: '#42a5f5', label: 'High interest' },
  3: { bg: '#90caf9', label: 'Medium interest' },
  4: { bg: '#e3f2fd', border: '#90caf9', label: 'Low interest' },
};

interface InterestDotProps {
  level: InterestLevel;
  noData?: boolean;
}

export default function InterestDot({ level, noData = false }: InterestDotProps) {
  const cfg = level !== null ? DOT_CONFIG[level] : null;

  if (!cfg) {
    // null level: differentiate skipped (grey) vs no-data (amber) to match InterestChip
    return (
      <Tooltip title={noData ? 'No interest data submitted for any project' : 'Skipped ranking this project'} placement="top">
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            flexShrink: 0,
            bgcolor: noData ? 'rgba(255, 152, 0, 0.25)' : 'transparent',
            border: '1.5px dashed',
            borderColor: noData ? 'warning.main' : 'text.disabled',
            opacity: noData ? 1 : 0.55,
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={DOT_CONFIG[level!].label} placement="top">
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: cfg.bg,
          border: cfg.border ? `1.5px solid ${cfg.border}` : 'none',
        }}
      />
    </Tooltip>
  );
}
