import { lazy, Suspense, useMemo, useState } from 'react';
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

/** Color for a priority/team score. Lower tier = better = green. */
function scoreColor(score: number): string {
  if (score <= 1.8) return '#4caf50'; // tier ~1 — high priority
  if (score <= 2.8) return '#ff9800'; // tier ~2–3 — medium
  return '#f44336';                   // tier ~4 — low priority
}

export default function Step1View({
  pitches, plans, activePlanId, currentAssignments, config,
  onPlanChange, onDevChange, onStatusChange, onProceed,
}: Step1ViewProps) {
  const [showCut, setShowCut] = useState(false);

  const pitchMap = useMemo(() => new Map(pitches.map(p => [p.id, p])), [pitches]);

  const categories = Object.keys(config.bandwidth);

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
    const selected = currentAssignments.filter(a => a.status === 'selected');
    const total = selected.length;

    // Category % adherence
    const catCounts: Record<string, number> = {};
    categories.forEach(c => { catCounts[c] = 0; });
    selected.forEach(a => {
      const p = pitchMap.get(a.pitchId);
      if (p) catCounts[p.category] = (catCounts[p.category] ?? 0) + 1;
    });
    const catActualPct = Object.fromEntries(
      categories.map(c => [c, total > 0 ? Math.round((catCounts[c] / total) * 100) : 0])
    );

    // Dev workload: map dev → list of assigned pitch IDs
    const devProjects: Record<string, string[]> = {};
    config.devNames.forEach(d => { devProjects[d] = []; });
    selected.forEach(a => {
      if (a.assignedDev) devProjects[a.assignedDev].push(a.pitchId);
    });

    // Interest alignment: how many devs have ≥1 tier-1 or tier-2 assignment
    const devsWithHighInterest = config.devNames.filter(dev => {
      return devProjects[dev].some(pid => {
        const tier = pitchMap.get(pid)?.devInterest[dev];
        return tier === 1 || tier === 2;
      });
    }).length;

    return { catActualPct, catCounts, devProjects, devsWithHighInterest, total };
  }, [currentAssignments, pitchMap, categories, config.devNames]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: project list ── */}
      <Box sx={{ flex: 2, overflow: 'auto', p: 2 }}>
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
                  {/* Selected */}
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

                  {/* Next-up divider */}
                  {nextUpInCat.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0.25, bgcolor: 'action.hover' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          ── planned for up next ──
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Next-up */}
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

              {/* Cut pitches (collapsed) */}
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

      {/* ── Right: stats + dev view panel ── */}
      <Box sx={{ width: 300, flexShrink: 0, overflow: 'auto', p: 2, borderLeft: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Stats</Typography>

        {/* Category % adherence */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Category % (actual vs target)
        </Typography>
        {categories.map(cat => {
          const actual = stats.catActualPct[cat] ?? 0;
          const target = config.bandwidth[cat];
          const diff = actual - target;
          return (
            <Box key={cat} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">{CATEGORY_SHORT[cat] ?? cat}</Typography>
                <Typography
                  variant="caption"
                  sx={{ color: Math.abs(diff) <= 5 ? 'success.main' : 'warning.main', fontWeight: 600 }}
                >
                  {actual}% / {target}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(actual, 100)}
                sx={{
                  height: 6, borderRadius: 1,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: Math.abs(diff) <= 5 ? 'success.main' : 'warning.main',
                  },
                }}
              />
            </Box>
          );
        })}

        <Divider sx={{ my: 1.5 }} />

        {/* Interest alignment */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Interest Alignment
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {stats.devsWithHighInterest >= 12
            ? <OkIcon fontSize="small" color="success" />
            : <WarnIcon fontSize="small" color="warning" />
          }
          <Typography variant="body2">
            {stats.devsWithHighInterest}/{config.devNames.length} devs have ≥1 high-interest project
          </Typography>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Dev view: each dev with their assigned pitches + interest chips */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
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
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: warn ? 'warning.main' : 'text.primary' }}
                >
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
                const shortTitle = p.title.replace(/^[^/]+\/\s*/, '').substring(0, 28);
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

  // Sort devs: interested (low tier #) first; missing key treated as 5 (no data)
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
              <Chip
                label="In"
                size="small"
                onClick={() => onStatusChange(pitch.id, 'selected')}
                color={highlight === 'selected' ? 'success' : 'default'}
                variant={highlight === 'selected' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 32 }}
              />
            </Tooltip>
            <Tooltip title="Mark as next up (backlog)">
              <Chip
                label="Next"
                size="small"
                onClick={() => onStatusChange(pitch.id, 'next-up')}
                color={highlight === 'next-up' ? 'warning' : 'default'}
                variant={highlight === 'next-up' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 36 }}
              />
            </Tooltip>
            <Tooltip title="Cut from this quarter">
              <Chip
                label="Cut"
                size="small"
                onClick={() => onStatusChange(pitch.id, 'cut')}
                color="default"
                variant="outlined"
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 32, color: 'text.disabled' }}
              />
            </Tooltip>
          </Box>
        ) : (
          <Tooltip title="Restore to next up">
            <Chip
              label="Restore"
              size="small"
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
