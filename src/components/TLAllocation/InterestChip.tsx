import { Chip } from '@mui/material';
import type { InterestLevel } from '../../types/allocationTypes';

interface InterestChipProps {
  level: InterestLevel;
  size?: 'small' | 'medium';
}

const INTEREST_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Highest', color: '#fff',    bg: '#1565c0' }, // deep blue — highest interest
  2: { label: 'High',    color: '#fff',    bg: '#42a5f5' }, // lighter blue
  3: { label: 'Medium',  color: '#37474f', bg: '#90caf9' }, // pale blue
  4: { label: 'Low',     color: '#546e7a', bg: '#e3f2fd' }, // barely-blue — lowest interest
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
