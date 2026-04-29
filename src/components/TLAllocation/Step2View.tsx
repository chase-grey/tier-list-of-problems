import { lazy, Suspense, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, Divider, Tooltip, IconButton,
  Checkbox, Collapse,
} from '@mui/material';
import {
  Warning as WarnIcon,
  CheckCircle as OkIcon,
  InfoOutlined as InfoIcon,
  Autorenew as AutorenewIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import type {
  AllocationPitch, Phase2Interest, StaffingAssignment, AllocationConfig, InterestLevel,
} from '../../types/allocationTypes';
import InterestChip from './InterestChip';
import InterestDot from './InterestDot';

const DetailsBubble = lazy(() => import('../VotingBoard/PitchCard/DetailsBubble'));

interface Step2ViewProps {
  selectedPitches: AllocationPitch[];
  assignments: StaffingAssignment[];
  phase2Interests: Phase2Interest[];
  config: AllocationConfig;
  devByPitchId: Record<string, string | null>;
  devNames: string[];
  onAssign: (pitchId: string, field: 'devTL' | 'qm' | 'pqa1', value: string | null) => void;
  onFinalize?: () => void;
}

// ─── DevPitchInfo: inline info button for sidebar pitch lists ─────────────────

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

const CATEGORY_SHORT: Record<string, string> = {
  'Support AI Charting': 'AI Charting',
  'Create and Improve Tools and Framework': 'Tools & Framework',
  'Mobile Feature Parity': 'Mobile Parity',
  'Address Technical Debt': 'Technical Debt',
};

export default function Step2View({
  selectedPitches, assignments, phase2Interests, config, onAssign, devByPitchId, devNames,
}: Step2ViewProps) {
  // ── Sidebar resize (Item 5) ──────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(() => Math.round(window.innerWidth / 3));
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1400);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number; liveWidth: number } | null>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth, liveWidth: sidebarWidth };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current || !sidebarRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      const w = Math.max(220, Math.min(960, dragRef.current.startWidth + delta));
      sidebarRef.current.style.width = `${w}px`;
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

  // ── Row navigation (click pitch in sidebar → scroll + flash) ────────────
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const registerRow = useCallback((pitchId: string) => (el: HTMLTableRowElement | null) => {
    if (el) rowRefs.current.set(pitchId, el);
    else rowRefs.current.delete(pitchId);
  }, []);
  const [highlightPitchId, setHighlightPitchId] = useState<string | null>(null);

  const handleFocusPitch = useCallback((pitchId: string) => {
    rowRefs.current.get(pitchId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightPitchId(pitchId);
    setTimeout(() => setHighlightPitchId(null), 1500);
  }, []);

  const assignMap = useMemo(
    () => new Map(assignments.map(a => [a.pitchId, a])),
    [assignments]
  );

  const pitchMap = useMemo(
    () => new Map(selectedPitches.map(p => [p.id, p])),
    [selectedPitches]
  );

  const categories = useMemo(() => Object.keys(config.bandwidth), [config.bandwidth]);

  const pitchesByCategory = useMemo(() => {
    const map: Record<string, AllocationPitch[]> = {};
    selectedPitches.forEach(p => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return map;
  }, [selectedPitches]);

  const [categoryCollapsed, setCategoryCollapsed] = useState<Record<string, boolean>>({});

  const devTLInterests = phase2Interests.filter(p => p.role === 'dev TL');
  const qmInterests = phase2Interests.filter(p => p.role === 'QM');

  const totalPitches = selectedPitches.length;

  // Per-person data completeness
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

  const hasHighInterest = (name: string) => {
    const pi = phase2Interests.find(p => p.personName === name);
    if (!pi) return false;
    return assignments.some(a => {
      const isAssigned = a.devTL === name || a.qm === name;
      if (!isAssigned) return false;
      const tier = pi.interestByPitchId[a.pitchId];
      return tier === 1 || tier === 2;
    });
  };

  const hasHighInterestPqa1 = (name: string) =>
    assignments.some(a => {
      if (a.pqa1 !== name) return false;
      const tier = pitchMap.get(a.pitchId)?.devInterest[name];
      return tier === 1 || tier === 2;
    });

  // ── Sidebar section collapse state ──────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState<Record<string, boolean>>({});
  const toggleSidebarSection = (label: string) =>
    setSidebarCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  // ── UXD checkboxes ──────────────────────────────────────────────────────
  const [includeUXD, setIncludeUXD] = useState<Record<string, boolean>>({});

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: assignment table (category buckets) ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, minWidth: 0 }}>
        {categories.map(cat => {
          const catPitches = pitchesByCategory[cat] ?? [];
          if (catPitches.length === 0) return null;
          const collapsed = categoryCollapsed[cat] ?? false;
          return (
            <Paper key={cat} variant="outlined" sx={{ mb: 2, overflow: 'auto' }}>
              <Box
                sx={{ px: 2, py: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setCategoryCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {collapsed ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
                  <Typography variant="subtitle2" fontWeight={700}>
                    {CATEGORY_SHORT[cat] ?? cat}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">{catPitches.length} projects</Typography>
              </Box>
              <Collapse in={!collapsed}>
                <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 820 }}>
                  <colgroup>
                    <col />{/* pitch: flex */}
                    <col style={{ width: 48 }} />{/* UXD */}
                    <col style={{ width: 72 }} />{/* dev read-only */}
                    <col style={{ width: 155 }} />{/* DevTL */}
                    <col style={{ width: 155 }} />{/* QM */}
                    <col style={{ width: 155 }} />{/* PQA1 Reviewer */}
                  </colgroup>
                  <TableHead>
                    <TableRow sx={{ '& th': { py: 0.5, fontSize: '0.72rem', color: 'text.secondary' } }}>
                      <TableCell>Pitch</TableCell>
                      <TableCell width={48} align="center">
                        <Tooltip title="Include UXD in project kickoff">
                          <span>UXD</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell width={72} align="center">Dev</TableCell>
                      <TableCell width={155} align="center">Dev TL</TableCell>
                      <TableCell width={155} align="center">QM</TableCell>
                      <TableCell width={155} align="center">PQA1 Reviewer</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catPitches.map(pitch => {
                      const a = assignMap.get(pitch.id) ?? { pitchId: pitch.id, devTL: null, qm: null, pqa1: null };
                      return (
                        <Step2Row
                          key={pitch.id}
                          pitch={pitch}
                          assignment={a}
                          devTLInterests={devTLInterests}
                          qmInterests={qmInterests}
                          devTLNames={config.devTLNames}
                          qmNames={config.qmNames}
                          devNames={devNames}
                          onAssign={onAssign}
                          onRef={registerRow(pitch.id)}
                          highlighted={pitch.id === highlightPitchId}
                          devName={devByPitchId[pitch.id] ?? null}
                          includeUXD={includeUXD[pitch.id] ?? false}
                          onToggleUXD={() => setIncludeUXD(prev => ({ ...prev, [pitch.id]: !(prev[pitch.id] ?? false) }))}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </Collapse>
            </Paper>
          );
        })}
      </Box>

      {/* ── Drag handle + sidebar toggle ── */}
      <Box
        onMouseDown={sidebarOpen ? handleDragStart : undefined}
        sx={{
          position: 'relative',
          width: sidebarOpen ? 6 : 20,
          flexShrink: 0,
          cursor: sidebarOpen ? 'col-resize' : 'default',
          bgcolor: 'divider',
          '&:hover': { bgcolor: sidebarOpen ? 'primary.light' : 'action.hover' },
          transition: 'background-color 0.15s, width 0.2s',
        }}
      >
        <Tooltip title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} placement="left">
          <IconButton
            size="small"
            onClick={() => setSidebarOpen(o => !o)}
            sx={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 18, height: 18, p: 0, zIndex: 1,
              bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
              borderRadius: '3px',
              '&:hover': { bgcolor: 'primary.light' },
            }}
          >
            {sidebarOpen
              ? <ChevronRightIcon sx={{ fontSize: '0.8rem' }} />
              : <ChevronLeftIcon sx={{ fontSize: '0.8rem' }} />
            }
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Right: people sidebar (Item 6) ── */}
      {sidebarOpen && (
      <Box
        ref={sidebarRef}
        sx={{ width: sidebarWidth, flexShrink: 0, overflow: 'auto', p: 2 }}
      >
        {[
          { label: 'Dev TLs', names: config.devTLNames, interests: devTLInterests },
          { label: 'QMs', names: config.qmNames, interests: qmInterests },
        ].map(({ label, names, interests }, sectionIdx) => (
          <Box key={label}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSidebarSection(label)}
            >
              {sidebarCollapsed[label] ? <ExpandIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} /> : <CollapseIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />}
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
              </Typography>
            </Box>
            <Collapse in={!sidebarCollapsed[label]}>
            {names.map(name => {
              const assignedPitchIds = assignments
                .filter(a => a.devTL === name || a.qm === name)
                .map(a => a.pitchId)
                .sort((a, b) => {
                  const pA = pitchMap.get(a);
                  const pB = pitchMap.get(b);
                  if (!pA || !pB) return 0;
                  const catA = categories.indexOf(pA.category);
                  const catB = categories.indexOf(pB.category);
                  if (catA !== catB) return catA - catB;
                  return selectedPitches.indexOf(pA) - selectedPitches.indexOf(pB);
                });
              const hasHigh = hasHighInterest(name);
              const dataStatus = personDataStatus[name] ?? 'full';
              const pi = interests.find(p => p.personName === name);

              return (
                <Box key={name} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {hasHigh
                      ? <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
                      : <WarnIcon fontSize="small" color="warning" sx={{ fontSize: '0.9rem' }} />
                    }
                    <Typography variant="caption" fontWeight={600}>{name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {assignedPitchIds.length} projects
                    </Typography>
                  </Box>
                  {assignedPitchIds.map(pid => {
                    const p = pitchMap.get(pid);
                    if (!p) return null;
                    const shortTitle = p.title.replace(/^[^/]+\/\s*/, '');
                    const interestLevel = pi?.interestByPitchId[pid] ?? null;
                    const noData = pi ? !(pid in pi.interestByPitchId) : true;
                    return (
                      <Box key={pid} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25 }}>
                        <Tooltip title={`${p.title} — click to jump`} placement="top-start">
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            onClick={() => handleFocusPitch(pid)}
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                                  '&:hover': { textDecoration: 'underline' } }}
                          >
                            {shortTitle}
                          </Typography>
                        </Tooltip>
                        <DevPitchInfo pitch={p} />
                        {p.continuation && (
                          <Tooltip title="Continuation project">
                            <AutorenewIcon sx={{ fontSize: '0.75rem', color: 'text.disabled', flexShrink: 0 }} />
                          </Tooltip>
                        )}
                        <Box sx={{ flex: 1 }} />
                        {sidebarWidth < 280
                          ? <InterestDot level={interestLevel} noData={noData} />
                          : <InterestChip level={interestLevel} noData={noData} size="small" />
                        }
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
            </Collapse>
            {sectionIdx === 0 && <Divider sx={{ my: 1.25 }} />}
          </Box>
        ))}

        <Divider sx={{ my: 1.25 }} />

        {/* ── PQA1 Reviewers ── */}
        <Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, cursor: 'pointer', userSelect: 'none' }}
            onClick={() => toggleSidebarSection('PQA1 Reviewers')}
          >
            {sidebarCollapsed['PQA1 Reviewers']
              ? <ExpandIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
              : <CollapseIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
            }
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              PQA1 Reviewers
            </Typography>
          </Box>
          <Collapse in={!sidebarCollapsed['PQA1 Reviewers']}>
            {devNames.map(name => {
              const assignedPitchIds = assignments
                .filter(a => a.pqa1 === name)
                .map(a => a.pitchId)
                .sort((a, b) => {
                  const pA = pitchMap.get(a);
                  const pB = pitchMap.get(b);
                  if (!pA || !pB) return 0;
                  const catA = categories.indexOf(pA.category);
                  const catB = categories.indexOf(pB.category);
                  if (catA !== catB) return catA - catB;
                  return selectedPitches.indexOf(pA) - selectedPitches.indexOf(pB);
                });
              const hasHigh = hasHighInterestPqa1(name);

              return (
                <Box key={name} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {hasHigh
                      ? <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
                      : <WarnIcon fontSize="small" color="warning" sx={{ fontSize: '0.9rem' }} />
                    }
                    <Typography variant="caption" fontWeight={600}>{name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {assignedPitchIds.length} projects
                    </Typography>
                  </Box>
                  {assignedPitchIds.map(pid => {
                    const p = pitchMap.get(pid);
                    if (!p) return null;
                    const shortTitle = p.title.replace(/^[^/]+\/\s*/, '');
                    const interestLevel = p.devInterest[name] ?? null;
                    const noData = !(name in p.devInterest);
                    return (
                      <Box key={pid} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25 }}>
                        <Tooltip title={`${p.title} — click to jump`} placement="top-start">
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            onClick={() => handleFocusPitch(pid)}
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                                  '&:hover': { textDecoration: 'underline' } }}
                          >
                            {shortTitle}
                          </Typography>
                        </Tooltip>
                        <DevPitchInfo pitch={p} />
                        {p.continuation && (
                          <Tooltip title="Continuation project">
                            <AutorenewIcon sx={{ fontSize: '0.75rem', color: 'text.disabled', flexShrink: 0 }} />
                          </Tooltip>
                        )}
                        <Box sx={{ flex: 1 }} />
                        {sidebarWidth < 280
                          ? <InterestDot level={interestLevel} noData={noData} />
                          : <InterestChip level={interestLevel} noData={noData} size="small" />
                        }
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Collapse>
        </Box>
      </Box>
      )}

    </Box>
  );
}

// ─── Step 2 table row ──────────────────────────────────────────────────────────

interface Step2RowProps {
  pitch: AllocationPitch;
  assignment: StaffingAssignment;
  devTLInterests: Phase2Interest[];
  qmInterests: Phase2Interest[];
  devTLNames: string[];
  qmNames: string[];
  devNames: string[];
  onAssign: (pitchId: string, field: 'devTL' | 'qm' | 'pqa1', value: string | null) => void;
  onRef?: (el: HTMLTableRowElement | null) => void;
  highlighted?: boolean;
  devName: string | null;
  includeUXD: boolean;
  onToggleUXD: () => void;
}

function Step2Row({
  pitch, assignment, devTLInterests, qmInterests, devTLNames, qmNames, devNames, onAssign, onRef, highlighted,
  devName, includeUXD, onToggleUXD,
}: Step2RowProps) {
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <TableRow
      ref={onRef}
      sx={{
        bgcolor: highlighted ? 'rgba(25, 118, 210, 0.22)' : undefined,
        transition: highlighted ? 'none' : 'background-color 1.2s ease',
      }}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Tooltip title={pitch.title} placement="top-start">
            <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          {pitch.continuation && (
            <Tooltip title="Continuation project">
              <AutorenewIcon sx={{ fontSize: '0.9rem', color: 'text.disabled', flexShrink: 0 }} />
            </Tooltip>
          )}
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
      {/* UXD checkbox */}
      <TableCell align="center" sx={{ p: 0 }}>
        <Checkbox
          size="small"
          checked={includeUXD}
          onChange={onToggleUXD}
          sx={{ p: 0.5 }}
        />
      </TableCell>
      {/* Dev read-only */}
      <TableCell align="center">
        <Typography variant="caption" color="text.secondary">
          {devName ? devName.split(' ')[0] : '—'}
        </Typography>
      </TableCell>
      <TableCell sx={{ px: 0.5, py: 0.25 }}>
        <AssignmentDropdown
          value={assignment.devTL}
          allNames={devTLNames}
          options={devTLInterests}
          pitchId={pitch.id}
          onChange={v => onAssign(pitch.id, 'devTL', v)}
        />
      </TableCell>
      <TableCell sx={{ px: 0.5, py: 0.25 }}>
        <AssignmentDropdown
          value={assignment.qm}
          allNames={qmNames}
          options={qmInterests}
          pitchId={pitch.id}
          onChange={v => onAssign(pitch.id, 'qm', v)}
        />
      </TableCell>
      <TableCell sx={{ px: 0.5, py: 0.25 }}>
        <Pqa1Dropdown
          value={assignment.pqa1 ?? null}
          devNames={devNames}
          devInterest={pitch.devInterest}
          excludeDev={devName}
          onChange={v => onAssign(pitch.id, 'pqa1', v)}
        />
      </TableCell>
    </TableRow>
  );
}

// ─── PQA1 reviewer dropdown ────────────────────────────────────────────────────

interface Pqa1DropdownProps {
  value: string | null;
  devNames: string[];
  devInterest: Record<string, InterestLevel>;
  excludeDev: string | null;
  onChange: (val: string | null) => void;
}

function Pqa1Dropdown({ value, devNames, devInterest, excludeDev, onChange }: Pqa1DropdownProps) {
  const sorted = devNames
    .filter(d => d !== excludeDev)
    .sort((a, b) => {
      const tA = (devInterest[a] ?? 5) as number;
      const tB = (devInterest[b] ?? 5) as number;
      return tA - tB;
    });

  return (
    <Select
      size="small"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      displayEmpty
      sx={{ fontSize: '0.75rem', width: '100%', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
      renderValue={val => {
        if (!val) return <Typography variant="caption" color="text.disabled">Assign…</Typography>;
        const name = val as string;
        const level = (devInterest[name] ?? null) as (1 | 2 | 3 | 4 | null);
        const noData = !(name in devInterest);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {name.split(' ')[0]}
            </Typography>
            <InterestDot level={level} noData={noData} />
          </Box>
        );
      }}
    >
      <MenuItem value=""><em>Unassign</em></MenuItem>
      {sorted.map(dev => (
        <MenuItem key={dev} value={dev}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ flex: 1 }}>{dev}</Typography>
            <InterestChip level={(devInterest[dev] ?? null) as (1 | 2 | 3 | 4 | null)} />
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}

// ─── Assignment dropdown ───────────────────────────────────────────────────────

interface AssignmentDropdownProps {
  value: string | null;
  allNames: string[];
  options: Phase2Interest[];
  pitchId: string;
  onChange: (val: string | null) => void;
}

function AssignmentDropdown({ value, allNames, options, pitchId, onChange }: AssignmentDropdownProps) {
  const interestMap = new Map(options.map(o => [o.personName, o]));

  // Interest submitters first (sorted by level), then remaining names alphabetically
  const withInterest = [...options].sort((a, b) => {
    const tA = a.interestByPitchId[pitchId] ?? 5;
    const tB = b.interestByPitchId[pitchId] ?? 5;
    return (tA as number) - (tB as number);
  });
  const withoutInterest = allNames
    .filter(n => !interestMap.has(n))
    .sort((a, b) => a.localeCompare(b));
  const allEntries = [...withInterest.map(o => o.personName), ...withoutInterest];

  return (
    <Select
      size="small"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      displayEmpty
      sx={{ fontSize: '0.75rem', width: '100%', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
      renderValue={val => {
        if (!val) return <Typography variant="caption" color="text.disabled">Assign…</Typography>;
        const person = interestMap.get(val as string);
        const level = (person?.interestByPitchId[pitchId] ?? null) as (1 | 2 | 3 | 4 | null);
        const noData = !person || !(pitchId in person.interestByPitchId);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {(val as string).split(' ')[0]}
            </Typography>
            <InterestDot level={level} noData={noData} />
          </Box>
        );
      }}
    >
      <MenuItem value=""><em>Unassign</em></MenuItem>
      {allEntries.map(name => {
        const person = interestMap.get(name);
        const level = (person?.interestByPitchId[pitchId] ?? null) as (1 | 2 | 3 | 4 | null);
        return (
          <MenuItem key={name} value={name}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
              <InterestChip level={level} />
            </Box>
          </MenuItem>
        );
      })}
    </Select>
  );
}
