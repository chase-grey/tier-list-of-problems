import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Popover,
  Tooltip,
  Divider,
} from '@mui/material';
import DonutSmallIcon from '@mui/icons-material/DonutSmall';

export interface CategoryBandwidthConfig {
  bandwidth: Record<string, number>;
  colors: Record<string, string>;
}

interface CategoryBandwidthBarProps {
  config: CategoryBandwidthConfig;
}

const SHORT_NAME: Record<string, string> = {
  'Support AI Charting': 'AI Charting',
  'Create and Improve Tools and Framework': 'Tools & Framework',
  'Mobile Feature Parity': 'Mobile',
  'Address Technical Debt': 'Tech Debt',
};

/**
 * A small icon button that opens a popover explaining the quarterly
 * bandwidth allocation. Lives in the tab bar to the right of the category tabs.
 */
export default function CategoryBandwidthBar({ config }: CategoryBandwidthBarProps) {
  const { bandwidth, colors } = config;
  const categories = Object.keys(bandwidth);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <Tooltip title="View quarterly time allocation plan">
        <IconButton
          size="small"
          onClick={e => setAnchor(e.currentTarget)}
          sx={{ mx: 0.5, color: 'text.secondary', flexShrink: 0 }}
          aria-label="View quarterly time allocation plan"
        >
          <DonutSmallIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 320, p: 2 } }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Quarterly bandwidth plan
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          This shows how the team plans to distribute effort across categories
          this quarter. These targets may shift slightly as we finalize which
          specific projects to take on — treat them as relative priority
          guidance, not hard commitments.
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Note: the percentages reflect planned time investment, not the number
          of pitches submitted per category. A category with fewer pitches can
          still receive more of the team's time.
        </Typography>

        <Divider sx={{ mb: 1.5 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {categories.map(cat => {
            const pct = bandwidth[cat];
            return (
              <Box key={cat}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colors[cat], flexShrink: 0 }} />
                    <Typography variant="body2">
                      {SHORT_NAME[cat] ?? cat}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: colors[cat] }}>
                    {pct}%
                  </Typography>
                </Box>
                <Box sx={{ height: 6, borderRadius: 1, bgcolor: 'action.disabledBackground', overflow: 'hidden' }}>
                  <Box
                    sx={{ width: `${pct}%`, height: '100%', bgcolor: colors[cat], borderRadius: 1 }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}
