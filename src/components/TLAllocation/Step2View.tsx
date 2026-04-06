import { lazy, Suspense, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, Divider, Tooltip, Button, Chip, IconButton,
} from '@mui/material';
import { Warning as WarnIcon, CheckCircle as OkIcon, InfoOutlined as InfoIcon } from '@mui/icons-material';
import type {
  AllocationPitch, Phase2Interest, StaffingAssignment, AllocationConfig,
} from '../../types/allocationTypes';
import InterestChip from './InterestChip';

const DetailsBubble = lazy(() => import('../VotingBoard/PitchCard/DetailsBubble'));

interface Step2ViewProps {
  selectedPitches: AllocationPitch[];
  assignments: StaffingAssignment[];
  phase2Interests: Phase2Interest[];
  config: AllocationConfig;
  onAssign: (pitchId: string, field: 'devTL' | 'qm', value: string | null) => void;
  onFinalize: () => void;
}

export default function Step2View({
  selectedPitches, assignments, phase2Interests, config, onAssign, onFinalize,
}: Step2ViewProps) {
  const assignMap = useMemo(
    () => new Map(assignments.map(a => [a.pitchId, a])),
    [assignments]
  );

  const devTLInterests = phase2Interests.filter(p => p.role === 'dev TL');
  const qmInterests = phase2Interests.filter(p => p.role === 'QM');

  const totalPitches = selectedPitches.length;

  // Per-person data completeness (key absent from interestByPitchId = no data for that pitch)
  const personDataStatus = useMemo(() => {
    return Object.fromEntries(
      phase2Interests.map(pi => {
        const filled = selectedPitches.filter(p => p.id in pi.interestByPitchId).length;
        if (filled === 0) return [pi.personName, 'none'];
        if (filled < totalPitches) return [pi.personName, 'partial'];
        return [pi.personName, 'full'];
      })
    ) as Record<string, 'full' | 'partial' | 'none'>;
  }, [phase2Interests, selectedPitches, totalPitches]);

  // Per-person assignment summary: count of each interest tier assigned
  const personSummary = useMemo(() => {
    const summary: Record<string, Record<number, number>> = {};
    [...config.devTLNames, ...config.qmNames].forEach(name => {
      summary[name] = { 1: 0, 2: 0, 3: 0, 4: 0 };
    });

    assignments.forEach(a => {
      if (a.devTL) {
        const interest = phase2Interests.find(pi => pi.personName === a.devTL);
        const tier = interest?.interestByPitchId[a.pitchId] ?? 4;
        if (summary[a.devTL] && tier) summary[a.devTL][tier]++;
      }
      if (a.qm) {
        const interest = phase2Interests.find(pi => pi.personName === a.qm);
        const tier = interest?.interestByPitchId[a.pitchId] ?? 4;
        if (summary[a.qm] && tier) summary[a.qm][tier]++;
      }
    });
    return summary;
  }, [assignments, phase2Interests, config]);

  const hasHighInterest = (name: string) => (personSummary[name]?.[1] ?? 0) + (personSummary[name]?.[2] ?? 0) > 0;

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: assignment table ── */}
      <Box sx={{ flex: 3, overflow: 'auto', p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Assign Dev TL + QM to each project
        </Typography>
        <Paper variant="outlined">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { fontSize: '0.72rem', color: 'text.secondary' } }}>
                <TableCell>Project</TableCell>
                <TableCell width={210}>Dev TL</TableCell>
                <TableCell width={210}>QM</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedPitches.map(pitch => {
                const a = assignMap.get(pitch.id) ?? { pitchId: pitch.id, devTL: null, qm: null };
                return (
                  <Step2Row
                    key={pitch.id}
                    pitch={pitch}
                    assignment={a}
                    devTLInterests={devTLInterests}
                    qmInterests={qmInterests}
                    onAssign={onAssign}
                  />
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* ── Right: summary ── */}
      <Box sx={{ width: 240, flexShrink: 0, overflow: 'auto', p: 2, borderLeft: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>People</Typography>

        {[
          { label: 'Dev TLs', names: config.devTLNames },
          { label: 'QMs', names: config.qmNames },
        ].map(({ label, names }) => (
          <Box key={label} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {label}
            </Typography>
            {names.map(name => {
              const hasHigh = hasHighInterest(name);
              const assigned = assignments.filter(a => a.devTL === name || a.qm === name).length;
              const dataStatus = personDataStatus[name] ?? 'full';
              return (
                <Box key={name} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {hasHigh
                      ? <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
                      : <WarnIcon fontSize="small" color="warning" sx={{ fontSize: '0.9rem' }} />
                    }
                    <Typography variant="caption" fontWeight={600}>{name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {assigned} projects
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, ml: 2, flexWrap: 'wrap' }}>
                    {dataStatus === 'none' && (
                      <Chip label="No data" size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    )}
                    {dataStatus === 'partial' && (
                      <Chip label="Partial data" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    )}
                    {!hasHigh && dataStatus !== 'none' && (
                      <Chip label="No high-interest" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                    )}
                    {[1, 2, 3, 4].map(tier => {
                      const count = personSummary[name]?.[tier] ?? 0;
                      if (count === 0) return null;
                      return (
                        <InterestChip
                          key={tier}
                          level={tier as 1 | 2 | 3 | 4}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
            <Divider sx={{ mt: 1 }} />
          </Box>
        ))}

        <Button variant="contained" color="success" fullWidth onClick={onFinalize}
          disabled={assignments.some(a => !a.devTL || !a.qm)}
        >
          Finalize &amp; Create Records
        </Button>
        {assignments.some(a => !a.devTL || !a.qm) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
            All projects must have a dev TL and QM
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── Step 2 table row ──────────────────────────────────────────────────────────

interface Step2RowProps {
  pitch: AllocationPitch;
  assignment: StaffingAssignment;
  devTLInterests: Phase2Interest[];
  qmInterests: Phase2Interest[];
  onAssign: (pitchId: string, field: 'devTL' | 'qm', value: string | null) => void;
}

function Step2Row({ pitch, assignment, devTLInterests, qmInterests, onAssign }: Step2RowProps) {
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <TableRow>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Tooltip title={pitch.title} placement="top-start">
            <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {pitch.title.replace(/^[^/]+\/\s*/, '')}
            </Typography>
          </Tooltip>
          <Tooltip title="View pitch details">
            <IconButton
              size="small"
              sx={{ p: 0.25, flexShrink: 0 }}
              onClick={e => setDetailsAnchor(e.currentTarget)}
            >
              <InfoIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
            </IconButton>
          </Tooltip>
        </Box>
        {detailsAnchor && (
          <Suspense fallback={null}>
            <DetailsBubble
              pitch={pitch}
              anchorEl={detailsAnchor}
              onClose={() => setDetailsAnchor(null)}
            />
          </Suspense>
        )}
      </TableCell>
      <TableCell>
        <AssignmentDropdown
          value={assignment.devTL}
          options={devTLInterests}
          pitchId={pitch.id}
          onChange={v => onAssign(pitch.id, 'devTL', v)}
        />
      </TableCell>
      <TableCell>
        <AssignmentDropdown
          value={assignment.qm}
          options={qmInterests}
          pitchId={pitch.id}
          onChange={v => onAssign(pitch.id, 'qm', v)}
        />
      </TableCell>
    </TableRow>
  );
}

// ─── Assignment dropdown ───────────────────────────────────────────────────────

interface AssignmentDropdownProps {
  value: string | null;
  options: Phase2Interest[];
  pitchId: string;
  onChange: (val: string | null) => void;
}

function AssignmentDropdown({ value, options, pitchId, onChange }: AssignmentDropdownProps) {
  const sorted = [...options].sort((a, b) => {
    const tA = a.interestByPitchId[pitchId] ?? 5;
    const tB = b.interestByPitchId[pitchId] ?? 5;
    return (tA as number) - (tB as number);
  });

  return (
    <Select
      size="small"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      displayEmpty
      sx={{ fontSize: '0.75rem', minWidth: 160 }}
      renderValue={val => val
        ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span>{val as string}</span>
            <InterestChip level={options.find(o => o.personName === val)?.interestByPitchId[pitchId] ?? null} />
          </Box>
        : <Typography variant="caption" color="text.disabled">Assign…</Typography>
      }
    >
      <MenuItem value=""><em>Unassign</em></MenuItem>
      {sorted.map(person => (
        <MenuItem key={person.personName} value={person.personName}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ flex: 1 }}>{person.personName}</Typography>
            <InterestChip level={person.interestByPitchId[pitchId] ?? null} />
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}
