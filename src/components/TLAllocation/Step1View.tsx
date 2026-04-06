import { lazy, Suspense, useRef, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Select, MenuItem, Divider, Tooltip,
  LinearProgress, Chip, Collapse, Button, IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Warning as WarnIcon,
  CheckCircle as OkIcon,
  InfoOutlined as InfoIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import type { AllocationPlan, AllocationPitch, AssignmentStatus, PlanAssignment } from '../../types/allocationTypes';
import type { AllocationConfig } from '../../types/allocationTypes';
import InterestChip from './InterestChip';

const DetailsBubble = lazy(() => import('../VotingBoard/PitchCard/DetailsBubble'));

interface Step1ViewProps {
  pitches: AllocationPitch[];
  plans: AllocationPlan[];
  activePlanId: 'A' | 'B' | 'C';
  currentAssignments: PlanAssignment[];
  config: AllocationConfig;
  onPlanChange: (id: 'A' | 'B' | 'C') => void;
  onDevChange: (pitchId: string, dev: string | null) => void;
  onStatusChange: (pitchId: string, newStatus: AssignmentStatus) => void;
  onProceed: () => void;
}

const CATEGORY_SHORT: Record<string, string> = {
  'Support AI Charting': 'AI Charting',
  'Create and Improve Tools and Framework': 'Tools & Framework',
  'Mobile Feature Parity': 'Mobile Parity',
  'Address Technical Debt': 'Technical Debt',
};

/** Color for a priority score (tier avg). Lower = better = green. */
function scoreColor(score: number): string {
  if (score <= 1.8) return '#4caf50';
  if (score <= 2.8) return '#ff9800';
  return '#f44336';
}

/** Width % for a "quality bar" — higher bar = better priority (inverts tier scale). */
function priorityBarPct(score: number): number {
  return Math.round(((5 - score) / 4) * 100);
}

function interestLabel(avg: number): string {
  if (avg <= 1.5) return 'Very High';
  if (avg <= 2.5) return 'High';
  if (avg <= 3.5) return 'Medium';
  return 'Low';
}

export default function Step1View({
  pitches, plans, activePlanId, currentAssignments, config,
  onPlanChange, onDevChange, onStatusChange, onProceed,
}: Step1ViewProps) {
  const [showCut, setShowCut] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const pitchMap = useMemo(() => new Map(pitches.map(p => [p.id, p])), [pitches]);

  const categories = Object.keys(config.bandwidth);

  // ── Draggable sidebar ─────────────────────────────────────────────────────
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - ev.clientX; // drag left = wider sidebar
      setSidebarWidth(Math.max(220, Math.min(640, dragRef.current.startWidth + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Missing data status per dev ────────────────────────────────────────────
  const devDataStatus = useMemo<Record<string, 'full' | 'partial' | 'none'>>(() => {
    const total = pitches.length;
    return Object.fromEntries(
      config.devNames.map(dev => {
        const filled = pitches.filter(p => dev in p.devInterest).length;
        if (filled === 0) return [dev, 'none'];
        if (filled < total) return [dev, 'partial'];
        return [dev, 'full'];
      })
    );
  }, [pitches, config.devNames]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const selectedAssignments = currentAssignments.filter(a => a.status === 'selected');
    const total = selectedAssignments.length;

    const selectedPitchList = selectedAssignments
      .map(a => pitchMap.get(a.pitchId))
      .filter((p): p is AllocationPitch => p !== undefined);

    // Priority averages (lower = better)
    const avgTeamPriority = selectedPitchList.length
      ? selectedPitchList.reduce((s, p) => s + p.teamPriorityScore, 0) / selectedPitchList.length
      : null;
    const avgTLPriority = selectedPitchList.length
      ? selectedPitchList.reduce((s, p) => s + p.tlPriorityScore, 0) / selectedPitchList.length
      : null;

    // Category % adherence
    const catCounts: Record<string, number> = {};
    categories.forEach(c => { catCounts[c] = 0; });
    selectedAssignments.forEach(a => {
      const p = pitchMap.get(a.pitchId);
      if (p) catCounts[p.category] = (catCounts[p.category] ?? 0) + 1;
    });
    const catActualPct = Object.fromEntries(
      categories.map(c => [c, total > 0 ? Math.round((catCounts[c] / total) * 100) : 0])
    );

    // Continuation projects
    const allContinuations = pitches.filter(p => p.continuation);
    const selectedIds = new Set(selectedAssignments.map(a => a.pitchId));
    const continuationsDropped = allContinuations.filter(p => !selectedIds.has(p.id));

    // Dev workload
    const devProjects: Record<string, string[]> = {};
    config.devNames.forEach(d => { devProjects[d] = []; });
    selectedAssignments.forEach(a => {
      if (a.assignedDev) devProjects[a.assignedDev].push(a.pitchId);
    });

    // Interest alignment: for selected+assigned pitches, what is the assigned dev's interest?
    const assignedInterestTiers = selectedAssignments
      .filter(a => a.assignedDev)
      .map(a => pitchMap.get(a.pitchId)?.devInterest[a.assignedDev!] ?? null)
      .filter((t): t is 1 | 2 | 3 | 4 => t !== null);
    const avgAssignedInterest = assignedInterestTiers.length
      ? assignedInterestTiers.reduce((s, t) => s + t, 0) / assignedInterestTiers.length
      : null;
    const highInterestCount = assignedInterestTiers.filter(t => t <= 2).length;

    return {
      avgTeamPriority, avgTLPriority,
      catActualPct,
      allContinuations, continuationsDropped,
      devProjects,
      avgAssignedInterest, highInterestCount, assignedCount: assignedInterestTiers.length,
      total,
    };
  }, [currentAssignments, pitchMap, categories, config.devNames, pitches]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: project list ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, minWidth: 0 }}>
        {/* Plan toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">Plan:</Typography>
          <ToggleButtonGroup
            value={activePlanId}
            exclusive
            onChange={(_, v) => v && onPlanChange(v)}
            size="small"
          >
            {plans.map(plan => (
              <Tooltip key={plan.id} title={plan.description} placement="bottom">
                <ToggleButton value={plan.id} sx={{ px: 2 }}>
                  {plan.id}
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">
            {plans.find(p => p.id === activePlanId)?.label}
          </Typography>
        </Box>

        {/* Category sections */}
        {categories.map(cat => {
          const selectedInCat = currentAssignments.filter(
            a => a.status === 'selected' && pitchMap.get(a.pitchId)?.category === cat
          );
          const nextUpInCat = currentAssignments.filter(
            a => a.status === 'next-up' && pitchMap.get(a.pitchId)?.category === cat
          );
          const cutInCat = currentAssignments.filter(
            a => a.status === 'cut' && pitchMap.get(a.pitchId)?.category === cat
          );

          return (
            <Paper key={cat} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {CATEGORY_SHORT[cat] ?? cat}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedInCat.length} selected · target {config.bandwidth[cat]}%
                </Typography>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { py: 0.5, fontSize: '0.72rem', color: 'text.secondary' } }}>
                    <TableCell>Pitch</TableCell>
                    <TableCell align="center" width={60}>Team</TableCell>
                    <TableCell align="center" width={60}>TL</TableCell>
                    <TableCell width={180}>Dev</TableCell>
                    <TableCell width={110} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedInCat.map(a => (
                    <PitchRow
                      key={a.pitchId}
                      assignment={a}
                      pitch={pitchMap.get(a.pitchId)!}
                      devNames={config.devNames}
                      onDevChange={onDevChange}
                      onStatusChange={onStatusChange}
                      highlight="selected"
                    />
                  ))}

                  {nextUpInCat.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0.25, bgcolor: 'action.hover' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          ── planned for up next ──
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {nextUpInCat.map(a => (
                    <PitchRow
                      key={a.pitchId}
                      assignment={a}
                      pitch={pitchMap.get(a.pitchId)!}
                      devNames={config.devNames}
                      onDevChange={onDevChange}
                      onStatusChange={onStatusChange}
                      highlight="next-up"
                    />
                  ))}
                </TableBody>
              </Table>

              {cutInCat.length > 0 && (
                <>
                  <Box
                    sx={{ px: 2, py: 0.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                    onClick={() => setShowCut(p => !p)}
                  >
                    {showCut ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                    <Typography variant="caption" color="text.disabled">
                      {cutInCat.length} cut pitches
                    </Typography>
                  </Box>
                  <Collapse in={showCut}>
                    <Table size="small">
                      <TableBody>
                        {cutInCat.map(a => (
                          <PitchRow
                            key={a.pitchId}
                            assignment={a}
                            pitch={pitchMap.get(a.pitchId)!}
                            devNames={config.devNames}
                            onDevChange={onDevChange}
                            onStatusChange={onStatusChange}
                            highlight="cut"
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </Collapse>
                </>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* ── Drag handle ── */}
      <Box
        onMouseDown={handleDragStart}
        sx={{
          width: 6, flexShrink: 0, cursor: 'col-resize',
          bgcolor: 'divider',
          '&:hover': { bgcolor: 'primary.light' },
          transition: 'background-color 0.15s',
        }}
      />

      {/* ── Right: stats + dev assignments panel ── */}
      <Box sx={{ width: sidebarWidth, flexShrink: 0, overflow: 'auto', p: 2, borderLeft: 0, borderColor: 'divider' }}>

        {/* ── Section: Selected Project Priority ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Selected Project Priority
        </Typography>
        {stats.avgTeamPriority !== null ? (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography variant="caption">Team avg</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: scoreColor(stats.avgTeamPriority) }}>
                {stats.avgTeamPriority.toFixed(2)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={priorityBarPct(stats.avgTeamPriority)}
              sx={{ height: 6, borderRadius: 1, bgcolor: 'action.hover', mb: 0.75,
                '& .MuiLinearProgress-bar': { bgcolor: scoreColor(stats.avgTeamPriority) } }}
            />
            {stats.avgTLPriority !== null && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="caption">TL avg</Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ color: scoreColor(stats.avgTLPriority) }}>
                    {stats.avgTLPriority.toFixed(2)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={priorityBarPct(stats.avgTLPriority)}
                  sx={{ height: 6, borderRadius: 1, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: scoreColor(stats.avgTLPriority) } }}
                />
                {Math.abs(stats.avgTeamPriority - stats.avgTLPriority) > 0.4 && (
                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                    TL and team disagree by {Math.abs(stats.avgTeamPriority - stats.avgTLPriority).toFixed(2)} tiers
                  </Typography>
                )}
              </>
            )}
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
            No projects selected yet
          </Typography>
        )}

        <Divider sx={{ my: 1.25 }} />

        {/* ── Section: Category Mix ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Category Mix
        </Typography>
        {categories.map(cat => {
          const actual = stats.catActualPct[cat] ?? 0;
          const target = config.bandwidth[cat];
          const diff = actual - target;
          const barColor = Math.abs(diff) <= 5 ? 'success.main' : 'warning.main';
          return (
            <Box key={cat} sx={{ mb: 0.875 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">{CATEGORY_SHORT[cat] ?? cat}</Typography>
                <Typography variant="caption" sx={{ color: barColor, fontWeight: 600 }}>
                  {actual}% / {target}%
                </Typography>
              </Box>
              <Box sx={{ position: 'relative' }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(actual, 100)}
                  sx={{
                    height: 7, borderRadius: 1, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: barColor },
                  }}
                />
                {/* Target marker */}
                <Tooltip title={`Target: ${target}%`} placement="top">
                  <Box sx={{
                    position: 'absolute', top: -2, bottom: -2,
                    left: `${target}%`,
                    width: 2, bgcolor: 'text.primary', opacity: 0.45,
                    borderRadius: 1, pointerEvents: 'none',
                  }} />
                </Tooltip>
              </Box>
            </Box>
          );
        })}

        <Divider sx={{ my: 1.25 }} />

        {/* ── Section: Continuation Projects ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Continuation Projects
        </Typography>
        {stats.allContinuations.length === 0 ? (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
            No continuation projects
          </Typography>
        ) : (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              {stats.continuationsDropped.length === 0
                ? <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
                : <WarnIcon fontSize="small" color="warning" sx={{ fontSize: '0.9rem' }} />
              }
              <Typography variant="caption">
                {stats.allContinuations.length - stats.continuationsDropped.length}/{stats.allContinuations.length} continuations planned
              </Typography>
            </Box>
            {stats.continuationsDropped.map(p => (
              <Tooltip key={p.id} title={p.title}>
                <Typography
                  variant="caption"
                  color="warning.main"
                  sx={{ display: 'block', ml: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  ✕ {p.title.replace(/^[^/]+\/\s*/, '').substring(0, 30)}
                </Typography>
              </Tooltip>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 1.25 }} />

        {/* ── Section: Interest Alignment ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Interest Alignment
        </Typography>
        {stats.avgAssignedInterest !== null ? (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography variant="caption">Avg assigned interest</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: scoreColor(stats.avgAssignedInterest) }}>
                {stats.avgAssignedInterest.toFixed(2)} · {interestLabel(stats.avgAssignedInterest)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={priorityBarPct(stats.avgAssignedInterest)}
              sx={{ height: 6, borderRadius: 1, bgcolor: 'action.hover', mb: 0.5,
                '& .MuiLinearProgress-bar': { bgcolor: scoreColor(stats.avgAssignedInterest) } }}
            />
            <Typography variant="caption" color="text.secondary">
              {stats.highInterestCount}/{stats.assignedCount} assignments are tier 1–2
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
            No devs assigned yet
          </Typography>
        )}

        <Divider sx={{ my: 1.25 }} />

        {/* ── Section: Developer Assignments ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Developer Assignments
        </Typography>
        {config.devNames.map(dev => {
          const pitchIds = stats.devProjects[dev] ?? [];
          const dataStatus = devDataStatus[dev];
          const warn = pitchIds.length === 0 || pitchIds.length >= 3 || dataStatus !== 'full';
          return (
            <Box key={dev} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {dataStatus === 'none' && (
                  <Tooltip title="No interest data submitted">
                    <DotIcon sx={{ fontSize: 10, color: 'error.main' }} />
                  </Tooltip>
                )}
                {dataStatus === 'partial' && (
                  <Tooltip title="Partial interest data (some pitches missing)">
                    <DotIcon sx={{ fontSize: 10, color: 'warning.main' }} />
                  </Tooltip>
                )}
                <Typography variant="caption" fontWeight={600} sx={{ color: warn ? 'warning.main' : 'text.primary' }}>
                  {dev.split(' ')[0]}
                </Typography>
                {pitchIds.length === 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                    unassigned
                  </Typography>
                )}
              </Box>
              {pitchIds.map(pid => {
                const p = pitchMap.get(pid);
                if (!p) return null;
                const maxChars = Math.max(20, Math.floor((sidebarWidth - 100) / 7));
                const shortTitle = p.title.replace(/^[^/]+\/\s*/, '');
                return (
                  <Box key={pid} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25 }}>
                    <Tooltip title={p.title}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {shortTitle.substring(0, maxChars)}
                      </Typography>
                    </Tooltip>
                    <InterestChip level={p.devInterest[dev] ?? null} size="small" />
                  </Box>
                );
              })}
            </Box>
          );
        })}

        <Box sx={{ mt: 2 }}>
          <Button variant="contained" fullWidth onClick={onProceed} disabled={stats.total === 0}>
            Finalize &amp; Proceed to Step 2
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Pitch row ─────────────────────────────────────────────────────────────────

interface PitchRowProps {
  assignment: PlanAssignment;
  pitch: AllocationPitch;
  devNames: string[];
  onDevChange: (pitchId: string, dev: string | null) => void;
  onStatusChange: (pitchId: string, newStatus: AssignmentStatus) => void;
  highlight: 'selected' | 'next-up' | 'cut';
}

function PitchRow({ assignment, pitch, devNames, onDevChange, onStatusChange, highlight }: PitchRowProps) {
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLButtonElement | null>(null);

  const bgColor = {
    selected: undefined,
    'next-up': 'rgba(255, 193, 7, 0.06)',
    cut: 'rgba(0,0,0,0)',
  }[highlight];

  const textColor = highlight === 'cut' ? 'text.disabled' : 'text.primary';

  // Sort devs: best interest first; key absent = 5 (no data, goes last)
  const sortedDevs = [...devNames].sort((a, b) => (pitch.devInterest[a] ?? 5) - (pitch.devInterest[b] ?? 5));

  return (
    <TableRow sx={{ bgcolor: bgColor, opacity: highlight === 'cut' ? 0.5 : 1 }}>
      <TableCell sx={{ maxWidth: 200 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Tooltip title={pitch.title} placement="top-start">
            <Typography variant="caption" color={textColor} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pitch.title.replace(/^[^/]+\/\s*/, '')}
            </Typography>
          </Tooltip>
          <Tooltip title="View pitch details">
            <IconButton size="small" sx={{ p: 0.25, flexShrink: 0 }} onClick={e => setDetailsAnchor(e.currentTarget)}>
              <InfoIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
            </IconButton>
          </Tooltip>
        </Box>
        {detailsAnchor && (
          <Suspense fallback={null}>
            <DetailsBubble pitch={pitch} anchorEl={detailsAnchor} onClose={() => setDetailsAnchor(null)} />
          </Suspense>
        )}
      </TableCell>
      <TableCell align="center">
        <Typography variant="caption" sx={{ color: scoreColor(pitch.teamPriorityScore), fontWeight: 600 }}>
          {pitch.teamPriorityScore.toFixed(1)}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Typography variant="caption" sx={{ color: scoreColor(pitch.tlPriorityScore), fontWeight: 600 }}>
          {pitch.tlPriorityScore.toFixed(1)}
        </Typography>
      </TableCell>
      <TableCell>
        {highlight !== 'cut' && (
          <Select
            size="small"
            value={assignment.assignedDev ?? ''}
            onChange={e => onDevChange(pitch.id, e.target.value || null)}
            displayEmpty
            sx={{ fontSize: '0.75rem', minWidth: 140 }}
            renderValue={val => val
              ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{(val as string).split(' ')[0]}</span>
                  <InterestChip level={pitch.devInterest[val as string] ?? null} />
                </Box>
              : <Typography variant="caption" color="text.disabled">Assign dev…</Typography>
            }
          >
            <MenuItem value=""><em>Unassign</em></MenuItem>
            {sortedDevs.map(dev => (
              <MenuItem key={dev} value={dev}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>{dev}</Typography>
                  <InterestChip level={pitch.devInterest[dev] ?? null} />
                </Box>
              </MenuItem>
            ))}
          </Select>
        )}
      </TableCell>
      <TableCell>
        {highlight !== 'cut' ? (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Mark as selected (planned)">
              <Chip label="In" size="small"
                onClick={() => onStatusChange(pitch.id, 'selected')}
                color={highlight === 'selected' ? 'success' : 'default'}
                variant={highlight === 'selected' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 32 }}
              />
            </Tooltip>
            <Tooltip title="Mark as next up (backlog)">
              <Chip label="Next" size="small"
                onClick={() => onStatusChange(pitch.id, 'next-up')}
                color={highlight === 'next-up' ? 'warning' : 'default'}
                variant={highlight === 'next-up' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 36 }}
              />
            </Tooltip>
            <Tooltip title="Cut from this quarter">
              <Chip label="Cut" size="small"
                onClick={() => onStatusChange(pitch.id, 'cut')}
                color="default" variant="outlined"
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 32, color: 'text.disabled' }}
              />
            </Tooltip>
          </Box>
        ) : (
          <Tooltip title="Restore to next up">
            <Chip label="Restore" size="small"
              onClick={() => onStatusChange(pitch.id, 'next-up')}
              variant="outlined"
              sx={{ cursor: 'pointer', fontSize: '0.65rem' }}
            />
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}
