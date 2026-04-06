import { Chip } from '@mui/material';
import type { InterestLevel } from '../../types/allocationTypes';

interface InterestChipProps {
  level: InterestLevel;
  size?: 'small' | 'medium';
}

const INTEREST_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Highest', color: '#1b5e20', bg: '#c8e6c9' }, // green  — best
  2: { label: 'High',    color: '#33691e', bg: '#dcedc8' }, // light green
  3: { label: 'Medium',  color: '#e65100', bg: '#ffe0b2' }, // amber/orange
  4: { label: 'Low',     color: '#b71c1c', bg: '#ffcdd2' }, // red    — worst
};

export default function InterestChip({ level, size = 'small' }: InterestChipProps) {
  if (level === null) {
    return <Chip label="—" size={size} sx={{ fontSize: '0.7rem', bgcolor: 'action.hover', color: 'text.disabled' }} />;
  }
  const cfg = INTEREST_CONFIG[level];
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{ fontSize: '0.7rem', bgcolor: cfg.bg, color: cfg.color, fontWeight: 600 }}
    />
  );
}
