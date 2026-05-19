import { useMemo, useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Divider, Link, Paper, Checkbox, FormControlLabel, Chip, Tooltip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Star as StarIcon } from '@mui/icons-material';
import type {
  AllocationPitch, PlanAssignment, StaffingAssignment, AllocationConfig,
} from '../../types/allocationTypes';
import { useSnackbar } from '../../hooks/useSnackbar';
import { getFollowups, updateFollowup } from '../../services/api';
import { getShortName } from '../../data/teamRoster';

const UXD_NAME = 'Selina Li';

const CATEGORY_ORDER: Record<string, number> = {
  'Support AI Charting': 0,
  'Create and Improve Tools and Framework': 1,
  'Mobile Feature Parity': 2,
  'Address Technical Debt': 3,
};

interface Props {
  pitches: AllocationPitch[];
  currentAssignments: PlanAssignment[];
  step2Assignments: StaffingAssignment[];
  config: AllocationConfig;
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
  const lastSegment = pitch.title.split('/').pop()?.trim() ?? pitch.title;
  const qmFirstName = sa.qm ? getShortName(sa.qm) : 'QM';
  const lines: string[] = [
    `Hi everyone,`,
    '',
    `This is the team for ${lastSegment} [QAN ${pitch.id}]! @${qmFirstName}, please setup a kickoff meeting for this pitch in the next week.`,
    '',
    `Dev: ${dev ?? '—'}`,
    `QM: ${sa.qm ?? '—'}`,
  ];
  if (sa.pqa1) lines.push(`PQA1: ${sa.pqa1}`);
  // UXD is universal — Selina is on every kickoff.
  lines.push(`UXD: ${UXD_NAME}`);
  if (config.testingCaptain) lines.push(`Testing Captain: ${config.testingCaptain}`);
  lines.push(`Dev TL: ${tl}`);
  return lines.join('\n');
}

export default function Stage4ResultsView({ pitches, currentAssignments, step2Assignments, config }: Props) {
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
  // Only projects with plan status='selected' (or committed pitches, which are
  // always planned by definition) should appear in the kickoff grid. Backend
  // can carry stale step2Assignment rows for pitches later demoted to
  // next-up/cut — without this gate they'd leak back into the summary with
  // missing devs and "ghost" status.
  const plannedPitchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of currentAssignments) {
      if (a.status === 'selected') ids.add(a.pitchId);
    }
    for (const p of pitches) {
      if (p.committed) ids.add(p.id);
    }
    return ids;
  }, [currentAssignments, pitches]);

  const fullGrid = useMemo(() =>
    step2Assignments
      .map(sa => ({ sa, pitch: pitchById[sa.pitchId], dev: devByPitchId[sa.pitchId] ?? null }))
      .filter(({ sa, pitch }) => pitch != null && plannedPitchIds.has(sa.pitchId))
      .sort((a, b) => {
        // Committed projects float to the top, then category, then team priority.
        if (!!a.pitch.committed !== !!b.pitch.committed) return a.pitch.committed ? -1 : 1;
        return (CATEGORY_ORDER[a.pitch.category] ?? 99) - (CATEGORY_ORDER[b.pitch.category] ?? 99) ||
          a.pitch.teamPriorityScore - b.pitch.teamPriorityScore;
      }),
    [step2Assignments, pitchById, devByPitchId, plannedPitchIds],
  );

  // Pitches already in the Full Assignment Grid (have a step2Assignment, so
  // they're being kicked off this quarter) shouldn't double-appear in the
  // Up-Next backlog list — even if their PlanAssignment.status is still
  // 'next-up'. The kickoff list wins because the TL set a team, and a
  // backlog reminder for the same pitch would be a duplicate task.
  const fullGridPitchIds = useMemo(
    () => new Set(fullGrid.map(({ pitch }) => pitch.id)),
    [fullGrid],
  );
  const nextUp = useMemo(() =>
    currentAssignments
      .filter(a => a.status === 'next-up' && !fullGridPitchIds.has(a.pitchId))
      .map(a => ({ assignment: a, pitch: pitchById[a.pitchId] }))
      .filter(({ pitch }) => pitch != null)
      .sort((a, b) =>
        (CATEGORY_ORDER[a.pitch.category] ?? 99) - (CATEGORY_ORDER[b.pitch.category] ?? 99) ||
        a.pitch.teamPriorityScore - b.pitch.teamPriorityScore
      ),
    [currentAssignments, pitchById, fullGridPitchIds],
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

  const pitchIndexById = useMemo(
    () => new Map(fullGrid.map(({ pitch }, i) => [pitch.id, i + 1])),
    [fullGrid],
  );

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
        lines.push(`    [ ] Create PRJ record/not needed — Attach QAN ${pitch.id} on Associated Records tab. Dev: ${dev ?? '—'}, QM: ${sa.qm ?? '—'}${sa.pqa1 ? `, PQA1: ${sa.pqa1}` : ''}.`);
        lines.push(`    [ ] Send kickoff email/not needed`);
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
    // Backlog checkboxes are keyed per-pitch (`backlog-${tl}-${pitchId}`), so
    // completion needs to verify every backlog row, not a single aggregate key.
    const backlogDone = backlog.every(({ pitch }) =>
      !!checkedItems[`backlog-${tl}-${pitch.id}`]
    );
    return rows.length > 0 && projectsDone && backlogDone;
  };

  const allFollowupsDone = tlsWithWork.length > 0 && tlsWithWork.every(isTLDone);

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
            <TableCell sx={{ width: '2.5rem' }}>#</TableCell>
            <TableCell sx={{ width: '33%' }}>Project</TableCell>
            <TableCell>Dev</TableCell>
            <TableCell>Dev TL</TableCell>
            <TableCell>QM</TableCell>
            <TableCell>PQA1</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fullGrid.map(({ pitch, dev, sa }, i) => (
            <TableRow key={pitch.id}>
              <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{i + 1}</TableCell>
              <TableCell sx={{ overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                  {pitch.committed && (
                    <Chip label="COMMITTED" size="small" color="success" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }} />
                  )}
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{pitch.title}</Typography>
                </Box>
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
                const lastSegment = pitch.title.split('/').pop()?.trim() ?? pitch.title;
                const subject = lastSegment;
                const toEmail = [
                  dev ? (emails[dev] ?? '') : '',
                  sa.qm ? (emails[sa.qm] ?? '') : '',
                ].filter(Boolean).join(',');
                const ccEmail = [
                  sa.pqa1 ? (emails[sa.pqa1] ?? '') : '',
                  config.testingCaptain ? (emails[config.testingCaptain] ?? '') : '',
                  // Selina is on every kickoff as the UXD — no per-pitch toggle.
                  emails[UXD_NAME] ?? '',
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ mr: 0.75 }}>
                          {pitchIndexById.get(pitch.id)}.
                        </Typography>
                        {lastSegment}
                      </Typography>
                      {pitch.author === tl && (
                        <Tooltip title="Wrote this pitch">
                          <StarIcon sx={{ fontSize: '0.9rem', color: 'text.disabled', flexShrink: 0 }} />
                        </Tooltip>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                        <Checkbox
                          checked={!!checkedItems[`prj-${tl}-${pitch.id}`]}
                          onChange={() => toggleCheck(`prj-${tl}-${pitch.id}`, pitch.id, 'projectCreated')}
                          size="small"
                          sx={{ mt: '-2px', mr: 1 }}
                        />
                        <Box>
                          <Typography variant="body2">Create PRJ record/not needed</Typography>
                          <Typography variant="caption" color="text.secondary">
                            <Link
                              href={`https://emc2summary/GetSummaryReport.ashx/TRACK/ZQN/${pitch.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                            >
                              QAN {pitch.id}
                            </Link>
                            {' on Associated Records tab · '}People tab: Dev TL: {tl}, Dev: {dev ?? '—'}, QM: {sa.qm ?? '—'}
                            {sa.pqa1 ? `, PQA1: ${sa.pqa1}` : ''}
                            {config.testingCaptain ? `, Testing Captain: ${config.testingCaptain}` : ''}
                          </Typography>
                        </Box>
                      </Box>

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
                            <Typography variant="body2">Send kickoff email/not needed</Typography>
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
                        <Box component="span" sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {pitch.title}
                          </Typography>
                          <Link
                            href={`https://emc2summary/GetSummaryReport.ashx/TRACK/ZQN/${pitch.id}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            variant="caption"
                          >
                            QAN {pitch.id}
                          </Link>
                        </Box>
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
