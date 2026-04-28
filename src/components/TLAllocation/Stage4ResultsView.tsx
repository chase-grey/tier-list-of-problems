import { useMemo, useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Divider, Paper, Checkbox, FormControlLabel,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type {
  AllocationPitch, PlanAssignment, StaffingAssignment, AllocationConfig,
} from '../../types/allocationTypes';
import { useSnackbar } from '../../hooks/useSnackbar';
import { getFollowups, updateFollowup } from '../../services/api';

interface Props {
  pitches: AllocationPitch[];
  currentAssignments: PlanAssignment[];
  step2Assignments: StaffingAssignment[];
  config: AllocationConfig;
  onBack?: () => void;
}

function buildMailtoHref(to: string, cc: string, subject: string, body: string): string {
  const parts = [`subject=${encodeURIComponent(subject)}`];
  if (cc) parts.push(`cc=${encodeURIComponent(cc)}`);
  parts.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${encodeURIComponent(to)}?${parts.join('&')}`;
}

function buildProjectEmailBody(
  tl: string,
  pitch: AllocationPitch,
  dev: string | null,
  sa: StaffingAssignment,
  config: AllocationConfig,
): string {
  const shortTitle = pitch.title.replace(/^[^/]+\/\s*/, '');
  const qmFirstName = sa.qm ? sa.qm.split(' ')[0] : 'QM';
  const lines: string[] = [
    `Hi everyone, this is the team for ${shortTitle}! @${qmFirstName}, please setup a kickoff meeting for this pitch in the next week.`,
    '',
    `Dev TL: ${tl}`,
    `Dev: ${dev ?? '—'}`,
    `QM: ${sa.qm ?? '—'}`,
  ];
  if (sa.pqa1) lines.push(`PQA1: ${sa.pqa1}`);
  if (config.testingCaptain) lines.push(`Testing Captain: ${config.testingCaptain}`);
  return lines.join('\n');
}

export default function Stage4ResultsView({ pitches, currentAssignments, step2Assignments, config, onBack }: Props) {
  const { showSnackbar } = useSnackbar();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getFollowups().then(followups => {
      const loaded: Record<string, boolean> = {};
      for (const [pitchId, state] of Object.entries(followups)) {
        const sa = step2Assignments.find(a => a.pitchId === pitchId);
        const tl = sa?.devTL ?? '';
        if (state.projectCreated) loaded[`prj-${tl}-${pitchId}`] = true;
        if (state.kickoffEmailSent) loaded[`email-${tl}-${pitchId}`] = true;
      }
      setCheckedItems(loaded);
    }).catch(() => {});
  }, [step2Assignments]);

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

  const toggleCheck = (key: string, pitchId: string, field: 'projectCreated' | 'kickoffEmailSent') => {
    setCheckedItems(prev => {
      const next = { ...prev, [key]: !prev[key] };
      updateFollowup(pitchId, field, next[key]).catch(() =>
        showSnackbar('Failed to save follow-up status', 'error')
      );
      return next;
    });
  };

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
      if (rows.length === 0 && (backlogByTL[tl]?.length ?? 0) === 0) continue;
      lines.push('');
      lines.push(`${tl}`);
      rows.forEach(({ pitch, dev, sa }) => {
        const shortTitle = pitch.title.replace(/^[^/]+\/\s*/, '');
        lines.push(`  ${shortTitle}`);
        lines.push(`    [ ] Create PRJ record — Dev: ${dev ?? '—'}, QM: ${sa.qm ?? '—'}${sa.pqa1 ? `, PQA1: ${sa.pqa1}` : ''}. Attach pitch ZQN on Associated Records tab.`);
        lines.push(`    [ ] Send kickoff email`);
      });
      const backlog = backlogByTL[tl] ?? [];
      if (backlog.length > 0) {
        lines.push(`  [ ] Create backlog PRJ records:`);
        backlog.forEach(({ pitch }, i) => {
          lines.push(`    ${i + 1}. ${pitch.title}`);
        });
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
    showSnackbar('Summary copied to clipboard', 'success');
  };

  const tlsWithWork = config.devTLNames.filter(
    tl => (byTL[tl]?.length ?? 0) > 0 || (backlogByTL[tl]?.length ?? 0) > 0
  );

  const isTLDone = (tl: string): boolean => {
    const rows = byTL[tl] ?? [];
    const backlog = backlogByTL[tl] ?? [];
    const projectsDone = rows.every(({ pitch }) =>
      !!checkedItems[`prj-${tl}-${pitch.id}`] && !!checkedItems[`email-${tl}-${pitch.id}`]
    );
    const backlogDone = backlog.length === 0 || !!checkedItems[`backlog-${tl}`];
    return rows.length > 0 && projectsDone && backlogDone;
  };

  const allFollowupsDone = tlsWithWork.length > 0 && tlsWithWork.every(isTLDone);

  return (
    <Box sx={{ p: 3, overflow: 'auto', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          {onBack && (
            <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 1, pl: 0 }} color="inherit">
              Back to editing
            </Button>
          )}
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

      {/* TL Follow-ups */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: allFollowupsDone ? 'success.main' : 'text.primary' }}>
        TL Follow-ups {allFollowupsDone && '✓'}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tlsWithWork.map(tl => {
          const rows = byTL[tl] ?? [];
          const backlog = backlogByTL[tl] ?? [];
          const tlEmail = config.tlEmails?.[tl] ?? '';
          const emails = config.memberEmails ?? {};
          const tlDone = isTLDone(tl);

          return (
            <Paper key={tl} variant="outlined" sx={{
              p: 2,
              ...(tlDone && {
                borderColor: 'success.main',
                bgcolor: 'rgba(46, 125, 50, 0.05)',
              }),
            }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5, color: tlDone ? 'success.main' : 'text.primary' }}>
                {tl} {tlDone && '✓'}
              </Typography>

              {rows.map(({ pitch, dev, sa }) => {
                const shortTitle = pitch.title.replace(/^[^/]+\/\s*/, '');
                const subject = `ST SmartTools Kickoff${config.quarterLabel ? ` — Q${config.quarterLabel}` : ''} — ${shortTitle}`;
                const toEmail = [
                  dev ? (emails[dev] ?? '') : '',
                  sa.qm ? (emails[sa.qm] ?? '') : '',
                ].filter(Boolean).join(',');
                const ccEmail = [
                  sa.pqa1 ? (emails[sa.pqa1] ?? '') : '',
                  config.testingCaptain ? (emails[config.testingCaptain] ?? '') : '',
                ].filter(Boolean).join(',');
                const pitchMailtoHref = buildMailtoHref(
                  toEmail || tlEmail,
                  toEmail ? ccEmail : '',
                  subject,
                  buildProjectEmailBody(tl, pitch, dev, sa, config),
                );
                const allDone = !!checkedItems[`prj-${tl}-${pitch.id}`] && !!checkedItems[`email-${tl}-${pitch.id}`];
                return (
                  <Box key={pitch.id} sx={{
                    mb: 2,
                    ...(allDone && {
                      bgcolor: 'rgba(46, 125, 50, 0.08)',
                      border: '1px solid',
                      borderColor: 'success.main',
                      borderRadius: 1,
                      px: 1,
                      py: 0.5,
                      mx: -1,
                    }),
                  }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                      {shortTitle}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!checkedItems[`prj-${tl}-${pitch.id}`]}
                            onChange={() => toggleCheck(`prj-${tl}-${pitch.id}`, pitch.id, 'projectCreated')}
                            size="small"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">Create PRJ record</Typography>
                            <Typography variant="caption" color="text.secondary">
                              People tab: Dev TL: {tl}, Dev: {dev ?? '—'}, QM: {sa.qm ?? '—'}
                              {sa.pqa1 ? `, PQA1: ${sa.pqa1}` : ''}
                              {config.testingCaptain ? `, Testing Captain: ${config.testingCaptain}` : ''}
                              {' · '}Attach pitch ZQN on Associated Records tab
                            </Typography>
                          </Box>
                        }
                        sx={{ flex: 1, mb: 0, alignItems: 'flex-start' }}
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!checkedItems[`email-${tl}-${pitch.id}`]}
                            onChange={() => toggleCheck(`email-${tl}-${pitch.id}`, pitch.id, 'kickoffEmailSent')}
                            size="small"
                          />
                        }
                        label={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">Send kickoff email</Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              href={pitchMailtoHref}
                              sx={{ fontSize: '0.7rem', py: 0, px: 1, minWidth: 0 }}
                            >
                              Open in Outlook
                            </Button>
                          </Box>
                        }
                        sx={{ flexShrink: 0, alignItems: 'center' }}
                      />
                    </Box>
                  </Box>
                );
              })}

              {backlog.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Create backlog PRJ records ({backlog.length})
                  </Typography>
                  {backlog.map(({ pitch }) => (
                    <FormControlLabel
                      key={pitch.id}
                      control={
                        <Checkbox
                          checked={!!checkedItems[`backlog-${tl}-${pitch.id}`]}
                          onChange={() => setCheckedItems(prev => ({ ...prev, [`backlog-${tl}-${pitch.id}`]: !prev[`backlog-${tl}-${pitch.id}`] }))}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" color="text.secondary">
                          {pitch.title}
                        </Typography>
                      }
                      sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>

    </Box>
  );
}
