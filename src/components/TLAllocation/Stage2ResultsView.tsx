import { useMemo, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Divider, Chip, Tabs, Tab, Paper,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { AllocationPitch, PlanAssignment, AllocationConfig } from '../../types/allocationTypes';
import { useSnackbar } from '../../hooks/useSnackbar';

const CATEGORY_ORDER: Record<string, number> = {
  'Support AI Charting': 0,
  'Create and Improve Tools and Framework': 1,
  'Mobile Feature Parity': 2,
  'Address Technical Debt': 3,
};

interface Props {
  pitches: AllocationPitch[];
  currentAssignments: PlanAssignment[];
  config: AllocationConfig;
}


export default function Stage2ResultsView({ pitches, currentAssignments, config }: Props) {
  const { showSnackbar } = useSnackbar();
  const [viewTab, setViewTab] = useState<0 | 1>(0);

  const pitchById = useMemo(
    () => Object.fromEntries(pitches.map(p => [p.id, p])),
    [pitches],
  );

  const selected = useMemo(() =>
    currentAssignments
      .filter(a => a.status === 'selected')
      .map(a => ({ assignment: a, pitch: pitchById[a.pitchId] }))
      .filter(({ pitch }) => pitch != null)
      .sort((a, b) =>
        (CATEGORY_ORDER[a.pitch.category] ?? 99) - (CATEGORY_ORDER[b.pitch.category] ?? 99) ||
        a.pitch.teamPriorityScore - b.pitch.teamPriorityScore
      ),
    [currentAssignments, pitchById],
  );

  const nextUp = useMemo(() =>
    currentAssignments
      .filter(a => a.status === 'next-up')
      .map(a => ({ assignment: a, pitch: pitchById[a.pitchId] }))
      .filter(({ pitch }) => pitch != null)
      .sort((a, b) =>
        (CATEGORY_ORDER[a.pitch.category] ?? 99) - (CATEGORY_ORDER[b.pitch.category] ?? 99) ||
        a.pitch.teamPriorityScore - b.pitch.teamPriorityScore
      ),
    [currentAssignments, pitchById],
  );

  // By-dev view: group selected projects by assigned dev
  const byDev = useMemo(() => {
    const map: Record<string, typeof selected> = {};
    config.devNames.forEach(dev => { map[dev] = []; });
    const unassigned: typeof selected = [];
    selected.forEach(row => {
      const dev = row.assignment.assignedDev;
      if (!dev) { unassigned.push(row); return; }
      if (map[dev]) map[dev].push(row);
      else map[dev] = [row];
    });
    return { byDev: map, unassigned };
  }, [selected, config.devNames]);

  const handleCopy = () => {
    const q = config.quarterLabel ? ` — Q${config.quarterLabel}` : '';
    const lines: string[] = [
      `Dev Matching Results${q}`,
      '',
      `SELECTED PROJECTS (${selected.length})`,
    ];

    if (viewTab === 0) {
      lines.push('Project | Category | Dev');
      selected.forEach(({ pitch, assignment }) => {
        lines.push(`  ${pitch.title} [${pitch.category}] — ${assignment.assignedDev ?? 'Unassigned'}`);
      });
    } else {
      Object.entries(byDev.byDev)
        .filter(([, rows]) => rows.length > 0)
        .forEach(([dev, rows]) => {
          lines.push('');
          lines.push(`${dev} (${rows.length} project${rows.length !== 1 ? 's' : ''})`);
          rows.forEach(({ pitch }) => lines.push(`  • ${pitch.title} [${pitch.category}]`));
        });
      if (byDev.unassigned.length > 0) {
        lines.push('');
        lines.push('Unassigned');
        byDev.unassigned.forEach(({ pitch }) => lines.push(`  • ${pitch.title} [${pitch.category}]`));
      }
    }

    lines.push('');
    lines.push(`UP NEXT — LIFEBOAT ORDER (${nextUp.length})`);
    nextUp.forEach(({ pitch }, i) => {
      lines.push(`  ${i + 1}. ${pitch.title} [${pitch.category}]`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    showSnackbar('Summary copied to clipboard', 'success');
  };

  return (
    <Box sx={{ p: 3, overflow: 'auto', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Dev Matching Results</Typography>
          {config.quarterLabel && (
            <Typography variant="h6" color="text.secondary">Q{config.quarterLabel}</Typography>
          )}
        </Box>
        <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={handleCopy}>
          Copy summary
        </Button>
      </Box>

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
        Selected Projects ({selected.length})
      </Typography>

      <Tabs value={viewTab} onChange={(_, v) => setViewTab(v)} sx={{ mb: 2 }}>
        <Tab label="Team Plan" />
        <Tab label="By Dev" />
      </Tabs>

      {viewTab === 0 ? (
        <Table size="small" sx={{ mb: 4, tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '2.5rem' }}>#</TableCell>
              <TableCell sx={{ width: '43%' }}>Project</TableCell>
              <TableCell sx={{ width: '20%' }}>Category</TableCell>
              <TableCell>Dev</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selected.map(({ assignment, pitch }, i) => (
              <TableRow key={pitch.id}>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{i + 1}</TableCell>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pitch.title}
                </TableCell>
                <TableCell>
                  <Chip label={pitch.category} size="small" />
                </TableCell>
                <TableCell>
                  {assignment.assignedDev ?? (
                    <Typography component="span" color="text.secondary" variant="body2">
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          {Object.entries(byDev.byDev)
            .filter(([, rows]) => rows.length > 0)
            .map(([dev, rows]) => (
              <Paper key={dev} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  {dev} — {rows.length} project{rows.length !== 1 ? 's' : ''}
                </Typography>
                <Box component="ol" sx={{ pl: 3, m: 0 }}>
                  {rows.map(({ pitch }) => (
                    <Box component="li" key={pitch.id} sx={{ mb: 0.25 }}>
                      <Typography variant="body2">
                        {pitch.title}
                        <Typography component="span" color="text.secondary" variant="body2" sx={{ ml: 1 }}>
                          [{pitch.category}]
                        </Typography>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            ))}
          {byDev.unassigned.length > 0 && (
            <Paper key="__unassigned" variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" sx={{ mb: 1 }}>
                Unassigned ({byDev.unassigned.length})
              </Typography>
              <Box component="ul" sx={{ pl: 3, m: 0 }}>
                {byDev.unassigned.map(({ pitch }) => (
                  <Box component="li" key={pitch.id} sx={{ mb: 0.25 }}>
                    <Typography variant="body2">{pitch.title}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Up Next — Lifeboat Order ({nextUp.length})
      </Typography>
      <Table size="small" sx={{ mb: 4, tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '2.5rem' }}>#</TableCell>
            <TableCell sx={{ width: '55%' }}>Project</TableCell>
            <TableCell>Category</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {nextUp.map(({ pitch }, i) => (
            <TableRow key={pitch.id}>
              <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{i + 1}</TableCell>
              <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pitch.title}
              </TableCell>
              <TableCell>
                <Chip label={pitch.category} size="small" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </Box>
  );
}
