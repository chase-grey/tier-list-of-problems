import { lazy, Suspense, useRef, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Select, MenuItem, Divider, Tooltip,
  LinearProgress, Chip, Collapse, IconButton,
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
}

const CATEGORY_SHORT: Record<string, string> = {
  'Support AI Charting': 'AI Charting',
  'Create and Improve Tools and Framework': 'Tools & Framework',
  'Mobile Feature Parity': 'Mobile Parity',
  'Address Technical Debt': 'Technical Debt',
};

/** Ombre color for priority score. t=0 (score=1, best) → deep blue; t=1 (score=4, worst) → muted slate */
function priorityColor(score: number): string {
  const t = Math.max(0, Math.min(1, (score - 1) / 3));
  const r = Math.round(0x15 + t * (0x78 - 0x15));
  const g = Math.round(0x65 + t * (0x90 - 0x65));
  const b = Math.round(0xc0 + t * (0x9c - 0xc0));
  return `rgb(${r},${g},${b})`;
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

// ─── DevPitchInfo: inline info button for dev assignment list ─────────────────

function DevPitchInfo({ pitch }: { pitch: AllocationPitch }) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <Tooltip title="View pitch details">
        <IconButton size="small" sx={{ p: 0.2, flexShrink: 0 }} onClick={e => setAnchor(e.currentTarget)}>
          <InfoIcon sx={{ fontSize: '0.75rem', color: 'text.disabled' }} />
        </IconButton>
      </Tooltip>
      {anchor && (
        <Suspense fallback={null}>
          <DetailsBubble
            pitch={pitch}
            anchorEl={anchor}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
            transformOrigin={{ vertical: 'center', horizontal: 'left' }}
          />
        </Suspense>
      )}
    </>
  );
}

export default function Step1View({
  pitches, plans, activePlanId, currentAssignments, config,
  onPlanChange, onDevChange, onStatusChange,
}: Step1ViewProps) {
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number; liveWidth: number } | null>(null);

  // Collapse state: per-category per-section
  const [collapseMap, setCollapseMap] = useState<Record<string, Partial<Record<'bucket' | 'planned' | 'nextUp' | 'notNow', boolean>>>>({});
  const isOpen = (cat: string, section: 'bucket' | 'planned' | 'nextUp' | 'notNow') => !(collapseMap[cat]?.[section] ?? false);
  const toggle = (cat: string, section: 'bucket' | 'planned' | 'nextUp' | 'notNow') =>
    setCollapseMap(prev => ({ ...prev, [cat]: { ...prev[cat], [section]: !(prev[cat]?.[section] ?? false) } }));

  const pitchMap = useMemo(() => new Map(pitches.map(p => [p.id, p])), [pitches]);

  const categories = Object.keys(config.bandwidth);

  // ── Draggable sidebar (DOM-direct, no re-render on every mousemove) ──────────
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth, liveWidth: sidebarWidth };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current || !sidebarRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      const w = Math.max(220, Math.min(640, dragRef.current.startWidth + delta));
      sidebarRef.current.style.width = `${w}px`; // direct DOM, no React re-render
      dragRef.current.liveWidth = w;
    };
    const onUp = () => {
      if (dragRef.current) setSidebarWidth(dragRef.current.liveWidth);
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

          // ITEM 5: project count vs target
          const totalSlots = config.devNames.length;
          const targetCount = (config.bandwidth[cat] / 100) * totalSlots;
          const actualPct = stats.total > 0 ? Math.round((selectedInCat.length / stats.total) * 100) : 0;

          return (
            <Paper key={cat} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
              {/* ITEM 6: clickable bucket header */}
              <Box
                sx={{ px: 2, py: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggle(cat, 'bucket')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isOpen(cat, 'bucket') ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                  <Typography variant="subtitle2" fontWeight={700}>
                    {CATEGORY_SHORT[cat] ?? cat}
                  </Typography>
                </Box>
                {/* ITEM 5 + 7: count display with tooltip */}
                <Tooltip title="Actual % of planned projects / Target bandwidth %" placement="top">
                  <Typography variant="caption" color="text.secondary">
                    {selectedInCat.length} / {targetCount.toFixed(1)} projects · {actualPct}% / {config.bandwidth[cat]}%
                  </Typography>
                </Tooltip>
              </Box>

              {/* ITEM 6: collapsible bucket content */}
              <Collapse in={isOpen(cat, 'bucket')}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { py: 0.5, fontSize: '0.72rem', color: 'text.secondary' } }}>
                      <TableCell width={160}>Pitch</TableCell>
                      {/* ITEM 7: tooltips on score column headers */}
                      <TableCell align="center" width={60}>
                        <Tooltip title="Team priority score (avg tier; lower = higher priority)" placement="top">
                          <span>Team</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" width={60}>
                        <Tooltip title="TL priority score (avg tier; lower = higher priority)" placement="top">
                          <span>TL</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell width={180}>Dev</TableCell>
                      <TableCell width={170} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* ITEM 2: "Planned" section header (clickable) */}
                    {selectedInCat.length > 0 && (
                      <TableRow
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => toggle(cat, 'planned')}
                      >
                        <TableCell colSpan={5} sx={{ py: 0.25, bgcolor: 'action.hover' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {isOpen(cat, 'planned') ? <CollapseIcon sx={{ fontSize: '0.8rem' }} /> : <ExpandIcon sx={{ fontSize: '0.8rem' }} />}
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              ── Planned ──
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow sx={{ p: 0, m: 0 }}>
                      <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                        <Collapse in={isOpen(cat, 'planned')}>
                          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                              <col style={{ width: 160 }} />
                              <col style={{ width: 60 }} />
                              <col style={{ width: 60 }} />
                              <col style={{ width: 180 }} />
                              <col style={{ width: 170 }} />
                            </colgroup>
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
                            </TableBody>
                          </Table>
                        </Collapse>
                      </TableCell>
                    </TableRow>

                    {/* ITEM 2: "Up Next" section header (clickable) */}
                    <TableRow
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => toggle(cat, 'nextUp')}
                    >
                      <TableCell colSpan={5} sx={{ py: 0.25, bgcolor: 'action.hover' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isOpen(cat, 'nextUp') ? <CollapseIcon sx={{ fontSize: '0.8rem' }} /> : <ExpandIcon sx={{ fontSize: '0.8rem' }} />}
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            ── Up Next ──
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ p: 0, m: 0 }}>
                      <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                        <Collapse in={isOpen(cat, 'nextUp')}>
                          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                              <col style={{ width: 160 }} />
                              <col style={{ width: 60 }} />
                              <col style={{ width: 60 }} />
                              <col style={{ width: 180 }} />
                              <col style={{ width: 170 }} />
                            </colgroup>
                            <TableBody>
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
                        </Collapse>
                      </TableCell>
                    </TableRow>

                    {/* ITEM 2: "Not Now" section header (always visible, clickable) */}
                    <TableRow
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => toggle(cat, 'notNow')}
                    >
                      <TableCell colSpan={5} sx={{ py: 0.25, bgcolor: 'action.hover' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isOpen(cat, 'notNow') ? <CollapseIcon sx={{ fontSize: '0.8rem' }} /> : <ExpandIcon sx={{ fontSize: '0.8rem' }} />}
                          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                            ── Not Now ──
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ p: 0, m: 0 }}>
                      <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                        <Collapse in={isOpen(cat, 'notNow')}>
                          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                              <col style={{ width: 160 }} />
                              <col style={{ width: 60 }} />
                              <col style={{ width: 60 }} />
                              <col style={{ width: 180 }} />
                              <col style={{ width: 170 }} />
                            </colgroup>
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
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Collapse>
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
      <Box
        ref={sidebarRef}
        sx={{ width: sidebarWidth, flexShrink: 0, overflow: 'auto', p: 2, borderLeft: 0, borderColor: 'divider' }}
      >

        {/* ── Section: Selected Project Priority ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Selected Project Priority
        </Typography>
        {stats.avgTeamPriority !== null ? (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography variant="caption">Team avg</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: priorityColor(stats.avgTeamPriority) }}>
                {stats.avgTeamPriority.toFixed(2)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={priorityBarPct(stats.avgTeamPriority)}
              sx={{ height: 6, borderRadius: 1, bgcolor: 'action.hover', mb: 0.75,
                '& .MuiLinearProgress-bar': { bgcolor: priorityColor(stats.avgTeamPriority) } }}
            />
            {stats.avgTLPriority !== null && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="caption">TL avg</Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ color: priorityColor(stats.avgTLPriority) }}>
                    {stats.avgTLPriority.toFixed(2)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={priorityBarPct(stats.avgTLPriority)}
                  sx={{ height: 6, borderRadius: 1, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: priorityColor(stats.avgTLPriority) } }}
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
            {/* ITEM 8: CSS truncation instead of .substring() */}
            {stats.continuationsDropped.map(p => (
              <Box key={p.id} sx={{ overflow: 'hidden', width: '100%' }}>
                <Tooltip title={p.title}>
                  <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{ display: 'block', ml: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                  >
                    ✕ {p.title.replace(/^[^/]+\/\s*/, '')}
                  </Typography>
                </Tooltip>
              </Box>
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
              <Typography variant="caption" fontWeight={700} sx={{ color: priorityColor(stats.avgAssignedInterest) }}>
                {stats.avgAssignedInterest.toFixed(2)} · {interestLabel(stats.avgAssignedInterest)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={priorityBarPct(stats.avgAssignedInterest)}
              sx={{ height: 6, borderRadius: 1, bgcolor: 'action.hover', mb: 0.5,
                '& .MuiLinearProgress-bar': { bgcolor: priorityColor(stats.avgAssignedInterest) } }}
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
          const workloadWarn = pitchIds.length === 0 || pitchIds.length >= 3;
          const devNameColor = workloadWarn ? 'warning.main' : 'text.primary';
          const workloadTooltip = pitchIds.length === 0
            ? '0 projects assigned'
            : pitchIds.length >= 3
              ? '3+ projects — high workload'
              : '';
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
                {/* ITEM 7: tooltip on dev name when there's a workload warning */}
                <Tooltip title={workloadTooltip} placement="top" disableHoverListener={!workloadWarn}>
                  <Typography variant="caption" fontWeight={600} sx={{ color: devNameColor }}>
                    {dev.split(' ')[0]}
                  </Typography>
                </Tooltip>
                {pitchIds.length === 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                    unassigned
                  </Typography>
                )}
              </Box>
              {pitchIds.map(pid => {
                const p = pitchMap.get(pid);
                if (!p) return null;
                const shortTitle = p.title.replace(/^[^/]+\/\s*/, '');
                return (
                  <Box key={pid} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25 }}>
                    <Tooltip title={p.title}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {shortTitle}
                      </Typography>
                    </Tooltip>
                    {/* ITEM 3: info button in dev assignment list */}
                    <DevPitchInfo pitch={p} />
                    <InterestChip level={p.devInterest[dev] ?? null} noData={!(dev in p.devInterest)} size="small" />
                  </Box>
                );
              })}
            </Box>
          );
        })}
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
    <TableRow sx={{ bgcolor: bgColor, opacity: highlight === 'cut' ? 0.55 : 1 }}>
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
            <DetailsBubble
              pitch={pitch}
              anchorEl={detailsAnchor}
              onClose={() => setDetailsAnchor(null)}
              anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
              transformOrigin={{ vertical: 'center', horizontal: 'left' }}
            />
          </Suspense>
        )}
      </TableCell>
      {/* ITEM 9: priorityColor for score cells */}
      <TableCell align="center">
        <Typography variant="caption" sx={{ color: priorityColor(pitch.teamPriorityScore), fontWeight: 600 }}>
          {pitch.teamPriorityScore.toFixed(1)}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Typography variant="caption" sx={{ color: priorityColor(pitch.tlPriorityScore), fontWeight: 600 }}>
          {pitch.tlPriorityScore.toFixed(1)}
        </Typography>
      </TableCell>
      {/* ITEM 2: show dev dropdown for all statuses (cut pitches just have opacity) */}
      <TableCell>
        <Select
          size="small"
          value={assignment.assignedDev ?? ''}
          onChange={e => onDevChange(pitch.id, e.target.value || null)}
          displayEmpty
          sx={{ fontSize: '0.75rem', minWidth: 140 }}
          renderValue={val => val
            ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{(val as string).split(' ')[0]}</span>
                <InterestChip
                  level={pitch.devInterest[val as string] ?? null}
                  noData={!((val as string) in pitch.devInterest)}
                />
              </Box>
            : <Typography variant="caption" color="text.disabled">Assign dev…</Typography>
          }
        >
          <MenuItem value=""><em>Unassign</em></MenuItem>
          {sortedDevs.map(dev => (
            <MenuItem key={dev} value={dev}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ flex: 1 }}>{dev}</Typography>
                <InterestChip level={pitch.devInterest[dev] ?? null} noData={!(dev in pitch.devInterest)} />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </TableCell>
      {/* ITEM 2: 3-chip row for all statuses (Plan / Up Next / Not Now) */}
      <TableCell>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* ITEM 7: descriptive tooltips on status chips */}
          <Tooltip title="Include in this quarter's projects">
            <Chip label="Plan" size="small"
              onClick={() => onStatusChange(pitch.id, 'selected')}
              color={highlight === 'selected' ? 'primary' : 'default'}
              variant={highlight === 'selected' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 36 }}
            />
          </Tooltip>
          <Tooltip title="Queue as a potential project — will create a record with blank staffing">
            <Chip label="Up Next" size="small"
              onClick={() => onStatusChange(pitch.id, 'next-up')}
              color={highlight === 'next-up' ? 'info' : 'default'}
              variant={highlight === 'next-up' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 44 }}
            />
          </Tooltip>
          <Tooltip title="Cut from this quarter">
            <Chip label="Not Now" size="small"
              onClick={() => onStatusChange(pitch.id, 'cut')}
              color="default"
              variant={highlight === 'cut' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 52, color: highlight === 'cut' ? undefined : 'text.disabled' }}
            />
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
