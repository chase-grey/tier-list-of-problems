import { useMemo, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Divider, Chip, Tabs, Tab, Checkbox, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, Paper,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { AllocationPitch, PlanAssignment, AllocationConfig } from '../../types/allocationTypes';

interface Props {
  pitches: AllocationPitch[];
  currentAssignments: PlanAssignment[];
  config: AllocationConfig;
}

const PRJ_INSTRUCTIONS = `How to create a project record:
1. In TRACK, create a new PRJ record with the project title.
2. On the People tab: add the dev as the developer, QM as quality manager, dev TL as TL, and testing captain.
3. On the Details tab: set the quarter/cycle and category.
4. On the Associated Records tab: attach the pitch ZQN record.
5. Add the PRJ to the team backlog.`;

export default function Stage2ResultsView({ pitches, currentAssignments, config }: Props) {
  const [viewTab, setViewTab] = useState<0 | 1>(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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

  // Follow-up items: one per dev with assigned projects + stage 3 kick-off
  const followUpItems = useMemo(() => {
    const devsWithProjects = Object.entries(byDev.byDev)
      .filter(([, rows]) => rows.length > 0)
      .map(([dev, rows]) => ({ dev, rows }));
    return devsWithProjects;
  }, [byDev]);

  const toggleCheck = (key: string) =>
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));

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
    lines.push('Add these to the backlog in this order:');
    nextUp.forEach(({ pitch }, i) => {
      lines.push(`  ${i + 1}. ${pitch.title} [${pitch.category}]`);
    });

    lines.push('');
    lines.push('FOLLOW-UPS');
    followUpItems.forEach(({ dev, rows }) => {
      lines.push(`[ ] Let ${dev} know their projects: ${rows.map(r => r.pitch.title).join(', ')} — check for concerns`);
    });
    lines.push('[ ] Start Stage 3: send interest voting link to devs for next round');

    navigator.clipboard.writeText(lines.join('\n'));
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
              <TableCell sx={{ width: '45%' }}>Project</TableCell>
              <TableCell sx={{ width: '20%' }}>Category</TableCell>
              <TableCell>Dev</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selected.map(({ assignment, pitch }) => (
              <TableRow key={pitch.id}>
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
                <Box component="ul" sx={{ pl: 3, m: 0 }}>
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

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
        Up Next — Lifeboat Order ({nextUp.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add these to the backlog in this order (sorted by team vote priority).
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

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
        Follow-ups
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 3 }}>
        {followUpItems.map(({ dev, rows }) => (
          <FormControlLabel
            key={dev}
            control={
              <Checkbox
                checked={!!checkedItems[`dev-${dev}`]}
                onChange={() => toggleCheck(`dev-${dev}`)}
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Let <strong>{dev}</strong> know their project{rows.length !== 1 ? 's' : ''}:{' '}
                {rows.map(r => r.pitch.title).join(', ')} — check for concerns
              </Typography>
            }
          />
        ))}
        <FormControlLabel
          control={
            <Checkbox
              checked={!!checkedItems['stage3']}
              onChange={() => toggleCheck('stage3')}
              size="small"
            />
          }
          label={
            <Typography variant="body2">
              Start Stage 3: send interest voting link to devs for next round
            </Typography>
          }
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight="bold">How to Create Project Records</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {PRJ_INSTRUCTIONS}
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
