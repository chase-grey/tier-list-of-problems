import { useMemo } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Divider, Paper,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type {
  AllocationPitch, PlanAssignment, StaffingAssignment, AllocationConfig,
} from '../../types/allocationTypes';

interface Props {
  pitches: AllocationPitch[];
  currentAssignments: PlanAssignment[];
  step2Assignments: StaffingAssignment[];
  config: AllocationConfig;
}

export default function Stage4ResultsView({ pitches, currentAssignments, step2Assignments, config }: Props) {
  const pitchById = useMemo(
    () => Object.fromEntries(pitches.map(p => [p.id, p])),
    [pitches],
  );
  const devByPitchId = useMemo(
    () => Object.fromEntries(currentAssignments.map(a => [a.pitchId, a.assignedDev])),
    [currentAssignments],
  );

  const fullGrid = useMemo(() =>
    step2Assignments
      .map(sa => ({ sa, pitch: pitchById[sa.pitchId], dev: devByPitchId[sa.pitchId] ?? null }))
      .filter(({ pitch }) => pitch != null)
      .sort((a, b) =>
        (a.sa.devTL ?? '').localeCompare(b.sa.devTL ?? '') ||
        a.pitch.title.localeCompare(b.pitch.title)
      ),
    [step2Assignments, pitchById, devByPitchId],
  );

  const nextUp = useMemo(() =>
    currentAssignments
      .filter(a => a.status === 'next-up')
      .map(a => ({ assignment: a, pitch: pitchById[a.pitchId] }))
      .filter(({ pitch }) => pitch != null)
      .sort((a, b) => a.pitch.teamPriorityScore - b.pitch.teamPriorityScore),
    [currentAssignments, pitchById],
  );

  const byTL = useMemo(() => {
    const map: Record<string, typeof fullGrid> = {};
    config.devTLNames.forEach(tl => { map[tl] = []; });
    fullGrid.forEach(row => {
      const tl = row.sa.devTL;
      if (!tl) return;
      if (map[tl]) map[tl].push(row);
      else map[tl] = [row];
    });
    return map;
  }, [fullGrid, config.devTLNames]);

  const handleCopy = () => {
    const q = config.quarterLabel ? ` — Q${config.quarterLabel}` : '';
    const lines: string[] = [
      `Team Matching Results${q}`,
      '',
      `FULL ASSIGNMENT GRID (${fullGrid.length} projects)`,
      'Project | Dev | Dev TL | QM | PQA1',
      ...fullGrid.map(({ pitch, dev, sa }) =>
        `  ${pitch.title} | ${dev ?? '—'} | ${sa.devTL ?? '—'} | ${sa.qm ?? '—'} | ${sa.pqa1 ?? '—'}`
      ),
      '',
      `UP NEXT — LIFEBOAT ORDER (${nextUp.length})`,
      'Add to backlog in this order:',
      ...nextUp.map(({ pitch }, i) =>
        `  ${i + 1}. ${pitch.title} [${pitch.category}]`
      ),
      '',
      'PER-TL FOLLOW-UPS',
    ];
    for (const [tl, rows] of Object.entries(byTL)) {
      if (rows.length === 0) continue;
      lines.push('');
      lines.push(`${tl} (${rows.length} project${rows.length !== 1 ? 's' : ''})`);
      lines.push('  Create PRJ records:');
      rows.forEach(({ pitch, dev, sa }) => {
        lines.push(`    • ${pitch.title} — Dev: ${dev ?? '—'}, QM: ${sa.qm ?? '—'}${sa.pqa1 ? `, PQA1: ${sa.pqa1}` : ''}`);
      });
    }
    lines.push('');
    lines.push('  ALL TLs — Add to backlog in lifeboat order:');
    nextUp.forEach(({ pitch }, i) => {
      lines.push(`  ${i + 1}. ${pitch.title}`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
  };

  return (
    <Box sx={{ p: 3, overflow: 'auto', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Team Matching Results</Typography>
          {config.quarterLabel && (
            <Typography variant="h6" color="text.secondary">Q{config.quarterLabel}</Typography>
          )}
        </Box>
        <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={handleCopy}>
          Copy summary
        </Button>
      </Box>

      {/* Full assignment grid */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
        Full Assignment Grid ({fullGrid.length} projects)
      </Typography>
      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>Project</TableCell>
            <TableCell>Dev</TableCell>
            <TableCell>Dev TL</TableCell>
            <TableCell>QM</TableCell>
            <TableCell>PQA1</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fullGrid.map(({ pitch, dev, sa }) => (
            <TableRow key={pitch.id}>
              <TableCell>{pitch.title}</TableCell>
              <TableCell>{dev ?? '—'}</TableCell>
              <TableCell>{sa.devTL ?? '—'}</TableCell>
              <TableCell>{sa.qm ?? '—'}</TableCell>
              <TableCell>{sa.pqa1 ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Divider sx={{ mb: 3 }} />

      {/* Lifeboat order */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
        Up Next — Lifeboat Order ({nextUp.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add to backlog in this order (sorted by team vote priority).
      </Typography>
      <Box component="ol" sx={{ pl: 3, m: 0, mb: 4 }}>
        {nextUp.map(({ pitch }) => (
          <Box component="li" key={pitch.id} sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              {pitch.title}
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                [{pitch.category}]
              </Typography>
            </Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Per-TL follow-ups */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Per-TL Follow-ups
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Object.entries(byTL)
          .filter(([, rows]) => rows.length > 0)
          .map(([tl, rows]) => (
            <Paper key={tl} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                {tl} — {rows.length} project{rows.length !== 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Create PRJ records:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mt: 0, mb: 0 }}>
                {rows.map(({ pitch, dev, sa }) => (
                  <Box component="li" key={pitch.id}>
                    <Typography variant="body2">
                      {pitch.title}
                      <Typography component="span" color="text.secondary" variant="body2">
                        {' '}— Dev: {dev ?? '—'}, QM: {sa.qm ?? '—'}
                        {sa.pqa1 ? `, PQA1: ${sa.pqa1}` : ''}
                      </Typography>
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          ))}
      </Box>
    </Box>
  );
}
