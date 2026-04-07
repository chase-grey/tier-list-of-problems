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
  const title = level === null
    ? (noData ? 'No interest data submitted' : 'Skipped this project')
    : DOT_CONFIG[level].label;

  const cfg = level !== null ? DOT_CONFIG[level] : null;

  return (
    <Tooltip title={title} placement="top">
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: cfg ? cfg.bg : 'transparent',
          border: !cfg ? '1.5px dashed' : cfg.border ? `1.5px solid ${cfg.border}` : 'none',
          borderColor: !cfg ? 'text.disabled' : undefined,
          opacity: !cfg ? 0.5 : 1,
        }}
      />
    </Tooltip>
  );
}
