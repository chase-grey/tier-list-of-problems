import { lazy, Suspense, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useExclusiveSelect } from '../../hooks/useExclusiveSelect';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, Divider, Tooltip,
  LinearProgress, Chip, Collapse, IconButton, Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Warning as WarnIcon,
  CheckCircle as OkIcon,
  InfoOutlined as InfoIcon,
  Autorenew as AutorenewIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  SwapHoriz as SwapIcon,
  Star as StarIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  EditOutlined as EditOutlinedIcon,
  Circle as CircleIcon,
  AutoAwesome as StretchIcon,
} from '@mui/icons-material';
import type { AllocationPitch, AssignmentStatus, PlanAssignment, PersonCapacity } from '../../types/allocationTypes';
import { ASSIGNMENT_NONE } from '../../types/models';
import type { AllocationConfig } from '../../types/allocationTypes';
import type { CapacityOverridePayload } from '../../services/allocationApi';
import { getShortName } from '../../data/teamRoster';
import InterestChip from './InterestChip';
import InterestDot from './InterestDot';
import InterestAlignmentPanel, { tierToPct } from './InterestAlignmentPanel';
import CapacityOverrideDialog from '../CapacityOverrideDialog/CapacityOverrideDialog';
import { useSnackbar } from '../../hooks/useSnackbar';

const DetailsBubble = lazy(() => import('../VotingBoard/PitchCard/DetailsBubble'));

interface Step1ViewProps {
  pitches: AllocationPitch[];
  currentAssignments: PlanAssignment[];
  config: AllocationConfig;
  onDevChange: (pitchId: string, dev: string | null) => void;
  onStatusChange: (pitchId: string, newStatus: AssignmentStatus) => void;
  lockedPitchIds: string[];
  lockedPersonNames: string[];
  onTogglePitchLock: (pitchId: string) => void;
  onTogglePersonLock: (name: string) => void;
  /** Voter name of the TL using the screen — recorded as the override author. */
  voterName: string;
  /** Persists a TL capacity override and updates local state to match. */
  onCapacityOverride: (payload: CapacityOverridePayload) => Promise<void>;
  /** Opens the parent's add-pitch dialog. Hides the "Add project" button when omitted. */
  onAdhocAdd?: () => void;
  /** Opens the parent's add-pitch dialog in edit mode for an existing adhoc pitch. */
  onAdhocEdit?: (pitchId: string) => void;
  /** IDs of pitches that were added locally — pencil edit icon is shown for these. */
  adhocPitchIds?: ReadonlySet<string>;
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

function interestLabel(avg: number): string {
  if (avg <= 1.5) return 'Very High';
  if (avg <= 2.5) return 'High';
  if (avg <= 3.5) return 'Medium';
  return 'Low';
}

/** One-decimal format that drops the trailing `.0` so 7.0 reads as "7". */
function fmtIdeal(v: number): string {
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

function workloadCountColor(count: number, ideal: number): string {
  const diff = Math.abs(count - ideal);
  if (diff <= 0.9) return 'text.secondary';
  if (diff <= 1.9) return 'warning.main';
  return 'error.main';
}

// ─── VoteBreakdown: tooltip content showing per-voter priority tiers ──────────

const TIER_LABEL: Record<0 | 1 | 2 | 3 | 4, string> = { 0: 'Unsorted', 1: 'Highest', 2: 'High', 3: 'Medium', 4: 'Low' };

function VoteBreakdown({ votes, label }: { votes: Record<string, 0 | 1 | 2 | 3 | 4 | null>; label: string }) {
  // tier=0 (explicitly unsorted) sorts after tier 4; null sorts last
  const sorted = Object.entries(votes).sort(([, a], [, b]) => (a === 0 ? 5 : a ?? 6) - (b === 0 ? 5 : b ?? 6));
  return (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
        {label}
      </Typography>
      {sorted.map(([name, tier]) => (
        <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
          <Typography variant="caption">{getShortName(name)}</Typography>
          <Typography variant="caption" sx={{ color: (tier != null && tier > 0) ? priorityColor(tier) : 'text.disabled', fontWeight: 700 }}>
            {(tier != null && tier > 0) ? `${TIER_LABEL[tier]} (${tier})` : tier === 0 ? 'Unsorted' : 'Unranked (–)'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
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

// ─── Capacity badge helpers ──────────────────────────────────────────────────

const CAPACITY_LABEL: Record<NonNullable<PersonCapacity['devCapacity']>, string> = {
  'above-avg': 'above-avg capacity',
  'avg':       'avg capacity',
  'fewer':     'fewer projects',
  'none':      'no availability',
};

function capacityDotColor(tier: NonNullable<PersonCapacity['devCapacity']> | undefined): string | null {
  if (tier === 'above-avg') return 'info.main';
  if (tier === 'fewer') return 'warning.main';
  if (tier === 'none') return 'error.main';
  return null;
}

function capacityTooltip(name: string, tier: NonNullable<PersonCapacity['devCapacity']>, comment: string | undefined, source: PersonCapacity['source']): string {
  const short = getShortName(name);
  const tierLabel = CAPACITY_LABEL[tier];
  const suffix = comment ? ` — ${comment}` : '';
  if (source === 'tl-override') return `TL set ${tierLabel} for ${short}.${suffix}`;
  return `${short} indicated ${tierLabel}.${suffix}`;
}

export default function Step1View({
  pitches, currentAssignments, config,
  onDevChange, onStatusChange,
  lockedPitchIds, lockedPersonNames, onTogglePitchLock, onTogglePersonLock,
  voterName, onCapacityOverride, onAdhocAdd, onAdhocEdit, adhocPitchIds,
}: Step1ViewProps) {
  const committedPitchSet = useMemo(
    () => new Set(pitches.filter(p => p.committed).map(p => p.id)),
    [pitches],
  );
  const lockedPitchSet = useMemo(
    () => new Set([...lockedPitchIds, ...committedPitchSet]),
    [lockedPitchIds, committedPitchSet],
  );
  const lockedPersonSet = useMemo(() => new Set(lockedPersonNames), [lockedPersonNames]);
  const { showSnackbar } = useSnackbar();

  // Per-person capacity records keyed by name. Empty object = no overrides yet.
  const capacityByName = useMemo<Record<string, PersonCapacity>>(
    () => config.capacityByName ?? {},
    [config.capacityByName],
  );
  const [capacityDialogTarget, setCapacityDialogTarget] = useState<string | null>(null);
  const [hideLockedPitches, setHideLockedPitches] = useState(false);

  // Reject manual updates that would touch a locked row or move a locked person.
  // The visible lock icons + this guard let users see what's frozen and why.
  const tryDevChange = useCallback((pitchId: string, dev: string | null): boolean => {
    if (committedPitchSet.has(pitchId)) {
      showSnackbar('This is a committed project — it cannot be changed from this view.', 'warning');
      return false;
    }
    if (lockedPitchSet.has(pitchId)) {
      showSnackbar('This row is locked. Unlock it to change.', 'warning');
      return false;
    }
    const a = currentAssignments.find(x => x.pitchId === pitchId);
    if (a?.assignedDev && lockedPersonSet.has(a.assignedDev)) {
      showSnackbar(`${getShortName(a.assignedDev)} is locked. Unlock them to reassign their pitches.`, 'warning');
      return false;
    }
    if (dev && lockedPersonSet.has(dev)) {
      showSnackbar(`${getShortName(dev)} is locked. Unlock them to give them a new pitch.`, 'warning');
      return false;
    }
    onDevChange(pitchId, dev);
    return true;
  }, [committedPitchSet, lockedPitchSet, lockedPersonSet, currentAssignments, onDevChange, showSnackbar]);

  const tryStatusChange = useCallback((pitchId: string, newStatus: AssignmentStatus) => {
    if (committedPitchSet.has(pitchId)) {
      showSnackbar('This is a committed project — it stays planned.', 'warning');
      return;
    }
    if (lockedPitchSet.has(pitchId)) {
      showSnackbar('This row is locked. Unlock it to change.', 'warning');
      return;
    }
    const a = currentAssignments.find(x => x.pitchId === pitchId);
    if (a?.assignedDev && lockedPersonSet.has(a.assignedDev) && newStatus !== 'selected') {
      showSnackbar(`${getShortName(a.assignedDev)} is locked. Unlock them before unassigning.`, 'warning');
      return;
    }
    onStatusChange(pitchId, newStatus);
  }, [committedPitchSet, lockedPitchSet, lockedPersonSet, currentAssignments, onStatusChange, showSnackbar]);
  const [sidebarWidth, setSidebarWidth] = useState(() => Math.round(window.innerWidth / 3));
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1400);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number; liveWidth: number } | null>(null);

  // Collapse state: per-category per-section
  const [collapseMap, setCollapseMap] = useState<Record<string, Partial<Record<'bucket' | 'planned' | 'nextUp' | 'notNow', boolean>>>>({});
  const isOpen = (cat: string, section: 'bucket' | 'planned' | 'nextUp' | 'notNow') => !(collapseMap[cat]?.[section] ?? false);
  const toggle = (cat: string, section: 'bucket' | 'planned' | 'nextUp' | 'notNow') =>
    setCollapseMap(prev => ({ ...prev, [cat]: { ...prev[cat], [section]: !(prev[cat]?.[section] ?? false) } }));

  // ── Row navigation (click continuation → scroll to row) ─────────────────────
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const registerRow = useCallback((pitchId: string) => (el: HTMLTableRowElement | null) => {
    if (el) rowRefs.current.set(pitchId, el);
    else rowRefs.current.delete(pitchId);
  }, []);
  const [highlightPitchId, setHighlightPitchId] = useState<string | null>(null);

  const pitchMap = useMemo(() => new Map(pitches.map(p => [p.id, p])), [pitches]);

  const handleFocusPitch = useCallback((pitchId: string) => {
    const assignment = currentAssignments.find(a => a.pitchId === pitchId);
    const pitch = pitchMap.get(pitchId);
    if (!assignment || !pitch) return;

    const section: 'planned' | 'nextUp' | 'notNow' =
      assignment.status === 'selected' ? 'planned' :
      assignment.status === 'next-up' ? 'nextUp' : 'notNow';

    // Uncollapse the category bucket and relevant section
    setCollapseMap(prev => ({
      ...prev,
      [pitch.category]: { ...prev[pitch.category], bucket: false, [section]: false },
    }));

    // Wait for Collapse animation, then scroll and highlight
    setTimeout(() => {
      rowRefs.current.get(pitchId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightPitchId(pitchId);
      setTimeout(() => setHighlightPitchId(null), 1500);
    }, 320);
  }, [currentAssignments, pitchMap]);

  // ── Person focus (click in workload summary → scroll sidebar + flash) ────────
  const personRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [highlightPersonName, setHighlightPersonName] = useState<string | null>(null);
  const handleFocusPerson = useCallback((name: string) => {
    personRefs.current.get(name)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setHighlightPersonName(name);
    setTimeout(() => setHighlightPersonName(null), 1500);
  }, []);

  const [personCollapsed, setPersonCollapsed] = useState<Record<string, boolean>>({});
  const togglePerson = (name: string) =>
    setPersonCollapsed(prev => ({ ...prev, [name]: !prev[name] }));

  // ── Sidebar drag/drop ───────────────────────────────────────────────────────
  // Direct-DOM updates during drag — no React re-renders on every dragover,
  // and a custom ghost that bypasses the browser's translucent default image.
  const sidebarDragRef = useRef<{ pitchId: string; fromDev: string } | null>(null);
  const sidebarDropElRef = useRef<HTMLElement | null>(null);
  const sidebarSourceElRef = useRef<HTMLElement | null>(null);
  const sidebarGhostRef = useRef<HTMLDivElement | null>(null);
  const sidebarGhostFrameRef = useRef<number | null>(null);

  const handleSidebarMove = useCallback((toDev: string) => {
    const drag = sidebarDragRef.current;
    if (!drag || drag.fromDev === toDev) return;
    tryDevChange(drag.pitchId, toDev);
  }, [tryDevChange]);

  // dragover fires very fast; coalesce ghost moves to one per animation frame.
  const handleDocDragOver = useCallback((ev: DragEvent) => {
    if (!sidebarGhostRef.current || sidebarGhostFrameRef.current != null) return;
    const x = ev.clientX, y = ev.clientY;
    sidebarGhostFrameRef.current = requestAnimationFrame(() => {
      sidebarGhostFrameRef.current = null;
      const g = sidebarGhostRef.current;
      if (g) g.style.transform = `translate3d(${x + 12}px, ${y + 16}px, 0)`;
    });
  }, []);

  const clearDropHighlight = useCallback(() => {
    const el = sidebarDropElRef.current;
    if (!el) return;
    el.style.backgroundColor = '';
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.transition = '';
    sidebarDropElRef.current = null;
  }, []);

  const setDropHighlight = useCallback((el: HTMLElement) => {
    if (sidebarDropElRef.current === el) return;
    clearDropHighlight();
    el.style.transition = 'background-color 0.1s ease, outline 0.1s ease';
    el.style.backgroundColor = 'rgba(25, 118, 210, 0.22)';
    el.style.outline = '1px dashed rgba(25, 118, 210, 0.7)';
    el.style.outlineOffset = '-1px';
    sidebarDropElRef.current = el;
  }, [clearDropHighlight]);

  const cleanupSidebarDrag = useCallback(() => {
    document.removeEventListener('dragover', handleDocDragOver);
    if (sidebarGhostFrameRef.current != null) {
      cancelAnimationFrame(sidebarGhostFrameRef.current);
      sidebarGhostFrameRef.current = null;
    }
    if (sidebarGhostRef.current) {
      sidebarGhostRef.current.remove();
      sidebarGhostRef.current = null;
    }
    if (sidebarSourceElRef.current) {
      sidebarSourceElRef.current.style.opacity = '';
      sidebarSourceElRef.current.style.transition = '';
      sidebarSourceElRef.current = null;
    }
    clearDropHighlight();
    sidebarDragRef.current = null;
  }, [handleDocDragOver, clearDropHighlight]);

  const startSidebarDrag = useCallback((e: React.DragEvent<HTMLElement>, pitchId: string, fromDev: string, label: string) => {
    sidebarDragRef.current = { pitchId, fromDev };
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', pitchId); } catch { /* ignore */ }

    // 1×1 transparent GIF hides the browser's washed-out default drag image.
    const transparent = new Image();
    transparent.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    e.dataTransfer.setDragImage(transparent, 0, 0);

    const ghost = document.createElement('div');
    ghost.textContent = label;
    ghost.style.cssText = `
      position: fixed; top: 0; left: 0;
      transform: translate3d(${e.clientX + 12}px, ${e.clientY + 16}px, 0);
      padding: 8px 14px;
      background: #2c2c2c; color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
      font: 500 13px 'Roboto', 'Helvetica', 'Arial', sans-serif;
      white-space: nowrap; pointer-events: none;
      z-index: 10000; user-select: none;
      max-width: 320px; overflow: hidden; text-overflow: ellipsis;
      will-change: transform;
    `;
    document.body.appendChild(ghost);
    sidebarGhostRef.current = ghost;
    document.addEventListener('dragover', handleDocDragOver);

    const src = e.currentTarget;
    src.style.transition = 'opacity 0.1s';
    src.style.opacity = '0.4';
    sidebarSourceElRef.current = src;
  }, [handleDocDragOver]);

  useEffect(() => () => cleanupSidebarDrag(), [cleanupSidebarDrag]);

  const categories = Object.keys(config.bandwidth);

  const unavailableDevSet = useMemo(
    () => new Set([
      ...(config.unavailableNames ?? []),
      ...(config.unavailableForDevNames ?? []),
    ]),
    [config.unavailableNames, config.unavailableForDevNames],
  );
  const availableDevNames = useMemo(
    () => config.devNames.filter(d => !unavailableDevSet.has(d)),
    [config.devNames, unavailableDevSet],
  );
  const fullyUnavailableSet = useMemo(
    () => new Set(config.unavailableNames ?? []),
    [config.unavailableNames],
  );

  // Split unavailable devs into "fully unavailable" vs "available for PQA1
  // only." We trust capacityByName first (a person with devCapacity='none'
  // but pqa1Capacity='avg' is PQA1-only regardless of which backend list
  // they ended up in) and fall back to unavailableForDevNames vs
  // unavailableNames when capacity tiers are absent. This is robust to old
  // backend versions that lumped dev-only-unavailable people into
  // unavailableNames.
  const { unavailableDevNames, pqa1OnlyAvailableDevNames } = useMemo(() => {
    const cap = config.capacityByName ?? {};
    const pqa1OnlyFromList = new Set(config.unavailableForDevNames ?? []);

    const fullyUnavail: string[] = [];
    const pqa1Only: string[] = [];
    for (const name of config.devNames) {
      if (!unavailableDevSet.has(name)) continue;
      const c = cap[name];
      const devCap = c?.devCapacity;
      const pqa1Cap = c?.pqa1Capacity;
      if (devCap === 'none' && pqa1Cap && pqa1Cap !== 'none') {
        pqa1Only.push(name);
      } else if (pqa1OnlyFromList.has(name) && !(devCap === 'none' && pqa1Cap === 'none')) {
        pqa1Only.push(name);
      } else {
        fullyUnavail.push(name);
      }
    }
    return { unavailableDevNames: fullyUnavail, pqa1OnlyAvailableDevNames: pqa1Only };
  }, [config.devNames, config.unavailableForDevNames, config.capacityByName, unavailableDevSet]);

  // Dev TLs are eligible to be manually assigned as the dev for a pitch — but
  // they're not auto-picked unless they were the previousDev on a continuation
  // (handled in allocationEngine). Filter to the same fully-available bar that
  // gates dev TLs in their own pool.
  const devDropdownNames = useMemo(
    () => [
      ...availableDevNames,
      ...config.devTLNames.filter(n => !fullyUnavailableSet.has(n)),
    ],
    [availableDevNames, config.devTLNames, fullyUnavailableSet],
  );

  // ── Draggable sidebar (DOM-direct, no re-render on every mousemove) ──────────
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth, liveWidth: sidebarWidth };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current || !sidebarRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      const w = Math.max(220, Math.min(960, dragRef.current.startWidth + delta));
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
    const continuationsDropped = allContinuations
      .filter(p => !selectedIds.has(p.id))
      .sort((a, b) => Math.min(a.teamPriorityScore, a.tlPriorityScore) - Math.min(b.teamPriorityScore, b.tlPriorityScore));

    // Continuation dev consistency: planned continuations where the dev changed from last quarter
    const continuationsSelected = allContinuations.filter(p => selectedIds.has(p.id));
    const continuationsDevChanged = continuationsSelected.filter(p => {
      if (!p.previousDev) return false;
      const a = selectedAssignments.find(ca => ca.pitchId === p.id);
      return a?.assignedDev !== null && a?.assignedDev !== p.previousDev;
    });

    // Dev workload (available devs only). The dev dropdown allows picking a
    // Dev TL or QM as the implementing dev for non-standard projects, so
    // a.assignedDev isn't guaranteed to be in availableDevNames — bucket only
    // those that are, to avoid pushing into an undefined slot.
    const devProjects: Record<string, string[]> = {};
    availableDevNames.forEach(d => { devProjects[d] = []; });
    selectedAssignments.forEach(a => {
      if (a.assignedDev && devProjects[a.assignedDev]) devProjects[a.assignedDev].push(a.pitchId);
    });

    // Dev workload balance. Stage 2 always targets 2 projects per dev — that
    // matches the auto-assign DEV_BASELINE in allocationEngine, so the badge
    // colors flag anyone above/below 2 instead of below the running average
    // (which drifts as more pitches get assigned).
    const devCounts = availableDevNames.map(d => (devProjects[d] ?? []).length);
    const devSpread = devCounts.length ? Math.max(...devCounts) - Math.min(...devCounts) : 0;
    const devBalanceScore = Math.max(0, 100 - devSpread * 25);
    const devIdeal = 2;

    // Interest alignment: for selected+assigned pitches, what is the assigned dev's interest?
    const assignedInterestTiers = selectedAssignments
      .filter(a => a.assignedDev && !unavailableDevSet.has(a.assignedDev))
      .map(a => pitchMap.get(a.pitchId)?.devInterest[a.assignedDev!] ?? null)
      .filter((t): t is 1 | 2 | 3 | 4 => t !== null);
    const avgAssignedInterest = assignedInterestTiers.length
      ? assignedInterestTiers.reduce((s, t) => s + t, 0) / assignedInterestTiers.length
      : null;
    const highInterestCount = assignedInterestTiers.filter(t => t <= 2).length;

    const anyDevAssigned = selectedAssignments.some(a => a.assignedDev !== null);

    // Only count pitches where the author is an available dev (eligible for this role)
    const authoredPitchCount = selectedAssignments.filter(a => {
      const p = pitchMap.get(a.pitchId);
      return p?.author != null && availableDevNames.includes(p.author);
    }).length;
    const authorMatchedCount = selectedAssignments.filter(a => {
      const p = pitchMap.get(a.pitchId);
      return p?.author != null && availableDevNames.includes(p.author) && a.assignedDev === p.author;
    }).length;
    // Warning: author is an available dev, has tier-1 interest, but isn't the assigned dev
    const authorWarningItems = selectedAssignments
      .filter(a => {
        const p = pitchMap.get(a.pitchId);
        return p?.author != null &&
          availableDevNames.includes(p.author) &&
          (p.devInterest[p.author] ?? null) === 1 &&
          a.assignedDev !== p.author;
      })
      .map(a => {
        const p = pitchMap.get(a.pitchId)!;
        return { label: p.title.replace(/^[^/]+\/\s*/, ''), pitchId: a.pitchId };
      });

    return {
      avgTeamPriority, avgTLPriority,
      catActualPct,
      allContinuations, continuationsDropped,
      continuationsSelected, continuationsDevChanged,
      devProjects, devBalanceScore, devIdeal,
      avgAssignedInterest, highInterestCount, assignedCount: assignedInterestTiers.length,
      total, anyDevAssigned,
      authoredPitchCount, authorMatchedCount, authorWarningItems,
    };
  }, [currentAssignments, pitchMap, categories, availableDevNames, unavailableDevSet, pitches]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: project list ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, minWidth: 0 }}>
        {/* Filter toolbar */}
        {(() => {
          const lockedCount = currentAssignments.filter(a => lockedPitchSet.has(a.pitchId)).length;
          return lockedCount > 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Chip
                label={hideLockedPitches ? `Showing unlocked only (${lockedCount} hidden)` : `Hide locked (${lockedCount})`}
                size="small"
                onClick={() => setHideLockedPitches(prev => !prev)}
                color={hideLockedPitches ? 'primary' : 'default'}
                variant={hideLockedPitches ? 'filled' : 'outlined'}
              />
            </Box>
          ) : null;
        })()}
        {/* Category sections */}
        {categories.map(cat => {
          const byPriority = (a: PlanAssignment, b: PlanAssignment) => {
            // Committed pitches sort first ("highest priority"), then by team priority score.
            const aCommitted = committedPitchSet.has(a.pitchId);
            const bCommitted = committedPitchSet.has(b.pitchId);
            if (aCommitted !== bCommitted) return aCommitted ? -1 : 1;
            return (pitchMap.get(a.pitchId)?.teamPriorityScore ?? 5) - (pitchMap.get(b.pitchId)?.teamPriorityScore ?? 5);
          };
          const selectedInCat = currentAssignments
            .filter(a => a.status === 'selected' && pitchMap.get(a.pitchId)?.category === cat)
            .filter(a => !hideLockedPitches || !lockedPitchSet.has(a.pitchId))
            .sort(byPriority);
          const nextUpInCat = currentAssignments
            .filter(a => a.status === 'next-up' && pitchMap.get(a.pitchId)?.category === cat)
            .filter(a => !hideLockedPitches || !lockedPitchSet.has(a.pitchId))
            .sort(byPriority);
          const cutInCat = currentAssignments
            .filter(a => a.status === 'cut' && pitchMap.get(a.pitchId)?.category === cat)
            .filter(a => !hideLockedPitches || !lockedPitchSet.has(a.pitchId))
            .sort(byPriority);
          if (hideLockedPitches && selectedInCat.length === 0 && nextUpInCat.length === 0 && cutInCat.length === 0) return null;

          // ITEM 5: project count vs target
          const targetCount = (config.bandwidth[cat] / 100) * stats.total;
          const actualPct = stats.total > 0 ? Math.round((selectedInCat.length / stats.total) * 100) : 0;

          return (
            <Paper key={cat} variant="outlined" sx={{ mb: 2, overflow: 'auto' }}>
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
                {/* Count display — green when within ±5% of bandwidth target */}
                <Tooltip title="Actual % of planned projects / Target bandwidth %" placement="top">
                  <Typography variant="caption" sx={{
                    color: stats.total > 0 && Math.abs(actualPct - config.bandwidth[cat]) <= 5
                      ? 'success.main' : 'text.secondary',
                  }}>
                    {selectedInCat.length} / {fmtIdeal(targetCount)} projects · {actualPct}% / {config.bandwidth[cat]}%
                  </Typography>
                </Tooltip>
              </Box>

              {/* Collapsible bucket content */}
              <Collapse in={isOpen(cat, 'bucket')}>
                <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 620, '& th, & td': { px: 1.25 } }}>
                  <colgroup>
                    <col />{/* pitch: takes remaining space */}
                    <col style={{ width: 56 }} />{/* Team priority */}
                    <col style={{ width: 56 }} />{/* TL priority */}
                    <col style={{ width: 180 }} />{/* Plan / Up Next / Not Now — 8px left pad on the cell + ~170px of chips */}
                    <col style={{ width: 150 }} />{/* Dev */}
                  </colgroup>
                  <TableHead>
                    <TableRow sx={{ '& th': { py: 0.5, fontSize: '0.72rem', color: 'text.secondary' } }}>
                      <TableCell>Pitch</TableCell>
                      <TableCell align="center" width={56}>
                        <Tooltip title="Team priority score — hover a score to see voter breakdown" placement="top">
                          <span>Team</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" width={56}>
                        <Tooltip title="TL priority score — hover a score to see voter breakdown" placement="top">
                          <span>TL</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell width={180} align="center" />
                      <TableCell align="center" width={150}>Dev</TableCell>
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
                          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', '& th, & td': { px: 1.25 } }}>
                            <colgroup>
                              <col />{/* pitch: flex to match outer table */}
                              <col style={{ width: 56 }} />{/* Team */}
                              <col style={{ width: 56 }} />{/* TL */}
                              <col style={{ width: 180 }} />{/* Plan / Up Next / Not Now — 8px left pad on the cell + ~170px of chips */}
                              <col style={{ width: 150 }} />{/* Dev */}
                            </colgroup>
                            <TableBody>
                              {selectedInCat.map(a => (
                                <PitchRow
                                  key={a.pitchId}
                                  assignment={a}
                                  pitch={pitchMap.get(a.pitchId)!}
                                  devNames={devDropdownNames}
                                  devTLNames={config.devTLNames}
                                  onDevChange={tryDevChange}
                                  onStatusChange={tryStatusChange}
                                  lockedPersonSet={lockedPersonSet}
                                  highlight="selected"
                                  onRef={registerRow(a.pitchId)}
                                  highlighted={a.pitchId === highlightPitchId}
                                  locked={lockedPitchSet.has(a.pitchId)}
                                  onToggleLock={() => onTogglePitchLock(a.pitchId)}
                                  committed={committedPitchSet.has(a.pitchId)}
                                  isAdhoc={adhocPitchIds?.has(a.pitchId)}
                                  onEdit={onAdhocEdit ? () => onAdhocEdit(a.pitchId) : undefined}
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
                          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', '& th, & td': { px: 1.25 } }}>
                            <colgroup>
                              <col />{/* pitch: flex to match outer table */}
                              <col style={{ width: 56 }} />{/* Team */}
                              <col style={{ width: 56 }} />{/* TL */}
                              <col style={{ width: 180 }} />{/* Plan / Up Next / Not Now — 8px left pad on the cell + ~170px of chips */}
                              <col style={{ width: 150 }} />{/* Dev */}
                            </colgroup>
                            <TableBody>
                              {nextUpInCat.map(a => (
                                <PitchRow
                                  key={a.pitchId}
                                  assignment={a}
                                  pitch={pitchMap.get(a.pitchId)!}
                                  devNames={devDropdownNames}
                                  devTLNames={config.devTLNames}
                                  onDevChange={tryDevChange}
                                  onStatusChange={tryStatusChange}
                                  lockedPersonSet={lockedPersonSet}
                                  highlight="next-up"
                                  onRef={registerRow(a.pitchId)}
                                  highlighted={a.pitchId === highlightPitchId}
                                  locked={lockedPitchSet.has(a.pitchId)}
                                  onToggleLock={() => onTogglePitchLock(a.pitchId)}
                                  committed={committedPitchSet.has(a.pitchId)}
                                  isAdhoc={adhocPitchIds?.has(a.pitchId)}
                                  onEdit={onAdhocEdit ? () => onAdhocEdit(a.pitchId) : undefined}
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
                          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', '& th, & td': { px: 1.25 } }}>
                            <colgroup>
                              <col />{/* pitch: flex to match outer table */}
                              <col style={{ width: 56 }} />{/* Team */}
                              <col style={{ width: 56 }} />{/* TL */}
                              <col style={{ width: 180 }} />{/* Plan / Up Next / Not Now — 8px left pad on the cell + ~170px of chips */}
                              <col style={{ width: 150 }} />{/* Dev */}
                            </colgroup>
                            <TableBody>
                              {cutInCat.map(a => (
                                <PitchRow
                                  key={a.pitchId}
                                  assignment={a}
                                  pitch={pitchMap.get(a.pitchId)!}
                                  devNames={devDropdownNames}
                                  devTLNames={config.devTLNames}
                                  onDevChange={tryDevChange}
                                  onStatusChange={tryStatusChange}
                                  lockedPersonSet={lockedPersonSet}
                                  highlight="cut"
                                  onRef={registerRow(a.pitchId)}
                                  highlighted={a.pitchId === highlightPitchId}
                                  locked={lockedPitchSet.has(a.pitchId)}
                                  onToggleLock={() => onTogglePitchLock(a.pitchId)}
                                  committed={committedPitchSet.has(a.pitchId)}
                                  isAdhoc={adhocPitchIds?.has(a.pitchId)}
                                  onEdit={onAdhocEdit ? () => onAdhocEdit(a.pitchId) : undefined}
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
        {onAdhocAdd && (
          <Button
            startIcon={<AddIcon />}
            size="small"
            onClick={onAdhocAdd}
            sx={{ mt: 1, mb: 2 }}
          >
            Add project
          </Button>
        )}
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
              width: 18, height: 48, p: 0, zIndex: 1,
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

      {/* ── Right: stats + dev assignments panel ── */}
      {sidebarOpen && (
      <Box
        ref={sidebarRef}
        sx={{ width: sidebarWidth, flexShrink: 0, overflow: 'auto', p: 2, borderLeft: 0, borderColor: 'divider' }}
      >

        {/* ── Section: Selected Project Priority ── */}
        <Tooltip
          title="Average priority tier across all planned projects, based on team and TL votes. Lower is better — tier 1 means the project was ranked highest priority."
          placement="bottom-start"
          slotProps={{ tooltip: { sx: { bgcolor: 'background.paper', color: 'text.primary', boxShadow: 3, border: '1px solid', borderColor: 'divider', maxWidth: 260, fontSize: '0.72rem' } } }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'default' }}>
            Average Project Priority
            <InfoIcon sx={{ fontSize: '0.85rem', opacity: 0.5 }} />
          </Typography>
        </Tooltip>
        {stats.avgTeamPriority !== null ? (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              <Box component="span" sx={{ color: priorityColor(stats.avgTeamPriority), fontWeight: 700 }}>
                Team: {stats.avgTeamPriority.toFixed(1)} ({interestLabel(stats.avgTeamPriority)})
              </Box>
              {stats.avgTLPriority !== null && (
                <>
                  <Box component="span" sx={{ color: 'text.disabled', mx: 0.5 }}>·</Box>
                  <Box component="span" sx={{ color: priorityColor(stats.avgTLPriority), fontWeight: 700 }}>
                    TL: {stats.avgTLPriority.toFixed(1)} ({interestLabel(stats.avgTLPriority)})
                  </Box>
                </>
              )}
            </Typography>
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
            {/* Planned count + dropped list */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              {stats.continuationsDropped.length === 0 && (
                <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
              )}
              <Typography variant="caption">
                {stats.allContinuations.length - stats.continuationsDropped.length}/{stats.allContinuations.length} continuations planned
              </Typography>
            </Box>
            {stats.continuationsDropped.map(p => {
              const highPriorityCut = p.teamPriorityScore <= 2.5 || p.tlPriorityScore <= 2.5;
              const tooltipText = highPriorityCut
                ? `${p.title} — cut despite high priority (team: ${p.teamPriorityScore.toFixed(1)}, TL: ${p.tlPriorityScore.toFixed(1)}) — click to jump`
                : `${p.title} — cut (low priority) — click to jump`;
              return (
                <Box
                  key={p.id}
                  sx={{ overflow: 'hidden', width: '100%', cursor: 'pointer' }}
                  onClick={() => handleFocusPitch(p.id)}
                >
                  <Tooltip title={tooltipText}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block', ml: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                        color: highPriorityCut ? 'warning.main' : 'text.disabled',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      ✕ {p.title.replace(/^[^/]+\/\s*/, '')}
                    </Typography>
                  </Tooltip>
                </Box>
              );
            })}
            {/* Same-dev count + changed list (only shown when any selected continuation has previousDev set) */}
            {stats.continuationsSelected.some(p => p.previousDev) && (<>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, mb: 0.25 }}>
                {stats.continuationsDevChanged.length === 0 && (
                  <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
                )}
                <Typography variant="caption">
                  {stats.continuationsSelected.filter(p => p.previousDev).length - stats.continuationsDevChanged.length}/{stats.continuationsSelected.filter(p => p.previousDev).length} have same dev as before
                </Typography>
              </Box>
              {stats.continuationsDevChanged.map(p => (
                <Tooltip
                  key={p.id}
                  title={`Dev changed: ${p.previousDev} → ${currentAssignments.find(a => a.pitchId === p.id)?.assignedDev ?? 'unassigned'} — click to jump`}
                  placement="left"
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25, cursor: 'pointer', overflow: 'hidden' }}
                    onClick={() => handleFocusPitch(p.id)}
                  >
                    <SwapIcon sx={{ fontSize: '0.85rem', color: 'info.main', flexShrink: 0 }} />
                    <Typography
                      variant="caption"
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            '&:hover': { textDecoration: 'underline' } }}
                    >
                      {p.title.replace(/^[^/]+\/\s*/, '')}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </>)}
          </Box>
        )}

        <Divider sx={{ my: 1.25 }} />

        {/* ── Section: Interest Alignment ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Interest Alignment
        </Typography>
        <InterestAlignmentPanel
          overall={{
            label: 'Avg assigned interest',
            pct: stats.avgAssignedInterest !== null ? tierToPct(stats.avgAssignedInterest) : null,
            tier12: stats.highInterestCount,
            total: stats.assignedCount,
          }}
          authoredPitchCount={stats.authoredPitchCount}
          authorMatchedCount={stats.authorMatchedCount}
          authorWarningItems={stats.authorWarningItems}
          onFocusPitch={handleFocusPitch}
          emptyMessage={stats.anyDevAssigned ? 'No interest data for assigned projects' : 'No devs assigned yet'}
        />

        <Divider sx={{ my: 1.25 }} />

        {/* ── Section: Workload Balance ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Workload Balance
        </Typography>
        {(() => {
          const flagged = availableDevNames.filter(d =>
            workloadCountColor((stats.devProjects[d] ?? []).length, stats.devIdeal) !== 'text.secondary'
          );
          return (
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                {flagged.length === 0
                  ? <Tooltip title="All developers are within the target workload">
                      <span><OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} /></span>
                    </Tooltip>
                  : <Tooltip title={`${flagged.length} ${flagged.length === 1 ? 'developer has' : 'developers have'} significantly more or fewer projects than the ${fmtIdeal(stats.devIdeal)} target`}>
                      <span><WarnIcon fontSize="small" color="warning" sx={{ fontSize: '0.9rem' }} /></span>
                    </Tooltip>
                }
                <Typography variant="caption">
                  {flagged.length === 0
                    ? 'All balanced'
                    : `${flagged.length} ${flagged.length === 1 ? 'dev' : 'devs'} out of target`}
                </Typography>
              </Box>
              {flagged.map(dev => {
                const count = (stats.devProjects[dev] ?? []).length;
                return (
                  <Tooltip key={dev} title="Click to jump to this dev in the list below" placement="left">
                    <Box
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ml: 1.5, mb: 0.2, cursor: 'pointer' }}
                      onClick={() => handleFocusPerson(dev)}
                    >
                      <Typography variant="caption" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                        {getShortName(dev)}
                      </Typography>
                      <Typography variant="caption" fontWeight={600} sx={{ color: workloadCountColor(count, stats.devIdeal) }}>
                        {count}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          );
        })()}

        <Divider sx={{ my: 1.25 }} />

        {/* ── Section: Developer Assignments ── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Developer Assignments
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Target {fmtIdeal(stats.devIdeal)} / dev
          </Typography>
        </Box>
        {availableDevNames.map(dev => {
          const pitchIds = [...(stats.devProjects[dev] ?? [])].sort((a, b) => {
            const pA = pitchMap.get(a);
            const pB = pitchMap.get(b);
            if (!pA || !pB) return 0;
            const catA = categories.indexOf(pA.category);
            const catB = categories.indexOf(pB.category);
            if (catA !== catB) return catA - catB;
            return pA.teamPriorityScore - pB.teamPriorityScore;
          });
          const devColor = workloadCountColor(pitchIds.length, stats.devIdeal);
          const isOff = devColor !== 'text.secondary';
          return (
            <Box
              key={dev}
              ref={(el: HTMLDivElement | null) => { if (el) personRefs.current.set(dev, el); else personRefs.current.delete(dev); }}
              onDragOver={(e) => {
                const drag = sidebarDragRef.current;
                if (!drag || drag.fromDev === dev) return;
                if (lockedPersonSet.has(dev)) return; // can't drop on a locked target
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDropHighlight(e.currentTarget as HTMLElement);
              }}
              onDragLeave={(e) => {
                if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
                if (sidebarDropElRef.current === e.currentTarget) clearDropHighlight();
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleSidebarMove(dev);
                cleanupSidebarDrag();
              }}
              sx={{
                mb: 1, borderRadius: 0.5, p: 0.5,
                bgcolor: highlightPersonName === dev ? 'rgba(25, 118, 210, 0.22)' : undefined,
                transition: highlightPersonName === dev ? 'none' : 'background-color 1.2s ease',
                '&:hover .capacity-edit-on-hover': { opacity: 1 },
              }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => togglePerson(dev)}
              >
                {personCollapsed[dev]
                  ? <ExpandIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', flexShrink: 0 }} />
                  : <CollapseIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', flexShrink: 0 }} />
                }
                <Tooltip
                  title={isOff ? `${pitchIds.length} projects (target ~${fmtIdeal(stats.devIdeal)})` : ''}
                  placement="top"
                  disableHoverListener={!isOff}
                >
                  <Typography variant="caption" fontWeight={600} sx={{ color: isOff ? devColor : 'text.primary' }}>
                    {getShortName(dev)}
                  </Typography>
                </Tooltip>
                <CapacityBadge
                  name={dev}
                  tier={capacityByName[dev]?.devCapacity}
                  comment={capacityByName[dev]?.comment}
                  source={capacityByName[dev]?.source}
                  onClick={() => setCapacityDialogTarget(dev)}
                />
                <Tooltip title={lockedPersonSet.has(dev) ? `Locked — auto-assign won't add or remove ${getShortName(dev)}'s pitches. Click to unlock.` : `Lock ${getShortName(dev)} so auto-assign keeps their pitches as-is`}>
                  <IconButton
                    size="small"
                    sx={{ p: 0.2, flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); onTogglePersonLock(dev); }}
                  >
                    {lockedPersonSet.has(dev)
                      ? <LockIcon sx={{ fontSize: '0.85rem', color: 'primary.main' }} />
                      : <LockOpenIcon sx={{ fontSize: '0.85rem', color: 'text.disabled' }} />
                    }
                  </IconButton>
                </Tooltip>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {pitchIds.length}/{fmtIdeal(stats.devIdeal)}
                </Typography>
              </Box>
              <Collapse in={!personCollapsed[dev]}>
              {pitchIds.map(pid => {
                const p = pitchMap.get(pid);
                if (!p) return null;
                const shortTitle = p.title.replace(/^[^/]+\/\s*/, '');
                const pitchLocked = lockedPitchSet.has(pid);
                const dragBlocked = pitchLocked || lockedPersonSet.has(dev);
                return (
                  <Box
                    key={pid}
                    data-pitch-id={pid}
                    draggable={!dragBlocked}
                    onDragStart={dragBlocked ? undefined : (e) => startSidebarDrag(e, pid, dev, shortTitle)}
                    onDragEnd={dragBlocked ? undefined : cleanupSidebarDrag}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25,
                      cursor: dragBlocked ? 'default' : 'grab', userSelect: 'none',
                      '&:active': { cursor: dragBlocked ? 'default' : 'grabbing' },
                    }}
                  >
                    {pitchLocked && (
                      <Tooltip title="This project is locked">
                        <LockIcon sx={{ fontSize: '0.75rem', color: 'primary.main', flexShrink: 0 }} />
                      </Tooltip>
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      onClick={() => handleFocusPitch(pid)}
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' } }}
                    >
                      {shortTitle}
                    </Typography>
                    <DevPitchInfo pitch={p} />
                    {p.continuation && (() => {
                      const interestLevel = p.devInterest[dev] ?? null;
                      const gold = p.previousDev === dev && (interestLevel === 1 || interestLevel === 2);
                      return (
                        <Tooltip title={gold ? 'Continuation project — was on this team before and has high interest' : 'Continuation project'}>
                          <AutorenewIcon sx={{ fontSize: '0.75rem', color: gold ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
                        </Tooltip>
                      );
                    })()}
                    {p.author === dev && (
                      <Tooltip title="Wrote this pitch">
                        <StarIcon sx={{ fontSize: '0.75rem', color: (p.devInterest[dev] ?? null) === 1 ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
                      </Tooltip>
                    )}
                    <Box sx={{ flex: 1 }} />
                    {sidebarWidth < 280
                      ? <InterestDot level={p.devInterest[dev] ?? null} noData={!(dev in p.devInterest)} />
                      : <InterestChip level={p.devInterest[dev] ?? null} noData={!(dev in p.devInterest)} size="small" />
                    }
                  </Box>
                );
              })}
              </Collapse>
            </Box>
          );
        })}

        {pqa1OnlyAvailableDevNames.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Available for PQA1 only
            </Typography>
            {pqa1OnlyAvailableDevNames.map(dev => {
              const comment = capacityByName[dev]?.comment;
              const source = capacityByName[dev]?.source;
              const short = getShortName(dev);
              const setter = source === 'tl-override' ? 'TL set' : `${short} indicated`;
              const tip = `${setter}: no capacity for additional dev work — available for PQA1 only${comment ? ` — ${comment}` : ''}.`;
              return (
                <Box
                  key={dev}
                  sx={{ mb: 0.5, px: 0.5, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 0.5,
                        '&:hover .capacity-edit-on-hover': { opacity: 1 } }}
                >
                  <Typography variant="caption" color="text.disabled" fontWeight={600}>
                    {short}
                  </Typography>
                  <Tooltip title={tip}>
                    <IconButton
                      size="small"
                      sx={{ p: 0.2, flexShrink: 0 }}
                      onClick={(e) => { e.stopPropagation(); setCapacityDialogTarget(dev); }}
                    >
                      <CircleIcon sx={{ fontSize: '0.6rem', color: 'warning.main' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </>
        )}

        {unavailableDevNames.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Not Available
            </Typography>
            {unavailableDevNames.map(dev => (
              <Box
                key={dev}
                sx={{ mb: 0.5, px: 0.5, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 0.5,
                      '&:hover .capacity-edit-on-hover': { opacity: 1 } }}
              >
                <Typography variant="caption" color="text.disabled" fontWeight={600}>
                  {getShortName(dev)}
                </Typography>
                <CapacityBadge
                  name={dev}
                  tier={capacityByName[dev]?.devCapacity}
                  comment={capacityByName[dev]?.comment}
                  source={capacityByName[dev]?.source}
                  onClick={() => setCapacityDialogTarget(dev)}
                />
              </Box>
            ))}
          </>
        )}
      </Box>
      )}

      {/* TL capacity override dialog — shared by dot click and hover-Edit click. */}
      <CapacityOverrideDialog
        open={capacityDialogTarget !== null}
        onClose={() => setCapacityDialogTarget(null)}
        personName={capacityDialogTarget ?? ''}
        personRole="dev"
        current={capacityDialogTarget ? capacityByName[capacityDialogTarget] : undefined}
        setBy={voterName}
        onSubmit={onCapacityOverride}
      />
    </Box>
  );
}

// ─── CapacityBadge: dot + hover-Edit affordance for the capacity tier ────────

interface CapacityBadgeProps {
  name: string;
  tier: PersonCapacity['devCapacity'];
  comment: string | undefined;
  source: PersonCapacity['source'];
  onClick: () => void;
}

function CapacityBadge({ name, tier, comment, source, onClick }: CapacityBadgeProps) {
  // No tier or 'avg' → show only a hover-revealed Edit affordance.
  const showDot = tier && tier !== 'avg';

  if (!showDot) {
    return (
      <Tooltip title={`Set capacity for ${getShortName(name)}`}>
        <IconButton
          size="small"
          className="capacity-edit-on-hover"
          sx={{ p: 0.2, flexShrink: 0, opacity: 0, transition: 'opacity 0.15s' }}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <EditOutlinedIcon sx={{ fontSize: '0.85rem', color: 'text.disabled' }} />
        </IconButton>
      </Tooltip>
    );
  }

  const color = capacityDotColor(tier) ?? 'text.disabled';
  return (
    <Tooltip title={capacityTooltip(name, tier, comment, source)}>
      <IconButton
        size="small"
        sx={{ p: 0.2, flexShrink: 0 }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <CircleIcon sx={{ fontSize: '0.6rem', color }} />
      </IconButton>
    </Tooltip>
  );
}

// ─── Pitch row ─────────────────────────────────────────────────────────────────

interface PitchRowProps {
  assignment: PlanAssignment;
  pitch: AllocationPitch;
  devNames: string[];
  devTLNames: string[];
  onDevChange: (pitchId: string, dev: string | null) => void;
  onStatusChange: (pitchId: string, newStatus: AssignmentStatus) => void;
  highlight: 'selected' | 'next-up' | 'cut';
  onRef?: (el: HTMLTableRowElement | null) => void;
  highlighted?: boolean;
  locked: boolean;
  onToggleLock: () => void;
  lockedPersonSet: ReadonlySet<string>;
  committed?: boolean;
  /** When true, renders a pencil edit icon next to the title; click invokes onEdit. */
  isAdhoc?: boolean;
  onEdit?: () => void;
}

function PitchRow({ assignment, pitch, devNames, devTLNames, onDevChange, onStatusChange, highlight, onRef, highlighted, locked, onToggleLock, lockedPersonSet, committed, isAdhoc, onEdit }: PitchRowProps) {
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLButtonElement | null>(null);
  const devSelectExclusive = useExclusiveSelect(`${pitch.id}-dev`);

  const textColor = highlight === 'cut' ? 'text.disabled' : 'text.primary';

  // Sort devs: best interest first; key absent = 5 (no data, goes last).
  // Dev TLs go below a separator at the bottom of the list. Adhoc pitches have
  // no interest data, so fall back to alphabetical order.
  const devTLSet = new Set(devTLNames);
  const sortedAll = isAdhoc
    ? [...devNames].sort((a, b) => a.localeCompare(b))
    : [...devNames].sort((a, b) => (pitch.devInterest[a] ?? 5) - (pitch.devInterest[b] ?? 5));
  const sortedDevs = sortedAll.filter(d => !devTLSet.has(d));
  const sortedTLDevs = sortedAll.filter(d => devTLSet.has(d));

  // Warn when a planned continuation project's assigned dev differs from last quarter's dev
  const devChanged = pitch.continuation && pitch.previousDev &&
    assignment.status === 'selected' &&
    assignment.assignedDev !== null &&
    assignment.assignedDev !== pitch.previousDev;

  // Warn when the pitch author is a dev, has tier-1 interest, but isn't assigned — only for planned pitches
  const authorWarning = highlight === 'selected' &&
    pitch.author &&
    devNames.includes(pitch.author) &&
    (pitch.devInterest[pitch.author] ?? null) === 1 &&
    assignment.assignedDev !== pitch.author;

  return (
    <TableRow
      ref={onRef}
      sx={{
        opacity: highlight === 'cut' ? 0.55 : 1,
        bgcolor: highlighted ? 'rgba(25, 118, 210, 0.22)' : undefined,
        transition: highlighted ? 'none' : 'background-color 1.2s ease',
      }}
    >
      <TableCell sx={{ maxWidth: 200 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {committed ? (
            <Tooltip title="Committed — already allocated for next quarter; cannot be changed from this view">
              <Chip
                label="COMMITTED"
                size="small"
                color="success"
                sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, mr: 0.25, '& .MuiChip-label': { px: 0.75 } }}
              />
            </Tooltip>
          ) : (
            <Tooltip title={locked ? 'Locked — auto-assign will not change this row. Click to unlock.' : 'Lock this row so auto-assign keeps it as-is'}>
              <IconButton size="small" sx={{ p: 0.25, flexShrink: 0 }} onClick={onToggleLock}>
                {locked
                  ? <LockIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />
                  : <LockOpenIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
                }
              </IconButton>
            </Tooltip>
          )}
          {assignment.stretch && (
            <Tooltip title="Stretch goal — only completed if there's spare capacity">
              <StretchIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0, mr: 0.25 }} />
            </Tooltip>
          )}
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
          {isAdhoc && onEdit && (
            <Tooltip title="Edit this locally-added project">
              <IconButton size="small" sx={{ p: 0.25, flexShrink: 0 }} onClick={onEdit}>
                <EditOutlinedIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
              </IconButton>
            </Tooltip>
          )}
          {pitch.continuation && (
            <Tooltip title="Continuation project">
              <AutorenewIcon sx={{ fontSize: '0.9rem', color: 'text.disabled', flexShrink: 0 }} />
            </Tooltip>
          )}
          {pitch.prjId && (
            <Tooltip title={`Linked PRJ ${pitch.prjId}`}>
              <Box
                component="span"
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  px: 0.5,
                  ml: 0.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0.5,
                  color: 'text.secondary',
                  flexShrink: 0,
                }}
              >
                PRJ {pitch.prjId}
              </Box>
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
      <TableCell align="right">
        <Tooltip
          title={<VoteBreakdown votes={pitch.teamVotes} label="Team votes" />}
          placement="left"
          slotProps={{ tooltip: { sx: { bgcolor: 'background.paper', color: 'text.primary', boxShadow: 3, border: '1px solid', borderColor: 'divider', p: 0 } } }}
        >
          <Typography variant="caption" sx={{ color: priorityColor(pitch.teamPriorityScore), fontWeight: 600, cursor: 'default' }}>
            {pitch.teamPriorityScore.toFixed(1)}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="right">
        <Tooltip
          title={<VoteBreakdown votes={pitch.tlVotes} label="TL votes" />}
          placement="left"
          slotProps={{ tooltip: { sx: { bgcolor: 'background.paper', color: 'text.primary', boxShadow: 3, border: '1px solid', borderColor: 'divider', p: 0 } } }}
        >
          <Typography variant="caption" sx={{ color: priorityColor(pitch.tlPriorityScore), fontWeight: 600, cursor: 'default' }}>
            {pitch.tlPriorityScore.toFixed(1)}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ pl: 1, pr: 0 }}>
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
          {/* ITEM 7: descriptive tooltips on status chips.
              flexShrink: 0 + whiteSpace: nowrap on each chip protects their
              full label from being clipped when the row narrows — without
              these, MUI's flex defaults let the chips compress and "Not Now"
              would truncate to "Not N…" on smaller screens.
              The cell overrides the table-wide px:1.25 with pl:1 pr:0 so
              the chip group has a small breath of left padding (slightly
              more gap from the TL number) and hugs the right edge so the
              Plan→UXD/Dev gap stays balanced. */}
          <Tooltip title={committed ? 'Committed projects are always planned' : "Include in this quarter's projects"}>
            <Chip label="Plan" size="small"
              onClick={committed ? undefined : () => onStatusChange(pitch.id, 'selected')}
              color={highlight === 'selected' ? 'primary' : 'default'}
              variant={highlight === 'selected' ? 'filled' : 'outlined'}
              sx={{ cursor: committed ? 'default' : 'pointer', fontSize: '0.65rem', minWidth: 36, opacity: committed ? 0.85 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}
            />
          </Tooltip>
          {!committed && (
            <Tooltip title="Queue as a potential project — will create a record with blank staffing">
              <Chip label="Up Next" size="small"
                onClick={() => onStatusChange(pitch.id, 'next-up')}
                color={highlight === 'next-up' ? 'info' : 'default'}
                variant={highlight === 'next-up' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 44, flexShrink: 0, whiteSpace: 'nowrap' }}
              />
            </Tooltip>
          )}
          {!committed && (
            <Tooltip title="Cut from this quarter">
              <Chip label="Not Now" size="small"
                onClick={() => onStatusChange(pitch.id, 'cut')}
                color="default"
                variant={highlight === 'cut' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 52, color: highlight === 'cut' ? undefined : 'text.disabled', flexShrink: 0, whiteSpace: 'nowrap' }}
              />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ px: 0.5, py: 0.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {highlight === 'selected' && (
            <Select
              {...devSelectExclusive}
              size="small"
              disabled={committed}
              value={assignment.assignedDev ?? ''}
              onChange={e => onDevChange(pitch.id, e.target.value || null)}
              displayEmpty
              sx={{ fontSize: '0.75rem', width: '100%', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
              renderValue={val => {
                if (!val) return <Typography variant="caption" color="text.disabled">Assign dev…</Typography>;
                if (val === ASSIGNMENT_NONE) {
                  return <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None</Typography>;
                }
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {getShortName(val as string)}
                    </Typography>
                    {lockedPersonSet.has(val as string) && (
                      <Tooltip title={`${getShortName(val as string)} is locked`}>
                        <LockIcon sx={{ fontSize: '0.85rem', color: 'primary.main', flexShrink: 0 }} />
                      </Tooltip>
                    )}
                    {!isAdhoc && (
                      <InterestDot
                        level={pitch.devInterest[val as string] ?? null}
                        noData={!((val as string) in pitch.devInterest)}
                      />
                    )}
                  </Box>
                );
              }}
            >
              <MenuItem value=""><Typography variant="body2"><em>Unassign</em></Typography></MenuItem>
              <MenuItem value={ASSIGNMENT_NONE}>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None — no dev needed</Typography>
              </MenuItem>
              {[...sortedDevs, ...sortedTLDevs].map((dev, idx) => {
                const isTLSection = idx === sortedDevs.length;
                const interestLevel = pitch.devInterest[dev] ?? null;
                const continuationGold = pitch.previousDev === dev && (interestLevel === 1 || interestLevel === 2);
                const authorGold = interestLevel === 1;
                return [
                  isTLSection && sortedDevs.length > 0 ? <Divider key="tl-divider" /> : null,
                  <MenuItem key={dev} value={dev} sx={{ px: 2, py: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
                      <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dev}</Typography>
                      {dev === pitch.previousDev && (
                        <Tooltip title={continuationGold ? 'Was on this project last quarter and has high interest' : 'Was on this project last quarter'} placement="left">
                          <AutorenewIcon sx={{ fontSize: '0.85rem', color: continuationGold ? 'success.main' : 'text.secondary', flexShrink: 0 }} />
                        </Tooltip>
                      )}
                      {dev === pitch.author && (
                        <Tooltip title={authorGold ? 'Wrote this pitch with highest interest' : 'Wrote this pitch'} placement="left">
                          <StarIcon sx={{ fontSize: '0.85rem', color: authorGold ? 'success.main' : 'text.secondary', flexShrink: 0 }} />
                        </Tooltip>
                      )}
                      {!isAdhoc && <InterestChip level={interestLevel} noData={!(dev in pitch.devInterest)} />}
                    </Box>
                  </MenuItem>,
                ];
              })}
            </Select>
          )}
          {authorWarning && (
            <Tooltip title={`${pitch.author} wrote this pitch with highest interest but isn't assigned`} placement="top">
              <WarnIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0 }} />
            </Tooltip>
          )}
          {devChanged && (
            <Tooltip title={`Previous dev: ${pitch.previousDev} — team changed from last quarter`} placement="top">
              <WarnIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}
