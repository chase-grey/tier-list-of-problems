import { Box, LinearProgress, Tooltip, Typography } from '@mui/material';
import { CheckCircle as OkIcon, Warning as WarnIcon } from '@mui/icons-material';

/**
 * Blue gradient color for interest quality.
 * pct=100 (tier 1, best) → deep blue; pct=25 (tier 4, worst) → muted slate.
 * Formula matches priorityColor() in Step1View when pct comes from tierToPct(tier).
 */
export function interestColor(pct: number): string {
  const t = Math.max(0, Math.min(1, (100 - pct) / 75));
  const r = Math.round(0x15 + t * (0x78 - 0x15));
  const g = Math.round(0x65 + t * (0x90 - 0x65));
  const b = Math.round(0xc0 + t * (0x9c - 0xc0));
  return `rgb(${r},${g},${b})`;
}

/** Convert average tier (1–4) to 0–100 percentage for use with interestColor. */
export function tierToPct(avgTier: number): number {
  return Math.round(((5 - avgTier) / 4) * 100);
}

export interface AlignmentRoleEntry {
  label: string;
  pct: number | null;
  tier12: number;
  total: number;
}

export interface AuthorWarningItem {
  label: string;
  pitchId: string;
}

interface Props {
  overall: AlignmentRoleEntry;
  roles?: AlignmentRoleEntry[];
  authoredPitchCount: number;
  authorMatchedCount: number;
  /** Pitches where the author has tier-1 interest but is not assigned to the project. */
  authorWarningItems?: AuthorWarningItem[];
  onFocusPitch?: (pitchId: string) => void;
  emptyMessage?: string;
}

export default function InterestAlignmentPanel({
  overall,
  roles,
  authoredPitchCount,
  authorMatchedCount,
  authorWarningItems,
  onFocusPitch,
  emptyMessage = 'No interest data yet',
}: Props) {
  if (overall.pct === null) {
    return (
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
        {emptyMessage}
      </Typography>
    );
  }

  const color = interestColor(overall.pct);
  const hasWarnings = (authorWarningItems?.length ?? 0) > 0;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" fontWeight={700}>{overall.label}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color }}>
          {overall.pct}% · {overall.tier12}/{overall.total} tier 1–2
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={overall.pct}
        sx={{
          height: 6, borderRadius: 1, bgcolor: 'action.hover',
          mb: roles ? 0.75 : 0.5,
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
      {roles?.map(({ label, pct, tier12, total }) => (
        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', ml: 1.5, mb: 0.2 }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {pct !== null
            ? <Typography variant="caption" sx={{ color: interestColor(pct) }}>{pct}% · {tier12}/{total} tier 1–2</Typography>
            : <Typography variant="caption" color="text.disabled">no data</Typography>
          }
        </Box>
      ))}
      {authoredPitchCount > 0 && (
        <Box sx={{ mt: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {hasWarnings
              ? <Tooltip title="Some pitch authors have highest interest but aren't assigned to their own pitch">
                  <span><WarnIcon fontSize="small" color="warning" sx={{ fontSize: '0.9rem' }} /></span>
                </Tooltip>
              : <Tooltip title="All pitch authors with highest interest are assigned to their own pitch">
                  <span><OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} /></span>
                </Tooltip>
            }
            <Typography variant="caption">
              {authorMatchedCount}/{authoredPitchCount} authors on their own pitch
            </Typography>
          </Box>
          {authorWarningItems?.map(item => (
            <Box
              key={item.pitchId}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25, overflow: 'hidden',
                    cursor: onFocusPitch ? 'pointer' : 'default' }}
              onClick={() => onFocusPitch?.(item.pitchId)}
            >
              <Tooltip title="Wrote this pitch with highest interest but isn't assigned" placement="left">
                <WarnIcon sx={{ fontSize: '0.85rem', color: 'warning.main', flexShrink: 0 }} />
              </Tooltip>
              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                   '&:hover': onFocusPitch ? { textDecoration: 'underline' } : {} }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
