import { Chip, Tooltip } from '@mui/material';
import type { InterestLevel } from '../../types/allocationTypes';

interface InterestChipProps {
  level: InterestLevel;
  size?: 'small' | 'medium';
  /** True when the person submitted no data at all (key absent from map). False/absent = they submitted data but skipped this pitch (null value). */
  noData?: boolean;
}

const INTEREST_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Highest', color: '#fff',    bg: '#1565c0' }, // deep blue — highest interest
  2: { label: 'High',    color: '#fff',    bg: '#42a5f5' }, // lighter blue
  3: { label: 'Medium',  color: '#37474f', bg: '#90caf9' }, // pale blue
  4: { label: 'Low',     color: '#546e7a', bg: '#e3f2fd' }, // barely-blue — lowest interest
};

export default function InterestChip({ level, size = 'small', noData = false }: InterestChipProps) {
  if (level === null) {
    // noData = person never submitted anything; null level = submitted but skipped this pitch
    const title = noData ? 'No interest data submitted for any project' : 'Skipped ranking this project';
    return (
      <Tooltip title={title} placement="top">
        <Chip
          label={noData ? '✕' : '—'}
          size={size}
          sx={{ fontSize: '0.7rem', bgcolor: 'action.hover', color: 'text.disabled', minWidth: noData ? 28 : undefined }}
        />
      </Tooltip>
    );
  }
  const cfg = INTEREST_CONFIG[level];
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{ fontSize: '0.7rem', bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, minWidth: 72 }}
    />
  );
}
