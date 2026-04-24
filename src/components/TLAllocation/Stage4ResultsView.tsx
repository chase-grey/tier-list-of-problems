import { useMemo, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Divider, Paper, Checkbox, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type {
  AllocationPitch, PlanAssignment, StaffingAssignment, AllocationConfig,
} from '../../types/allocationTypes';

interface Props {
  pitches: AllocationPitch[];
  currentAssignments: PlanAssignment[];
  step2Assignments: StaffingAssignment[];
  config: AllocationConfig;
}

const PRJ_INSTRUCTIONS = `How to create a project record:
1. In TRACK, create a new PRJ record with the project title.
2. On the People tab: add the dev as the developer, QM as quality manager, dev TL as TL, and testing captain.
3. On the Details tab: set the quarter/cycle and category.
4. On the Associated Records tab: attach the pitch ZQN record.
5. Add the PRJ to the team backlog.`;

function buildMailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildTLEmailBody(
  tl: string,
  rows: { pitch: AllocationPitch; dev: string | null; sa: StaffingAssignment }[],
  config: AllocationConfig,
): string {
  const q = config.quarterLabel ? `Q${config.quarterLabel}` : 'next quarter';
  const lines: string[] = [
    `Hi ${tl},`,
    '',
    `Here are your assigned projects for ${q}:`,
    '',
  ];
  rows.forEach(({ pitch, dev, sa }) => {
    lines.push(`Project: ${pitch.title}`);
    lines.push(`  Dev: ${dev ?? '—'}`);
    lines.push(`  QM: ${sa.qm ?? '—'}`);
    if (sa.pqa1) lines.push(`  PQA1: ${sa.pqa1}`);
    if (config.testingCaptain) lines.push(`  Testing Captain: ${config.testingCaptain}`);
    lines.push('');
  });
  lines.push('Please create a PRJ record for each project:');
  lines.push('  1. Create a new PRJ record with the project title.');
  lines.push('  2. On the People tab: add dev, QM, TL, and testing captain.');
  lines.push('  3. On the Associated Records tab: attach the pitch ZQN.');
  lines.push('  4. Add the PRJ to the team backlog.');
  lines.push('');
  lines.push('Thanks!');
  return lines.join('\n');
}

export default function Stage4ResultsView({ pitches, currentAssignments, step2Assignments, config }: Props) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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

  // Backlog PRJ records split round-robin across devTLNames
  const backlogByTL = useMemo(() => {
    const tls = config.devTLNames;
    const map: Record<string, typeof nextUp> = {};
    tls.forEach(tl => { map[tl] = []; });
    nextUp.forEach((item, i) => {
      const tl = tls[i % tls.length];
      if (tl) map[tl].push(item);
    });
    return map;
  }, [nextUp, config.devTLNames]);

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

  const toggleCheck = (key: string) =>
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));

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
      lines.push('  [ ] Send kickoff email');
      lines.push('  [ ] Create PRJ records:');
      rows.forEach(({ pitch, dev, sa }) => {
        lines.push(`    • ${pitch.title} — Dev: ${dev ?? '—'}, QM: ${sa.qm ?? '—'}${sa.pqa1 ? `, PQA1: ${sa.pqa1}` : ''}`);
      });
      const backlog = backlogByTL[tl] ?? [];
      if (backlog.length > 0) {
        lines.push('  [ ] Create backlog PRJ records:');
        backlog.forEach(({ pitch }, i) => {
          lines.push(`    ${i + 1}. ${pitch.title}`);
        });
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
  };

  const tlsWithWork = config.devTLNames.filter(
    tl => (byTL[tl]?.length ?? 0) > 0 || (backlogByTL[tl]?.length ?? 0) > 0
  );

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
      <Table size="small" sx={{ mb: 4, tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '35%' }}>Project</TableCell>
            <TableCell>Dev</TableCell>
            <TableCell>Dev TL</TableCell>
            <TableCell>QM</TableCell>
            <TableCell>PQA1</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fullGrid.map(({ pitch, dev, sa }) => (
            <TableRow key={pitch.id}>
              <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pitch.title}
              </TableCell>
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
        Add to backlog in this order (sorted by team vote priority). Split between TLs below.
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
        {tlsWithWork.map(tl => {
          const rows = byTL[tl] ?? [];
          const backlog = backlogByTL[tl] ?? [];
          const tlEmail = config.tlEmails?.[tl] ?? '';
          const subject = `ST SmartTools Allocation${config.quarterLabel ? ` — Q${config.quarterLabel}` : ''} — Your Projects`;
          const emailBody = buildTLEmailBody(tl, rows, config);
          const mailtoHref = buildMailtoHref(tlEmail, subject, emailBody);

          return (
            <Paper key={tl} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                {tl}
              </Typography>

              {rows.length > 0 && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!checkedItems[`email-${tl}`]}
                        onChange={() => toggleCheck(`email-${tl}`)}
                        size="small"
                      />
                    }
                    label={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">Send kickoff email</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          href={mailtoHref}
                          sx={{ fontSize: '0.7rem', py: 0, px: 1, minWidth: 0 }}
                        >
                          Open in Outlook
                        </Button>
                      </Box>
                    }
                    sx={{ mb: 0.5, alignItems: 'flex-start' }}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!checkedItems[`prj-${tl}`]}
                        onChange={() => toggleCheck(`prj-${tl}`)}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          Create PRJ records ({rows.length} project{rows.length !== 1 ? 's' : ''})
                        </Typography>
                        <Box component="ul" sx={{ pl: 3, m: 0 }}>
                          {rows.map(({ pitch, dev, sa }) => (
                            <Box component="li" key={pitch.id}>
                              <Typography variant="body2" color="text.secondary">
                                {pitch.title} — Dev: {dev ?? '—'}, QM: {sa.qm ?? '—'}
                                {sa.pqa1 ? `, PQA1: ${sa.pqa1}` : ''}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    }
                    sx={{ mb: 0.5, alignItems: 'flex-start' }}
                  />
                </>
              )}

              {backlog.length > 0 && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!checkedItems[`backlog-${tl}`]}
                      onChange={() => toggleCheck(`backlog-${tl}`)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Create backlog PRJ records ({backlog.length})
                      </Typography>
                      <Box component="ol" sx={{ pl: 3, m: 0 }}>
                        {backlog.map(({ pitch }, i) => (
                          <Box component="li" key={pitch.id}>
                            <Typography variant="body2" color="text.secondary">
                              {i + 1}. {pitch.title} [{pitch.category}]
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
              )}
            </Paper>
          );
        })}
      </Box>

      <Divider sx={{ mt: 3, mb: 3 }} />

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
