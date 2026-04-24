import { useMemo } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Divider, Chip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { AllocationPitch, PlanAssignment } from '../../types/allocationTypes';

interface Props {
  pitches: AllocationPitch[];
  currentAssignments: PlanAssignment[];
  quarterLabel?: string;
}

export default function Stage2ResultsView({ pitches, currentAssignments, quarterLabel }: Props) {
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
        a.pitch.category.localeCompare(b.pitch.category) ||
        a.pitch.title.localeCompare(b.pitch.title)
      ),
    [currentAssignments, pitchById],
  );

  const nextUp = useMemo(() =>
    currentAssignments
      .filter(a => a.status === 'next-up')
      .map(a => ({ assignment: a, pitch: pitchById[a.pitchId] }))
      .filter(({ pitch }) => pitch != null)
      .sort((a, b) => a.pitch.teamPriorityScore - b.pitch.teamPriorityScore),
    [currentAssignments, pitchById],
  );

  const handleCopy = () => {
    const q = quarterLabel ? ` — Q${quarterLabel}` : '';
    const lines: string[] = [
      `Dev Matching Results${q}`,
      '',
      `SELECTED PROJECTS (${selected.length})`,
      ...selected.map(({ pitch, assignment }, i) =>
        `  ${i + 1}. ${pitch.title} [${pitch.category}] — ${assignment.assignedDev ?? 'Unassigned'}`
      ),
      '',
      `UP NEXT — LIFEBOAT ORDER (${nextUp.length})`,
      'Add these to the backlog in this order:',
      ...nextUp.map(({ pitch }, i) =>
        `  ${i + 1}. ${pitch.title} [${pitch.category}]`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
  };

  return (
    <Box sx={{ p: 3, overflow: 'auto', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Dev Matching Results</Typography>
          {quarterLabel && (
            <Typography variant="h6" color="text.secondary">Q{quarterLabel}</Typography>
          )}
        </Box>
        <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={handleCopy}>
          Copy summary
        </Button>
      </Box>

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
        Selected Projects ({selected.length})
      </Typography>
      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Project</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Dev</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {selected.map(({ assignment, pitch }, i) => (
            <TableRow key={pitch.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{pitch.title}</TableCell>
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

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
        Up Next — Lifeboat Order ({nextUp.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add these to the backlog in this order (sorted by team vote priority).
      </Typography>
      <Box component="ol" sx={{ pl: 3, m: 0 }}>
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
    </Box>
  );
}
