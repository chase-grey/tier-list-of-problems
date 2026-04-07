import { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import type { Pitch, Vote } from '../../types/models';

export interface CategoryBandwidthConfig {
  bandwidth: Record<string, number>;
  colors: Record<string, string>;
}

interface CategoryBandwidthBarProps {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  config: CategoryBandwidthConfig;
}

/**
 * Compact bar showing how the voter's current tier rankings distribute across
 * categories, compared to the target bandwidth allocation.
 */
export default function CategoryBandwidthBar({ pitches, votes, config }: CategoryBandwidthBarProps) {
  const { bandwidth, colors } = config;
  const categories = Object.keys(bandwidth);

  const stats = useMemo(() => {
    const ranked: Record<string, number> = {};
    let total = 0;
    for (const cat of categories) ranked[cat] = 0;
    for (const pitch of pitches) {
      if (votes[pitch.id]?.tier) {
        ranked[pitch.category] = (ranked[pitch.category] ?? 0) + 1;
        total++;
      }
    }
    return { ranked, total };
  }, [pitches, votes, categories]);

  const { ranked, total } = stats;
  const hasVotes = total > 0;

  // Short display names for the legend
  const shortName: Record<string, string> = {
    'Support AI Charting': 'AI Charting',
    'Create and Improve Tools and Framework': 'Tools & Framework',
    'Mobile Feature Parity': 'Mobile',
    'Address Technical Debt': 'Tech Debt',
  };

  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
        flexShrink: 0,
      }}
    >
      {/* Stacked bar — actual distribution vs target */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', minWidth: 72 }}>
          {hasVotes ? 'Your votes' : 'Target alloc.'}
        </Typography>

        {/* Actual distribution bar */}
        <Box sx={{ flex: 1, height: 10, borderRadius: 1, overflow: 'hidden', display: 'flex', bgcolor: 'action.disabledBackground' }}>
          {categories.map(cat => {
            const pct = hasVotes
              ? (ranked[cat] / total) * 100
              : bandwidth[cat];
            return (
              <Tooltip
                key={cat}
                title={
                  hasVotes
                    ? `${shortName[cat] ?? cat}: ${ranked[cat]} pitches (${Math.round(pct)}% of your ranked — target ${bandwidth[cat]}%)`
                    : `${shortName[cat] ?? cat}: target ${bandwidth[cat]}%`
                }
              >
                <Box
                  sx={{
                    width: `${pct}%`,
                    bgcolor: colors[cat],
                    transition: 'width 0.4s ease',
                    flexShrink: 0,
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>

        {/* Target bar (always shown as reference) */}
      </Box>

      {hasVotes && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', minWidth: 72 }}>
            Target
          </Typography>
          <Box sx={{ flex: 1, height: 4, borderRadius: 1, overflow: 'hidden', display: 'flex', bgcolor: 'action.disabledBackground', opacity: 0.6 }}>
            {categories.map(cat => (
              <Box
                key={cat}
                sx={{ width: `${bandwidth[cat]}%`, bgcolor: colors[cat], opacity: 0.5 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Category legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
        {categories.map(cat => {
          const actualPct = hasVotes ? Math.round((ranked[cat] / total) * 100) : null;
          const targetPct = bandwidth[cat];
          const diff = actualPct !== null ? actualPct - targetPct : null;
          return (
            <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors[cat], flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                {shortName[cat] ?? cat}
                {actualPct !== null && (
                  <span style={{ marginLeft: 3 }}>
                    {actualPct}%
                    {diff !== null && diff !== 0 && (
                      <span style={{ color: diff > 0 ? '#ef6c00' : '#388e3c', marginLeft: 2 }}>
                        ({diff > 0 ? '+' : ''}{diff}%)
                      </span>
                    )}
                  </span>
                )}
                {actualPct === null && (
                  <span style={{ marginLeft: 3 }}>{targetPct}%</span>
                )}
              </Typography>
            </Box>
          );
        })}
        {hasVotes && (
          <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
            {total} ranked
          </Typography>
        )}
      </Box>
    </Box>
  );
}
