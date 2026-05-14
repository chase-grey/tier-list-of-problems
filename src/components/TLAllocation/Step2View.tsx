import { lazy, Suspense, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useExclusiveSelect } from '../../hooks/useExclusiveSelect';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, Divider, Tooltip, IconButton,
  Checkbox, Collapse, LinearProgress, Button, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  Warning as WarnIcon,
  CheckCircle as OkIcon,
  InfoOutlined as InfoIcon,
  Autorenew as AutorenewIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
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
import type {
  AllocationPitch, Phase2Interest, StaffingAssignment, AllocationConfig, InterestLevel, PersonCapacity,
} from '../../types/allocationTypes';
import { ASSIGNMENT_NONE } from '../../types/models';
import type { CapacityOverridePayload } from '../../services/allocationApi';
import { getShortName } from '../../data/teamRoster';
import InterestChip from './InterestChip';
import InterestDot from './InterestDot';
import InterestAlignmentPanel from './InterestAlignmentPanel';
import CapacityOverrideDialog from '../CapacityOverrideDialog/CapacityOverrideDialog';
import { useSnackbar } from '../../hooks/useSnackbar';

const DetailsBubble = lazy(() => import('../VotingBoard/PitchCard/DetailsBubble'));

interface Step2ViewProps {
  selectedPitches: AllocationPitch[];
  /** Pitches with status='next-up' — rendered as a secondary sub-section under
   *  each category so a TL can promote one mid-staffing. Workload stats / the
   *  right sidebar continue to scope to selectedPitches only. */
  nextUpPitches?: AllocationPitch[];
  /** Pitches with status='cut' — rendered as a tertiary, default-collapsed
   *  sub-section under each category so the TL can review what was
   *  deprioritized without flipping back to Stage 2. */
  cutPitches?: AllocationPitch[];
  assignments: StaffingAssignment[];
  phase2Interests: Phase2Interest[];
  config: AllocationConfig;
  devByPitchId: Record<string, string | null>;
  devNames: string[];
  onAssign: (pitchId: string, field: 'devTL' | 'qm' | 'pqa1', value: string | null) => void;
  /** Move a pitch between selected / next-up / cut. Wired to the row's pencil
   *  edit dialog. Omitted when status changes shouldn't be allowed. */
  onStatusChange?: (pitchId: string, newStatus: 'selected' | 'next-up' | 'cut') => void;
  onFinalize?: () => void;
  includeUXD: Record<string, boolean>;
  onToggleUXD: (pitchId: string) => void;
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
  /** Opens the parent's edit dialog for any pitch (adhoc and voting-imported).
   *  The pencil edit icon is shown on every row when this is provided. */
  onAdhocEdit?: (pitchId: string) => void;
  /** IDs of pitches that were added locally. */
  adhocPitchIds?: ReadonlySet<string>;
  /** IDs of pitches flagged as stretch goals — rendered with a flag icon
   *  in the sidebar and sorted beneath non-stretch projects within each
   *  person's primary-role list. */
  stretchPitchIds?: ReadonlySet<string>;
}

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

interface CapacityBadgeProps {
  name: string;
  tier: PersonCapacity['devCapacity'];
  comment: string | undefined;
  source: PersonCapacity['source'];
  onClick: () => void;
}

/** Colored dot + hover-Edit affordance for a person's capacity tier. */
function CapacityBadge({ name, tier, comment, source, onClick }: CapacityBadgeProps) {
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

/** Ombre color for priority score. t=0 (score=1, best) → deep blue;
 *  t=1 (score=4, worst) → muted slate. Mirrors Step1View's priorityColor so
 *  the Team/TL priority cells render with consistent shading across stages. */
function priorityColor(score: number): string {
  const t = Math.max(0, Math.min(1, (score - 1) / 3));
  const r = Math.round(0x15 + t * (0x78 - 0x15));
  const g = Math.round(0x65 + t * (0x90 - 0x65));
  const b = Math.round(0xc0 + t * (0x9c - 0xc0));
  return `rgb(${r},${g},${b})`;
}

const TIER_LABEL: Record<0 | 1 | 2 | 3 | 4, string> = { 0: 'Unsorted', 1: 'Highest', 2: 'High', 3: 'Medium', 4: 'Low' };

/** Coarse label for an average priority tier — matches Step1View so the
 *  Average Project Priority sidebar reads the same across stages. */
function interestLabel(avg: number): string {
  if (avg <= 1.5) return 'Very High';
  if (avg <= 2.5) return 'High';
  if (avg <= 3.5) return 'Medium';
  return 'Low';
}

/** Hover content for the priority score cells — per-voter tier breakdown. */
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


function balanceScoreColor(score: number): string {
  if (score >= 100) return 'success.main';
  if (score >= 75) return 'text.primary';
  if (score >= 50) return 'warning.main';
  return 'error.main';
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

export default function Step2View({
  selectedPitches, nextUpPitches, cutPitches, assignments, phase2Interests, config, onAssign, onStatusChange, devByPitchId, devNames,
  includeUXD, onToggleUXD,
  lockedPitchIds, lockedPersonNames, onTogglePitchLock, onTogglePersonLock,
  voterName, onCapacityOverride, onAdhocAdd, onAdhocEdit, adhocPitchIds, stretchPitchIds,
}: Step2ViewProps) {
  const stretchSet = stretchPitchIds ?? new Set<string>();
  const committedPitchSet = useMemo(
    () => new Set(selectedPitches.filter(p => p.committed).map(p => p.id)),
    [selectedPitches],
  );
  const lockedPitchSet = useMemo(
    () => new Set([...lockedPitchIds, ...committedPitchSet]),
    [lockedPitchIds, committedPitchSet],
  );
  const lockedPersonSet = useMemo(() => new Set(lockedPersonNames), [lockedPersonNames]);
  const { showSnackbar } = useSnackbar();

  const capacityByName = useMemo<Record<string, PersonCapacity>>(
    () => config.capacityByName ?? {},
    [config.capacityByName],
  );
  const devNameSet = useMemo(() => new Set(devNames), [devNames]);
  const [capacityDialogTarget, setCapacityDialogTarget] = useState<string | null>(null);

  const assignmentByPitch = useMemo(
    () => new Map(assignments.map(a => [a.pitchId, a])),
    [assignments]
  );

  // Reject manual updates that would touch a locked row or move a locked person.
  const tryAssign = useCallback((pitchId: string, field: 'devTL' | 'qm' | 'pqa1', value: string | null): boolean => {
    if (committedPitchSet.has(pitchId)) {
      showSnackbar('This is a committed project — it cannot be changed from this view.', 'warning');
      return false;
    }
    if (lockedPitchSet.has(pitchId)) {
      showSnackbar('This row is locked. Unlock it to change.', 'warning');
      return false;
    }
    const a = assignmentByPitch.get(pitchId);
    const current = a ? a[field] ?? null : null;
    if (current && lockedPersonSet.has(current)) {
      showSnackbar(`${getShortName(current)} is locked. Unlock them to reassign their pitches.`, 'warning');
      return false;
    }
    if (value && lockedPersonSet.has(value)) {
      showSnackbar(`${getShortName(value)} is locked. Unlock them to give them a new pitch.`, 'warning');
      return false;
    }
    onAssign(pitchId, field, value);
    return true;
  }, [committedPitchSet, lockedPitchSet, lockedPersonSet, assignmentByPitch, onAssign, showSnackbar]);

  const tryToggleUXD = useCallback((pitchId: string) => {
    if (committedPitchSet.has(pitchId)) {
      showSnackbar('This is a committed project — it cannot be changed from this view.', 'warning');
      return;
    }
    if (lockedPitchSet.has(pitchId)) {
      showSnackbar('This row is locked. Unlock it to change.', 'warning');
      return;
    }
    onToggleUXD(pitchId);
  }, [committedPitchSet, lockedPitchSet, onToggleUXD, showSnackbar]);

  // Status changes from Stage 4. Reuses the same guards as the assign /
  // toggleUXD paths: committed rows stay Planned, locked rows refuse edits.
  const tryStatusChange = useCallback((pitchId: string, newStatus: 'selected' | 'next-up' | 'cut') => {
    if (!onStatusChange) return;
    if (committedPitchSet.has(pitchId)) {
      showSnackbar('This is a committed project — it stays planned.', 'warning');
      return;
    }
    if (lockedPitchSet.has(pitchId)) {
      showSnackbar('This row is locked. Unlock it to change.', 'warning');
      return;
    }
    onStatusChange(pitchId, newStatus);
  }, [committedPitchSet, lockedPitchSet, onStatusChange, showSnackbar]);
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

  // ── Person focus (click in workload stats → scroll sidebar + flash) ──────
  const personRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [highlightPersonName, setHighlightPersonName] = useState<string | null>(null);
  const handleFocusPerson = useCallback((name: string) => {
    const sectionLabel = config.devTLNames.includes(name) ? 'Dev TLs'
      : config.qmNames.includes(name) ? 'QMs'
      : 'PQA1 Reviewers';
    setSidebarCollapsed(prev => ({ ...prev, [sectionLabel]: false }));
    setTimeout(() => {
      personRefs.current.get(name)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setHighlightPersonName(name);
      setTimeout(() => setHighlightPersonName(null), 1500);
    }, 320);
  }, [config.devTLNames, config.qmNames]);

  // ── Sidebar drag/drop ───────────────────────────────────────────────────────
  // Direct-DOM updates during drag — no React re-renders on every dragover,
  // and a custom ghost that bypasses the browser's translucent default image.
  //
  // SidebarDragRole = the three roles that can be reassigned in Stage 4 by
  // drag-and-drop. `dev` is read-only here (dev assignment happens in Stage 2)
  // so it's outside this union; it surfaces in sidebar entries as a non-draggable
  // "As Dev" sub-section so a TL can see who has dev work in addition to TL/QM/
  // PQA1 work.
  type SidebarDragRole = 'devTL' | 'qm' | 'pqa1';
  type SidebarRoleView = SidebarDragRole | 'dev';
  const sidebarDragRef = useRef<{ pitchId: string; role: SidebarDragRole; fromPerson: string } | null>(null);
  const sidebarDropElRef = useRef<HTMLElement | null>(null);
  const sidebarSourceElRef = useRef<HTMLElement | null>(null);
  const sidebarGhostRef = useRef<HTMLDivElement | null>(null);
  const sidebarGhostFrameRef = useRef<number | null>(null);

  const handleSidebarMove = useCallback((role: SidebarDragRole, toPerson: string) => {
    const drag = sidebarDragRef.current;
    if (!drag || drag.role !== role || drag.fromPerson === toPerson) return;
    tryAssign(drag.pitchId, role, toPerson);
  }, [tryAssign]);

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

  const startSidebarDrag = useCallback((e: React.DragEvent<HTMLElement>, pitchId: string, role: SidebarDragRole, fromPerson: string, label: string) => {
    sidebarDragRef.current = { pitchId, role, fromPerson };
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', pitchId); } catch { /* ignore */ }

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

  const sidebarPitchDragProps = (pid: string, role: SidebarDragRole, person: string, label: string) => {
    const blocked = lockedPitchSet.has(pid) || lockedPersonSet.has(person);
    return {
      draggable: !blocked,
      'data-pitch-id': pid,
      onDragStart: blocked ? undefined : (e: React.DragEvent<HTMLElement>) => startSidebarDrag(e, pid, role, person, label),
      onDragEnd: blocked ? undefined : cleanupSidebarDrag,
    };
  };

  const sidebarPitchDragStyle = (pid: string, person: string) => {
    const blocked = lockedPitchSet.has(pid) || lockedPersonSet.has(person);
    return {
      cursor: blocked ? 'default' : 'grab', userSelect: 'none' as const,
      '&:active': { cursor: blocked ? 'default' : 'grabbing' },
    };
  };

  const sidebarPersonDropProps = (role: SidebarDragRole, person: string) => ({
    onDragOver: (e: React.DragEvent) => {
      const drag = sidebarDragRef.current;
      if (!drag || drag.role !== role || drag.fromPerson === person) return;
      if (lockedPersonSet.has(person)) return; // can't drop on a locked target
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropHighlight(e.currentTarget as HTMLElement);
    },
    onDragLeave: (e: React.DragEvent) => {
      if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
      if (sidebarDropElRef.current === e.currentTarget) clearDropHighlight();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      handleSidebarMove(role, person);
      cleanupSidebarDrag();
    },
  });

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
    // Committed projects sort first ("highest priority"), then by team priority score.
    Object.values(map).forEach(arr => arr.sort((a, b) => {
      if (!!a.committed !== !!b.committed) return a.committed ? -1 : 1;
      return a.teamPriorityScore - b.teamPriorityScore;
    }));
    return map;
  }, [selectedPitches]);

  // Up Next pitches grouped + sorted by team priority. Rendered as a secondary
  // sub-section under each category so the TL can see what's queued and
  // promote one mid-staffing if a planned project falls through.
  const nextUpByCategory = useMemo(() => {
    const map: Record<string, AllocationPitch[]> = {};
    (nextUpPitches ?? []).forEach(p => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.teamPriorityScore - b.teamPriorityScore));
    return map;
  }, [nextUpPitches]);

  // Not Now (cut) pitches grouped + sorted by team priority. Rendered as a
  // tertiary, default-collapsed sub-section so deprioritized work is
  // accessible but doesn't compete for visual space with the active plan.
  const cutByCategory = useMemo(() => {
    const map: Record<string, AllocationPitch[]> = {};
    (cutPitches ?? []).forEach(p => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.teamPriorityScore - b.teamPriorityScore));
    return map;
  }, [cutPitches]);

  // Per-category sub-section collapse state. Only Planned defaults open —
  // Up Next and Not Now are reference info that the TL can expand when
  // needed; staffing focus stays on the active plan.
  const [planSubOpen, setPlanSubOpen] = useState<Record<string, boolean>>({});
  const [nextUpSubOpen, setNextUpSubOpen] = useState<Record<string, boolean>>({});
  const [cutSubOpen, setCutSubOpen] = useState<Record<string, boolean>>({});
  const togglePlanSub = (cat: string) => setPlanSubOpen(p => ({ ...p, [cat]: !(p[cat] ?? true) }));
  const toggleNextUpSub = (cat: string) => setNextUpSubOpen(p => ({ ...p, [cat]: !(p[cat] ?? false) }));
  const toggleCutSub = (cat: string) => setCutSubOpen(p => ({ ...p, [cat]: !(p[cat] ?? false) }));
  const isPlanOpen = (cat: string) => planSubOpen[cat] ?? true;
  const isNextUpOpen = (cat: string) => nextUpSubOpen[cat] ?? false;
  const isCutOpen = (cat: string) => cutSubOpen[cat] ?? false;

  const [categoryCollapsed, setCategoryCollapsed] = useState<Record<string, boolean>>({});
  const [hideLockedPitches, setHideLockedPitches] = useState(false);

  const unavailableSet = useMemo(() => new Set(config.unavailableNames ?? []), [config.unavailableNames]);
  const unavailablePqa1Set = useMemo(
    () => new Set([
      ...(config.unavailableNames ?? []),
      ...(config.unavailableForPqa1Names ?? []),
    ]),
    [config.unavailableNames, config.unavailableForPqa1Names],
  );
  const availableDevTLNames = useMemo(() => config.devTLNames.filter(n => !unavailableSet.has(n)), [config.devTLNames, unavailableSet]);
  const unavailableDevTLNames = useMemo(() => config.devTLNames.filter(n => unavailableSet.has(n)), [config.devTLNames, unavailableSet]);
  const availableQmNames = useMemo(() => config.qmNames.filter(n => !unavailableSet.has(n)), [config.qmNames, unavailableSet]);
  const unavailableQmNames = useMemo(() => config.qmNames.filter(n => unavailableSet.has(n)), [config.qmNames, unavailableSet]);
  const availableDevNames = useMemo(() => devNames.filter(n => !unavailablePqa1Set.has(n)), [devNames, unavailablePqa1Set]);
  // PQA1 pool sidebar splits into three buckets: available, "Available for
  // Dev only" (pqa1Capacity='none' but devCapacity isn't), and fully
  // unavailable. Symmetric with Step1View's dev-pool split.
  const devOnlyAvailablePqa1Names = useMemo(() => {
    const pqa1OnlyUnavail = new Set(config.unavailableForPqa1Names ?? []);
    return devNames.filter(n => pqa1OnlyUnavail.has(n));
  }, [devNames, config.unavailableForPqa1Names]);
  const unavailableDevNamesForPqa1 = useMemo(() => devNames.filter(n => unavailableSet.has(n)), [devNames, unavailableSet]);

  // PQA1 reviewer dropdown options: regular available devs plus available
  // dev TLs (manually assignable; auto-assign skips them unless they were
  // previousPQA1 on a continuation — see allocationEngine.autoAssignPqa1).
  // Workload stats below stay scoped to regular devs only.
  const pqa1DropdownNames = useMemo(
    () => [...availableDevNames, ...availableDevTLNames],
    [availableDevNames, availableDevTLNames],
  );

  const devTLInterests = phase2Interests.filter(p => p.role === 'dev TL');
  const qmInterests = phase2Interests.filter(p => p.role === 'QM');

  // ── Sidebar stats ──────────────────────────────────────────────────────
  const step2Stats = useMemo(() => {
    // ── Selected priority + category mix (parity with Stage 2 sidebar) ──
    const selectedTotal = selectedPitches.length;
    const avgTeamPriority = selectedTotal
      ? selectedPitches.reduce((s, p) => s + p.teamPriorityScore, 0) / selectedTotal
      : null;
    const avgTLPriority = selectedTotal
      ? selectedPitches.reduce((s, p) => s + p.tlPriorityScore, 0) / selectedTotal
      : null;
    const categoryList = Object.keys(config.bandwidth);
    const catCounts: Record<string, number> = {};
    categoryList.forEach(c => { catCounts[c] = 0; });
    selectedPitches.forEach(p => { catCounts[p.category] = (catCounts[p.category] ?? 0) + 1; });
    const catActualPct: Record<string, number> = Object.fromEntries(
      categoryList.map(c => [c, selectedTotal > 0 ? Math.round((catCounts[c] / selectedTotal) * 100) : 0])
    );

    // ── Continuation rollup across all statuses (Stage 2 parity) ────────
    // selectedPitches is "planned"; nextUpPitches + cutPitches cover what
    // was deprioritized. The dropped list helps the TL see which prior-
    // quarter teams won't be continuing.
    const otherPitches = [...(nextUpPitches ?? []), ...(cutPitches ?? [])];
    const allContinuations = [
      ...selectedPitches.filter(p => p.continuation),
      ...otherPitches.filter(p => p.continuation),
    ];
    const continuationsSelected = selectedPitches.filter(p => p.continuation);
    const continuationsDropped = otherPitches
      .filter(p => p.continuation)
      .sort((a, b) => Math.min(a.teamPriorityScore, a.tlPriorityScore) - Math.min(b.teamPriorityScore, b.tlPriorityScore));
    const continuationsDevChanged = continuationsSelected.filter(p => {
      if (!p.previousDev) return false;
      const dev = devByPitchId[p.id] ?? null;
      return dev !== null && dev !== p.previousDev;
    });

    // ── Team Consistency (continuation projects) ────────────────────────
    const continuations = selectedPitches.filter(p => p.continuation);
    const consistencyItems = continuations.map(p => {
      const a = assignMap.get(p.id);
      const changes: string[] = [];
      if (p.previousTL) {
        const cur = a?.devTL ?? null;
        if (cur !== p.previousTL)
          changes.push(`TL: ${getShortName(p.previousTL)} → ${cur ? getShortName(cur) : 'unassigned'}`);
      }
      if (p.previousQM) {
        const cur = a?.qm ?? null;
        if (cur !== p.previousQM)
          changes.push(`QM: ${getShortName(p.previousQM)} → ${cur ? getShortName(cur) : 'unassigned'}`);
      }
      if (p.previousPQA1) {
        const cur = a?.pqa1 ?? null;
        if (cur !== p.previousPQA1)
          changes.push(`PQA1: ${getShortName(p.previousPQA1)} → ${cur ? getShortName(cur) : 'unassigned'}`);
      }
      return { pitch: p, changes, sameTeam: changes.length === 0 };
    });
    const sameTeamCount = consistencyItems.filter(c => c.sameTeam).length;
    const changedItems = consistencyItems.filter(c => !c.sameTeam);

    // ── Interest Alignment ──────────────────────────────────────────────
    const tlInterestMap = new Map(
      phase2Interests.filter(pi => pi.role === 'dev TL').map(pi => [pi.personName, pi])
    );
    const qmInterestMap = new Map(
      phase2Interests.filter(pi => pi.role === 'QM').map(pi => [pi.personName, pi])
    );

    type AlignEntry = { score: number; tier: number };
    const tlEntries: AlignEntry[] = [];
    const qmEntries: AlignEntry[] = [];
    const pqa1Entries: AlignEntry[] = [];

    const unavailSet = new Set(config.unavailableNames ?? []);
    for (const a of assignments) {
      const pitch = pitchMap.get(a.pitchId);
      if (!pitch) continue;
      if (a.devTL && !unavailSet.has(a.devTL)) {
        const tier = tlInterestMap.get(a.devTL)?.interestByPitchId[a.pitchId] ?? null;
        if (tier !== null) tlEntries.push({ tier, score: (5 - tier) / 4 });
      }
      if (a.qm && !unavailSet.has(a.qm)) {
        const tier = qmInterestMap.get(a.qm)?.interestByPitchId[a.pitchId] ?? null;
        if (tier !== null) qmEntries.push({ tier, score: (5 - tier) / 4 });
      }
      if (a.pqa1 && !unavailSet.has(a.pqa1)) {
        const tier = pitch.devInterest[a.pqa1] ?? null;
        if (tier !== null) pqa1Entries.push({ tier, score: (5 - tier) / 4 });
      }
    }

    const avgPct = (entries: AlignEntry[]) =>
      entries.length ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length * 100) : null;
    const tier12Count = (entries: AlignEntry[]) => entries.filter(e => e.tier <= 2).length;
    const allEntries = [...tlEntries, ...qmEntries, ...pqa1Entries];

    // ── Workload Balance ────────────────────────────────────────────────
    // Per-person workload score = sum across pitches: dev role contributes 2
    // (heavier work), assigned-in-this-role-but-not-as-dev contributes 1.
    // Applies to every section — a QM or dev who's also picked up the dev
    // slot on a project carries that heavier weight in their own sidebar
    // section, not just devTLs'. When a person is *both* dev and the primary
    // role on the same pitch, the dev weight wins (still one project's
    // worth of work, just the heavier kind) — we don't add 1+2=3.
    const countFor = (names: string[], field: 'devTL' | 'qm' | 'pqa1') =>
      names.map(n => {
        let count = 0;
        for (const a of assignments) {
          const isDev = (devByPitchId[a.pitchId] ?? null) === n;
          const isPrimary = a[field] === n;
          if (isDev) count += 2;
          else if (isPrimary) count += 1;
        }
        return { name: n, count };
      });

    const tlCounts = countFor(config.devTLNames.filter(n => !unavailSet.has(n)), 'devTL');
    const qmCounts = countFor(config.qmNames.filter(n => !unavailSet.has(n)), 'qm');
    const pqa1Counts = countFor(devNames.filter(n => !unavailSet.has(n)), 'pqa1');

    const idealFor = (counts: { count: number }[]) =>
      counts.length ? counts.reduce((s, c) => s + c.count, 0) / counts.length : 0;

    const spreadScore = (counts: { count: number }[]) => {
      if (counts.length === 0) return 100;
      const vals = counts.map(c => c.count);
      return Math.max(0, 100 - (Math.max(...vals) - Math.min(...vals)) * 25);
    };

    const tlIdeal = idealFor(tlCounts);
    const qmIdeal = idealFor(qmCounts);
    const pqa1Ideal = idealFor(pqa1Counts);
    const tlBalance = spreadScore(tlCounts);
    const qmBalance = spreadScore(qmCounts);
    const pqa1Balance = spreadScore(pqa1Counts);

    // ── Authorship Alignment ────────────────────────────────────────────
    type AuthorshipItem = { pitch: AllocationPitch; assignedAs: string; interest: InterestLevel | null };
    const authorshipItems: AuthorshipItem[] = [];
    for (const a of assignments) {
      const pitch = pitchMap.get(a.pitchId);
      if (!pitch?.author) continue;
      const author = pitch.author;
      const assignedDev = devByPitchId[a.pitchId] ?? null;
      if (assignedDev === author)
        authorshipItems.push({ pitch, assignedAs: 'Dev', interest: (pitch.devInterest[author] ?? null) as InterestLevel | null });
      if (a.devTL === author)
        authorshipItems.push({ pitch, assignedAs: 'Dev TL', interest: (tlInterestMap.get(author)?.interestByPitchId[a.pitchId] ?? null) as InterestLevel | null });
      if (a.qm === author)
        authorshipItems.push({ pitch, assignedAs: 'QM', interest: (qmInterestMap.get(author)?.interestByPitchId[a.pitchId] ?? null) as InterestLevel | null });
      if (a.pqa1 === author)
        authorshipItems.push({ pitch, assignedAs: 'PQA1', interest: (pitch.devInterest[author] ?? null) as InterestLevel | null });
    }
    // Only count pitches where the author is an available team member eligible for at least one role
    const teamMemberSet = new Set(
      [...devNames, ...config.devTLNames, ...config.qmNames].filter(n => !unavailSet.has(n))
    );
    const authoredPitchCount = assignments.filter(a => {
      const p = pitchMap.get(a.pitchId);
      return p?.author != null && teamMemberSet.has(p.author);
    }).length;
    const authorMatchedCount = new Set(
      authorshipItems.filter(item => teamMemberSet.has(item.pitch.author!)).map(item => item.pitch.id)
    ).size;
    // Warning: author is on team, has tier-1 interest in any role, but not assigned to the project in any role
    const authorWarningItems: { label: string; pitchId: string }[] = [];
    for (const a of assignments) {
      const pitch = pitchMap.get(a.pitchId);
      if (!pitch?.author) continue;
      const author = pitch.author;
      if (!teamMemberSet.has(author)) continue;
      const dev = devByPitchId[a.pitchId] ?? null;
      if (dev === author || a.devTL === author || a.qm === author || a.pqa1 === author) continue;
      const tlTier = (tlInterestMap.get(author)?.interestByPitchId[a.pitchId] ?? null) as number | null;
      const qmTier = (qmInterestMap.get(author)?.interestByPitchId[a.pitchId] ?? null) as number | null;
      const devTier = (pitch.devInterest[author] ?? null) as number | null;
      const isDevTL = config.devTLNames.includes(author);
      // Only warn when the relevant role is actually assigned (not empty) — dev TLs are
      // excluded from the PQA1 check since their relevant warning is the devTL role.
      const tlWarn   = tlTier === 1 && a.devTL !== null;
      const qmWarn   = qmTier === 1 && a.qm   !== null;
      const pqa1Warn = devTier === 1 && !isDevTL && a.pqa1 !== null;
      if (tlWarn || qmWarn || pqa1Warn) {
        authorWarningItems.push({ label: pitch.title.replace(/^[^/]+\/\s*/, ''), pitchId: a.pitchId });
      }
    }

    // Per-person PQA1 target adjusted for capacity tier (fewer → ideal-1, above-avg → ideal+1).
    const pqa1IdealByName: Record<string, number> = {};
    pqa1Counts.forEach(({ name }) => {
      const tier = config.capacityByName?.[name]?.pqa1Capacity;
      if (tier === 'above-avg') pqa1IdealByName[name] = pqa1Ideal + 1;
      else if (tier === 'fewer') pqa1IdealByName[name] = Math.max(0, pqa1Ideal - 1);
      else if (tier === 'none') pqa1IdealByName[name] = 0;
      else pqa1IdealByName[name] = pqa1Ideal;
    });

    return {
      avgTeamPriority, avgTLPriority, catActualPct,
      allContinuations, continuationsSelected, continuationsDropped, continuationsDevChanged,
      continuations, sameTeamCount, changedItems,
      tlScore: avgPct(tlEntries), qmScore: avgPct(qmEntries), pqa1Score: avgPct(pqa1Entries),
      totalScore: avgPct(allEntries),
      tlTier12: tier12Count(tlEntries), tlTotal: tlEntries.length,
      qmTier12: tier12Count(qmEntries), qmTotal: qmEntries.length,
      pqa1Tier12: tier12Count(pqa1Entries), pqa1Total: pqa1Entries.length,
      allTier12: tier12Count(allEntries), allTotal: allEntries.length,
      tlCounts, qmCounts, pqa1Counts,
      tlIdeal, qmIdeal, pqa1Ideal, pqa1IdealByName,
      tlBalance, qmBalance, pqa1Balance,
      overallBalance: Math.round((tlBalance + qmBalance + pqa1Balance) / 3),
      authorshipItems, authoredPitchCount, authorMatchedCount, authorWarningItems,
    };
  }, [selectedPitches, nextUpPitches, cutPitches, assignments, assignMap, pitchMap, phase2Interests, config, devNames, devByPitchId]);

  // Which devs submitted ANY Phase 1 interest data (used to distinguish "no data" from "skipped this pitch")
  const devHasAnyData = useMemo(() => {
    const set = new Set<string>();
    selectedPitches.forEach(p => { Object.keys(p.devInterest).forEach(d => set.add(d)); });
    return set;
  }, [selectedPitches]);

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

  const [personCollapsed, setPersonCollapsed] = useState<Record<string, boolean>>({});
  const togglePerson = (name: string) =>
    setPersonCollapsed(prev => ({ ...prev, [name]: !prev[name] }));


  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: assignment table (category buckets) ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, minWidth: 0 }}>
        {/* Filter toolbar */}
        {(() => {
          const lockedCount = selectedPitches.filter(p => lockedPitchSet.has(p.id)).length;
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
        {categories.map(cat => {
          const allCatPitches = pitchesByCategory[cat] ?? [];
          const catPitches = hideLockedPitches
            ? allCatPitches.filter(p => !lockedPitchSet.has(p.id))
            : allCatPitches;
          const nextUpCatPitches = (nextUpByCategory[cat] ?? []).filter(
            p => !hideLockedPitches || !lockedPitchSet.has(p.id)
          );
          const cutCatPitches = (cutByCategory[cat] ?? []).filter(
            p => !hideLockedPitches || !lockedPitchSet.has(p.id)
          );
          if (catPitches.length === 0 && nextUpCatPitches.length === 0 && cutCatPitches.length === 0) return null;
          const collapsed = categoryCollapsed[cat] ?? false;
          const renderRow = (pitch: AllocationPitch, opts?: { dimmed?: boolean; status?: 'selected' | 'next-up' | 'cut' }) => {
            const a = assignMap.get(pitch.id) ?? { pitchId: pitch.id, devTL: null, qm: null, pqa1: null };
            return (
              <Step2Row
                key={pitch.id}
                pitch={pitch}
                assignment={a}
                devTLInterests={devTLInterests}
                qmInterests={qmInterests}
                devTLNames={availableDevTLNames}
                qmNames={availableQmNames}
                devNames={pqa1DropdownNames}
                devHasAnyData={devHasAnyData}
                onAssign={tryAssign}
                onRef={registerRow(pitch.id)}
                highlighted={pitch.id === highlightPitchId}
                devName={devByPitchId[pitch.id] ?? null}
                includeUXD={includeUXD[pitch.id] ?? false}
                onToggleUXD={() => tryToggleUXD(pitch.id)}
                locked={lockedPitchSet.has(pitch.id)}
                onToggleLock={() => onTogglePitchLock(pitch.id)}
                lockedPersonSet={lockedPersonSet}
                committed={committedPitchSet.has(pitch.id)}
                isAdhoc={adhocPitchIds?.has(pitch.id)}
                isStretch={stretchSet.has(pitch.id)}
                onEdit={onAdhocEdit ? () => onAdhocEdit(pitch.id) : undefined}
                dimmed={opts?.dimmed}
                status={opts?.status}
                onStatusChange={onStatusChange ? (newStatus) => tryStatusChange(pitch.id, newStatus) : undefined}
              />
            );
          };
          const subHeader = (label: string, count: number, open: boolean, onToggle: () => void, accent: 'planned' | 'nextUp' | 'cut') => (
            <TableRow sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={onToggle}>
              <TableCell colSpan={9} sx={{ py: 0.25, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {open ? <CollapseIcon sx={{ fontSize: '0.8rem' }} /> : <ExpandIcon sx={{ fontSize: '0.8rem' }} />}
                  <Typography variant="caption" color={accent === 'planned' ? 'text.secondary' : 'text.disabled'} sx={{ fontStyle: 'italic' }}>
                    ── {label} ({count}) ──
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          );
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
                <Typography variant="caption" color="text.secondary">
                  {catPitches.length} planned
                  {nextUpCatPitches.length > 0 ? ` · ${nextUpCatPitches.length} up next` : ''}
                  {cutCatPitches.length > 0 ? ` · ${cutCatPitches.length} not now` : ''}
                </Typography>
              </Box>
              <Collapse in={!collapsed}>
                <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 1020 }}>
                  <colgroup>
                    <col />{/* pitch: flex */}
                    <col style={{ width: 56 }} />{/* Team priority */}
                    <col style={{ width: 56 }} />{/* TL priority */}
                    <col style={{ width: 210 }} />{/* status chips — sized so Plan + Up Next + Not Now fit without truncation */}
                    <col style={{ width: 48 }} />{/* UXD */}
                    <col style={{ width: 72 }} />{/* dev read-only */}
                    <col style={{ width: 130 }} />{/* DevTL — name + interest indicator + chevron */}
                    <col style={{ width: 130 }} />{/* QM */}
                    <col style={{ width: 130 }} />{/* PQA1 Reviewer */}
                  </colgroup>
                  <TableHead>
                    <TableRow sx={{ '& th': { py: 0.5, fontSize: '0.72rem', color: 'text.secondary' } }}>
                      <TableCell>Pitch</TableCell>
                      <TableCell width={56} align="center">
                        <Tooltip title="Team priority score — hover a score to see voter breakdown" placement="top">
                          <span>Team</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell width={56} align="center">
                        <Tooltip title="TL priority score — hover a score to see voter breakdown" placement="top">
                          <span>TL</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell width={210} />
                      <TableCell width={48} align="center">
                        <Tooltip title="Include UXD in project kickoff">
                          <span>UXD</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell width={72} align="center">Dev</TableCell>
                      <TableCell width={130} align="center">Dev TL</TableCell>
                      <TableCell width={130} align="center">QM</TableCell>
                      <TableCell width={130} align="center">PQA1 Reviewer</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catPitches.length > 0 && subHeader('Planned', catPitches.length, isPlanOpen(cat), () => togglePlanSub(cat), 'planned')}
                    {isPlanOpen(cat) && catPitches.map(pitch => renderRow(pitch, { status: 'selected' }))}
                    {nextUpCatPitches.length > 0 && subHeader('Up Next', nextUpCatPitches.length, isNextUpOpen(cat), () => toggleNextUpSub(cat), 'nextUp')}
                    {isNextUpOpen(cat) && nextUpCatPitches.map(pitch => renderRow(pitch, { dimmed: true, status: 'next-up' }))}
                    {cutCatPitches.length > 0 && subHeader('Not Now', cutCatPitches.length, isCutOpen(cat), () => toggleCutSub(cat), 'cut')}
                    {isCutOpen(cat) && cutCatPitches.map(pitch => renderRow(pitch, { dimmed: true, status: 'cut' }))}
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

      {/* ── Right: people sidebar (Item 6) ── */}
      {sidebarOpen && (
      <Box
        ref={sidebarRef}
        sx={{ width: sidebarWidth, flexShrink: 0, overflow: 'auto', p: 2 }}
      >

        {/* ── Stats: Average Project Priority (parity with Stage 2) ── */}
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
        {step2Stats.avgTeamPriority !== null ? (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              <Box component="span" sx={{ color: priorityColor(step2Stats.avgTeamPriority), fontWeight: 700 }}>
                Team: {step2Stats.avgTeamPriority.toFixed(1)} ({interestLabel(step2Stats.avgTeamPriority)})
              </Box>
              {step2Stats.avgTLPriority !== null && (
                <>
                  <Box component="span" sx={{ color: 'text.disabled', mx: 0.5 }}>·</Box>
                  <Box component="span" sx={{ color: priorityColor(step2Stats.avgTLPriority), fontWeight: 700 }}>
                    TL: {step2Stats.avgTLPriority.toFixed(1)} ({interestLabel(step2Stats.avgTLPriority)})
                  </Box>
                </>
              )}
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
            No projects planned yet
          </Typography>
        )}

        <Divider sx={{ my: 1.25 }} />

        {/* ── Stats: Category Mix (parity with Stage 2) ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Category Mix
        </Typography>
        {categories.map(cat => {
          const actual = step2Stats.catActualPct[cat] ?? 0;
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

        {/* ── Stats: Continuation Projects (parity with Stage 2) ── */}
        {step2Stats.allContinuations.length > 0 && (<>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Continuation Projects
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              {step2Stats.continuationsDropped.length === 0 && (
                <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
              )}
              <Typography variant="caption">
                {step2Stats.allContinuations.length - step2Stats.continuationsDropped.length}/{step2Stats.allContinuations.length} continuations planned
              </Typography>
            </Box>
            {step2Stats.continuationsDropped.map(p => {
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
            {step2Stats.continuationsSelected.some(p => p.previousDev) && (<>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, mb: 0.25 }}>
                {step2Stats.continuationsDevChanged.length === 0 && (
                  <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
                )}
                <Typography variant="caption">
                  {step2Stats.continuationsSelected.filter(p => p.previousDev).length - step2Stats.continuationsDevChanged.length}/{step2Stats.continuationsSelected.filter(p => p.previousDev).length} have same dev as before
                </Typography>
              </Box>
              {step2Stats.continuationsDevChanged.map(p => (
                <Tooltip
                  key={p.id}
                  title={`Dev changed: ${p.previousDev} → ${devByPitchId[p.id] ?? 'unassigned'} — click to jump`}
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
          <Divider sx={{ my: 1.25 }} />
        </>)}

        {/* ── Stats: Team Consistency ── */}
        {step2Stats.continuations.length > 0 && (<>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Team Consistency
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              {step2Stats.changedItems.length === 0 && (
                <OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} />
              )}
              <Typography variant="caption">
                {step2Stats.sameTeamCount}/{step2Stats.continuations.length} continuations same team
              </Typography>
            </Box>
            {step2Stats.changedItems.map(({ pitch, changes }) => (
              <Tooltip
                key={pitch.id}
                title={<Box>{changes.map(c => <Typography key={c} variant="caption" sx={{ display: 'block' }}>{c}</Typography>)}</Box>}
                placement="left"
                slotProps={{ tooltip: { sx: { bgcolor: 'background.paper', color: 'text.primary', boxShadow: 3, border: '1px solid', borderColor: 'divider', p: 1 } } }}
              >
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25, cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => handleFocusPitch(pitch.id)}
                >
                  <SwapIcon sx={{ fontSize: '0.85rem', color: 'info.main', flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}>
                    {pitch.title.replace(/^[^/]+\/\s*/, '')}
                  </Typography>
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Divider sx={{ my: 1.25 }} />
        </>)}

        {/* ── Stats: Interest Alignment ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Interest Alignment
        </Typography>
        <InterestAlignmentPanel
          overall={{ label: 'Overall', pct: step2Stats.totalScore, tier12: step2Stats.allTier12, total: step2Stats.allTotal }}
          roles={[
            { label: 'Dev TL', pct: step2Stats.tlScore,   tier12: step2Stats.tlTier12,   total: step2Stats.tlTotal },
            { label: 'QM',     pct: step2Stats.qmScore,   tier12: step2Stats.qmTier12,   total: step2Stats.qmTotal },
            { label: 'PQA1',   pct: step2Stats.pqa1Score, tier12: step2Stats.pqa1Tier12, total: step2Stats.pqa1Total },
          ]}
          authoredPitchCount={step2Stats.authoredPitchCount}
          authorMatchedCount={step2Stats.authorMatchedCount}
          authorWarningItems={step2Stats.authorWarningItems}
          onFocusPitch={handleFocusPitch}
        />

        <Divider sx={{ my: 1.25 }} />

        {/* ── Stats: Workload Balance ── */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Workload Balance
        </Typography>
        {(() => {
          const roleGroups = [
            { label: 'Dev TLs', singular: 'Dev TL', counts: step2Stats.tlCounts, ideal: step2Stats.tlIdeal },
            { label: 'QMs',     singular: 'QM',     counts: step2Stats.qmCounts, ideal: step2Stats.qmIdeal },
            { label: 'PQA1',    singular: 'PQA1 reviewer', counts: step2Stats.pqa1Counts, ideal: step2Stats.pqa1Ideal },
          ];
          const totalFlagged = roleGroups.reduce(
            (sum, { counts, ideal }) => sum + counts.filter(({ count }) => workloadCountColor(count, ideal) !== 'text.secondary').length, 0
          );
          return (
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                {totalFlagged === 0
                  ? <Tooltip title="All role assignments are within the target workload">
                      <span><OkIcon fontSize="small" color="success" sx={{ fontSize: '0.9rem' }} /></span>
                    </Tooltip>
                  : <Tooltip title={`${totalFlagged} ${totalFlagged === 1 ? 'person has' : 'people have'} significantly more or fewer assignments than their role average`}>
                      <span><WarnIcon fontSize="small" color="warning" sx={{ fontSize: '0.9rem' }} /></span>
                    </Tooltip>
                }
                <Typography variant="caption">
                  {totalFlagged === 0
                    ? 'All balanced'
                    : `${totalFlagged} ${totalFlagged === 1 ? 'person' : 'people'} out of target`}
                </Typography>
              </Box>
              {roleGroups.map(({ label, singular, counts, ideal }) => {
                const flagged = counts.filter(({ count }) => workloadCountColor(count, ideal) !== 'text.secondary');
                if (flagged.length === 0) return null;
                return (
                  <Box key={label} sx={{ mb: 0.75 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="caption" color="text.disabled">Avg {fmtIdeal(ideal)} / {singular}</Typography>
                    </Box>
                    {flagged.map(({ name, count }) => (
                      <Tooltip key={name} title="Click to jump to this person in the list below" placement="left">
                        <Box
                          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ml: 1.5, cursor: 'pointer' }}
                          onClick={() => handleFocusPerson(name)}
                        >
                          <Typography variant="caption" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                            {getShortName(name)}
                          </Typography>
                          <Typography variant="caption" fontWeight={600} sx={{ color: workloadCountColor(count, ideal) }}>
                            {count}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                );
              })}
            </Box>
          );
        })()}

        <Divider sx={{ my: 1.25 }} />

        {[
          { label: 'Dev TLs', names: availableDevTLNames, unavailNames: unavailableDevTLNames, interests: devTLInterests, role: 'devTL' as const, ideal: step2Stats.tlIdeal, singular: 'TL' },
          { label: 'QMs', names: availableQmNames, unavailNames: unavailableQmNames, interests: qmInterests, role: 'qm' as const, ideal: step2Stats.qmIdeal, singular: 'QM' },
        ].map(({ label, names, unavailNames, interests, role, ideal, singular }, sectionIdx) => (
          <Box key={label}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSidebarSection(label)}
            >
              {sidebarCollapsed[label] ? <ExpandIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} /> : <CollapseIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />}
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                Avg {fmtIdeal(ideal)} / {singular}
              </Typography>
            </Box>
            <Collapse in={!sidebarCollapsed[label]}>
            {names.map(name => {
              const sortPitchIds = (ids: string[]): string[] => ids.slice().sort((a, b) => {
                const pA = pitchMap.get(a);
                const pB = pitchMap.get(b);
                if (!pA || !pB) return 0;
                // Stretch pitches always sort after non-stretch within a list,
                // before any other ordering — they're aspirational work, not
                // committed deliverables.
                const sA = stretchSet.has(a) ? 1 : 0;
                const sB = stretchSet.has(b) ? 1 : 0;
                if (sA !== sB) return sA - sB;
                const catA = categories.indexOf(pA.category);
                const catB = categories.indexOf(pB.category);
                if (catA !== catB) return catA - catB;
                return selectedPitches.indexOf(pA) - selectedPitches.indexOf(pB);
              });
              const primaryRole: SidebarDragRole = role;
              const isPrimary = (a: StaffingAssignment): boolean => (
                primaryRole === 'devTL' ? a.devTL === name : a.qm === name
              );
              const assignedPitchIds = sortPitchIds(
                assignments.filter(a => isPrimary(a) && pitchMap.has(a.pitchId)).map(a => a.pitchId),
              );
              // Every other role this person fills on selected pitches. Surfaced
              // beneath their primary-role pitches with a sub-section divider so
              // the TL using the screen can see a person's full responsibilities
              // (e.g. a dev TL who's also assigned as a dev or PQA1 reviewer on
              // some pitch shows up here, instead of being invisible until you
              // scroll to a different section). Workload count + warnings stay
              // scoped to primary-role pitches; the secondary roles are
              // informational.
              type RoleEntry = { role: SidebarRoleView; label: string; check: (a: StaffingAssignment) => boolean };
              const allRoleDefs: RoleEntry[] = [
                { role: 'devTL', label: 'As Dev TL', check: (a) => a.devTL === name },
                { role: 'qm',    label: 'As QM',     check: (a) => a.qm === name },
                { role: 'dev',   label: 'As Dev',    check: (a) => (devByPitchId[a.pitchId] ?? null) === name },
                { role: 'pqa1',  label: 'As PQA1',   check: (a) => a.pqa1 === name },
              ];
              const otherRolePitches = allRoleDefs
                .filter(d => d.role !== primaryRole)
                .map(({ role: r, label, check }) => ({
                  role: r,
                  label,
                  pitchIds: sortPitchIds(
                    assignments
                      .filter(a => check(a) && !isPrimary(a) && pitchMap.has(a.pitchId))
                      .map(a => a.pitchId),
                  ),
                }))
                .filter(entry => entry.pitchIds.length > 0);
              const hasHigh = hasHighInterest(name);
              const pi = interests.find(p => p.personName === name);
              const personHasNoData = !pi || Object.keys(pi.interestByPitchId).length === 0;
              const roleIdeal = role === 'devTL' ? step2Stats.tlIdeal : step2Stats.qmIdeal;
              // Weighted workload score from step2Stats so a TL or QM who also
              // picked up the dev slot on a project gets that ×2 weight. The
              // pitch list below still renders from the raw primary-role list.
              const workloadCount = (role === 'devTL' ? step2Stats.tlCounts : step2Stats.qmCounts)
                .find(c => c.name === name)?.count ?? assignedPitchIds.length;
              const workloadColor = workloadCountColor(workloadCount, roleIdeal);
              const workloadOff = workloadColor !== 'text.secondary';

              return (
                <Box
                  key={name}
                  ref={(el: HTMLDivElement | null) => { if (el) personRefs.current.set(name, el); else personRefs.current.delete(name); }}
                  {...sidebarPersonDropProps(role, name)}
                  sx={{
                    mb: 1, borderRadius: 0.5, p: 0.5,
                    bgcolor: highlightPersonName === name ? 'rgba(25, 118, 210, 0.22)' : undefined,
                    transition: highlightPersonName === name ? 'none' : 'background-color 1.2s ease',
                    '&:hover .capacity-edit-on-hover': { opacity: 1 },
                  }}
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => togglePerson(name)}
                  >
                    {personCollapsed[name]
                      ? <ExpandIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', flexShrink: 0 }} />
                      : <CollapseIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', flexShrink: 0 }} />
                    }
                    <Tooltip
                      title={workloadOff ? `Workload score ${workloadCount} (target ~${fmtIdeal(roleIdeal)})` : ''}
                      placement="top"
                      disableHoverListener={!workloadOff}
                    >
                      <Typography variant="caption" fontWeight={600} sx={{ color: workloadOff ? workloadColor : undefined }}>
                        {getShortName(name)}
                      </Typography>
                    </Tooltip>
                    <CapacityBadge
                      name={name}
                      tier={capacityByName[name]?.capacity}
                      comment={capacityByName[name]?.comment}
                      source={capacityByName[name]?.source}
                      onClick={() => setCapacityDialogTarget(name)}
                    />
                    <Tooltip title={lockedPersonSet.has(name) ? `Locked — auto-assign won't add or remove ${getShortName(name)}'s pitches. Click to unlock.` : `Lock ${getShortName(name)} so auto-assign keeps their pitches as-is`}>
                      <IconButton
                        size="small"
                        sx={{ p: 0.2, flexShrink: 0 }}
                        onClick={(e) => { e.stopPropagation(); onTogglePersonLock(name); }}
                      >
                        {lockedPersonSet.has(name)
                          ? <LockIcon sx={{ fontSize: '0.85rem', color: 'primary.main' }} />
                          : <LockOpenIcon sx={{ fontSize: '0.85rem', color: 'text.disabled' }} />
                        }
                      </IconButton>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {workloadCount}/{fmtIdeal(roleIdeal)}
                    </Typography>
                  </Box>
                  <Collapse in={!personCollapsed[name]}>
                  {(() => {
                    const renderPitchRow = (pid: string, currentRole: SidebarRoleView) => {
                      const p = pitchMap.get(pid);
                      if (!p) return null;
                      const shortTitle = p.title.replace(/^[^/]+\/\s*/, '');
                      const interestLevel = pi?.interestByPitchId[pid] ?? null;
                      const noData = personHasNoData;
                      // 'dev' rows are read-only (dev assignment lives in Stage 2);
                      // sidebarPitchDragProps's role only accepts SidebarDragRole
                      // values, so dev rows skip the drag wrappers entirely.
                      const dragProps = currentRole === 'dev'
                        ? {}
                        : sidebarPitchDragProps(pid, currentRole, name, shortTitle);
                      const dragStyle = currentRole === 'dev'
                        ? { cursor: 'default' as const, userSelect: 'none' as const }
                        : sidebarPitchDragStyle(pid, name);
                      return (
                        <Box
                          key={`${currentRole}-${pid}`}
                          {...dragProps}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25,
                            ...dragStyle,
                          }}
                        >
                          {lockedPitchSet.has(pid) && (
                            <Tooltip title="This project is locked">
                              <LockIcon sx={{ fontSize: '0.75rem', color: 'primary.main', flexShrink: 0 }} />
                            </Tooltip>
                          )}
                          {stretchSet.has(pid) && (
                            <Tooltip title="Stretch goal — only completed if there's spare capacity">
                              <StretchIcon sx={{ fontSize: '0.75rem', color: 'warning.main', flexShrink: 0 }} />
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
                            const wasHere =
                              currentRole === 'devTL' ? p.previousTL === name :
                              currentRole === 'qm'    ? p.previousQM === name :
                              currentRole === 'pqa1'  ? p.previousPQA1 === name :
                              currentRole === 'dev'   ? p.previousDev === name :
                              false;
                            const gold = wasHere && (interestLevel === 1 || interestLevel === 2);
                            return (
                              <Tooltip title={gold ? 'Continuation project — was on this team before and has high interest' : 'Continuation project'}>
                                <AutorenewIcon sx={{ fontSize: '0.75rem', color: gold ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
                              </Tooltip>
                            );
                          })()}
                          {p.author === name && (
                            <Tooltip title="Wrote this pitch">
                              <StarIcon sx={{ fontSize: '0.75rem', color: interestLevel === 1 ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
                            </Tooltip>
                          )}
                          <Box sx={{ flex: 1 }} />
                          {sidebarWidth < 280
                            ? <InterestDot level={interestLevel} noData={noData} />
                            : <InterestChip level={interestLevel} noData={noData} size="small" />
                          }
                        </Box>
                      );
                    };
                    return (
                      <>
                        {assignedPitchIds.map(pid => renderPitchRow(pid, primaryRole))}
                        {otherRolePitches.map(({ role: secRole, label, pitchIds }) => (
                          <Box key={secRole} sx={{ ml: 1 }}>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', ml: 1.5, mt: 0.5, mb: 0.25, fontSize: '0.6rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                              {label}{primaryRole === 'devTL' && secRole === 'dev' ? ' · counts ×2' : ''}
                            </Typography>
                            {pitchIds.map(pid => renderPitchRow(pid, secRole))}
                          </Box>
                        ))}
                      </>
                    );
                  })()}
                  </Collapse>
                </Box>
              );
            })}
            {unavailNames.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', ml: 0.5, mb: 0.25, fontStyle: 'italic' }}>
                  Not available
                </Typography>
                {unavailNames.map(name => (
                  <Box key={name} sx={{ ml: 0.5, mb: 0.25, opacity: 0.45 }}>
                    <Typography variant="caption" color="text.disabled">{name}</Typography>
                  </Box>
                ))}
              </Box>
            )}
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
            <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
              Avg {fmtIdeal(step2Stats.pqa1Ideal)} / PQA1
            </Typography>
          </Box>
          <Collapse in={!sidebarCollapsed['PQA1 Reviewers']}>
            {availableDevNames.map(name => {
              const sortPitchIds = (ids: string[]): string[] => ids.slice().sort((a, b) => {
                const pA = pitchMap.get(a);
                const pB = pitchMap.get(b);
                if (!pA || !pB) return 0;
                // Stretch pitches always sort after non-stretch within a list,
                // before any other ordering — they're aspirational work, not
                // committed deliverables.
                const sA = stretchSet.has(a) ? 1 : 0;
                const sB = stretchSet.has(b) ? 1 : 0;
                if (sA !== sB) return sA - sB;
                const catA = categories.indexOf(pA.category);
                const catB = categories.indexOf(pB.category);
                if (catA !== catB) return catA - catB;
                return selectedPitches.indexOf(pA) - selectedPitches.indexOf(pB);
              });
              // Primary role for this section is PQA1 reviewer. Workload count
              // tracks PQA1 work (the role being allocated in Stage 4); dev work
              // from Stage 2 surfaces in an "As Dev" sub-section beneath so the
              // TL can see this dev's total commitments without scrolling.
              const isPrimary = (a: StaffingAssignment): boolean => a.pqa1 === name;
              const assignedPitchIds = sortPitchIds(
                assignments.filter(a => isPrimary(a) && pitchMap.has(a.pitchId)).map(a => a.pitchId),
              );
              type RoleEntry = { role: SidebarRoleView; label: string; check: (a: StaffingAssignment) => boolean };
              const allRoleDefs: RoleEntry[] = [
                { role: 'devTL', label: 'As Dev TL', check: (a) => a.devTL === name },
                { role: 'qm',    label: 'As QM',     check: (a) => a.qm === name },
                { role: 'dev',   label: 'As Dev',    check: (a) => (devByPitchId[a.pitchId] ?? null) === name },
              ];
              const otherRolePitches = allRoleDefs
                .map(({ role: r, label, check }) => ({
                  role: r,
                  label,
                  pitchIds: sortPitchIds(
                    assignments
                      .filter(a => check(a) && !isPrimary(a) && pitchMap.has(a.pitchId))
                      .map(a => a.pitchId),
                  ),
                }))
                .filter(entry => entry.pitchIds.length > 0);
              const hasHigh = hasHighInterestPqa1(name);
              const personalIdeal = step2Stats.pqa1IdealByName[name] ?? step2Stats.pqa1Ideal;
              // Weighted workload score from step2Stats so a dev who's also
              // picked up the dev slot on a project gets that ×2 weight in
              // their PQA1 sidebar entry, matching devTL/QM behavior.
              const workloadCount = step2Stats.pqa1Counts.find(c => c.name === name)?.count ?? assignedPitchIds.length;
              const workloadColor = workloadCountColor(workloadCount, personalIdeal);
              const workloadOff = workloadColor !== 'text.secondary';

              return (
                <Box
                  key={name}
                  ref={(el: HTMLDivElement | null) => { if (el) personRefs.current.set(name, el); else personRefs.current.delete(name); }}
                  {...sidebarPersonDropProps('pqa1', name)}
                  sx={{
                    mb: 1, borderRadius: 0.5, p: 0.5,
                    bgcolor: highlightPersonName === name ? 'rgba(25, 118, 210, 0.22)' : undefined,
                    transition: highlightPersonName === name ? 'none' : 'background-color 1.2s ease',
                    '&:hover .capacity-edit-on-hover': { opacity: 1 },
                  }}
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => togglePerson(name)}
                  >
                    {personCollapsed[name]
                      ? <ExpandIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', flexShrink: 0 }} />
                      : <CollapseIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', flexShrink: 0 }} />
                    }
                    <Tooltip
                      title={workloadOff ? `Workload score ${workloadCount} (target ~${fmtIdeal(personalIdeal)})` : ''}
                      placement="top"
                      disableHoverListener={!workloadOff}
                    >
                      <Typography variant="caption" fontWeight={600} sx={{ color: workloadOff ? workloadColor : undefined }}>
                        {getShortName(name)}
                      </Typography>
                    </Tooltip>
                    <CapacityBadge
                      name={name}
                      tier={capacityByName[name]?.pqa1Capacity}
                      comment={capacityByName[name]?.comment}
                      source={capacityByName[name]?.source}
                      onClick={() => setCapacityDialogTarget(name)}
                    />
                    <Tooltip title={lockedPersonSet.has(name) ? `Locked — auto-assign won't add or remove ${getShortName(name)}'s pitches. Click to unlock.` : `Lock ${getShortName(name)} so auto-assign keeps their pitches as-is`}>
                      <IconButton
                        size="small"
                        sx={{ p: 0.2, flexShrink: 0 }}
                        onClick={(e) => { e.stopPropagation(); onTogglePersonLock(name); }}
                      >
                        {lockedPersonSet.has(name)
                          ? <LockIcon sx={{ fontSize: '0.85rem', color: 'primary.main' }} />
                          : <LockOpenIcon sx={{ fontSize: '0.85rem', color: 'text.disabled' }} />
                        }
                      </IconButton>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {workloadCount}/{fmtIdeal(personalIdeal)}
                    </Typography>
                  </Box>
                  <Collapse in={!personCollapsed[name]}>
                  {(() => {
                    const renderPitchRow = (pid: string, currentRole: SidebarRoleView) => {
                      const p = pitchMap.get(pid);
                      if (!p) return null;
                      const shortTitle = p.title.replace(/^[^/]+\/\s*/, '');
                      // Devs in this section have their interest tier sourced from
                      // Stage 1 data (pitch.devInterest), not Phase 2 — they may
                      // not have submitted Stage 2 interest at all.
                      const interestLevel = p.devInterest[name] ?? null;
                      const noData = !devHasAnyData.has(name);
                      // 'dev' rows aren't draggable — dev assignment happens in
                      // Stage 2, so we show them here for context only.
                      const dragProps = currentRole === 'dev'
                        ? {}
                        : sidebarPitchDragProps(pid, currentRole, name, shortTitle);
                      const dragStyle = currentRole === 'dev'
                        ? { cursor: 'default' as const, userSelect: 'none' as const }
                        : sidebarPitchDragStyle(pid, name);
                      return (
                        <Box
                          key={`${currentRole}-${pid}`}
                          {...dragProps}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, mt: 0.25,
                            ...dragStyle,
                          }}
                        >
                          {lockedPitchSet.has(pid) && (
                            <Tooltip title="This project is locked">
                              <LockIcon sx={{ fontSize: '0.75rem', color: 'primary.main', flexShrink: 0 }} />
                            </Tooltip>
                          )}
                          {stretchSet.has(pid) && (
                            <Tooltip title="Stretch goal — only completed if there's spare capacity">
                              <StretchIcon sx={{ fontSize: '0.75rem', color: 'warning.main', flexShrink: 0 }} />
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
                            const wasHere =
                              currentRole === 'devTL' ? p.previousTL === name :
                              currentRole === 'qm'    ? p.previousQM === name :
                              currentRole === 'pqa1'  ? p.previousPQA1 === name :
                              currentRole === 'dev'   ? p.previousDev === name :
                              false;
                            const gold = wasHere && (interestLevel === 1 || interestLevel === 2);
                            return (
                              <Tooltip title={gold ? 'Continuation project — was on this team before and has high interest' : 'Continuation project'}>
                                <AutorenewIcon sx={{ fontSize: '0.75rem', color: gold ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
                              </Tooltip>
                            );
                          })()}
                          {p.author === name && (
                            <Tooltip title="Wrote this pitch">
                              <StarIcon sx={{ fontSize: '0.75rem', color: interestLevel === 1 ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
                            </Tooltip>
                          )}
                          <Box sx={{ flex: 1 }} />
                          {sidebarWidth < 280
                            ? <InterestDot level={interestLevel} noData={noData} />
                            : <InterestChip level={interestLevel} noData={noData} size="small" />
                          }
                        </Box>
                      );
                    };
                    return (
                      <>
                        {assignedPitchIds.map(pid => renderPitchRow(pid, 'pqa1'))}
                        {otherRolePitches.map(({ role: secRole, label, pitchIds }) => (
                          <Box key={secRole} sx={{ ml: 1 }}>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', ml: 1.5, mt: 0.5, mb: 0.25, fontSize: '0.6rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                              {label}
                            </Typography>
                            {pitchIds.map(pid => renderPitchRow(pid, secRole))}
                          </Box>
                        ))}
                      </>
                    );
                  })()}
                  </Collapse>
                </Box>
              );
            })}
            {devOnlyAvailablePqa1Names.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Available for Dev only
                </Typography>
                {devOnlyAvailablePqa1Names.map(name => (
                  <Box
                    key={name}
                    sx={{ mb: 0.5, px: 0.5, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 0.5,
                          '&:hover .capacity-edit-on-hover': { opacity: 1 } }}
                  >
                    <Typography variant="caption" color="text.disabled" fontWeight={600}>
                      {getShortName(name)}
                    </Typography>
                    <CapacityBadge
                      name={name}
                      tier={capacityByName[name]?.devCapacity}
                      comment={capacityByName[name]?.comment}
                      source={capacityByName[name]?.source}
                      onClick={() => setCapacityDialogTarget(name)}
                    />
                  </Box>
                ))}
              </>
            )}

            {unavailableDevNamesForPqa1.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Not Available
                </Typography>
                {unavailableDevNamesForPqa1.map(name => (
                  <Box
                    key={name}
                    sx={{ mb: 0.5, px: 0.5, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 0.5,
                          '&:hover .capacity-edit-on-hover': { opacity: 1 } }}
                  >
                    <Typography variant="caption" color="text.disabled" fontWeight={600}>
                      {getShortName(name)}
                    </Typography>
                    <CapacityBadge
                      name={name}
                      tier={capacityByName[name]?.pqa1Capacity}
                      comment={capacityByName[name]?.comment}
                      source={capacityByName[name]?.source}
                      onClick={() => setCapacityDialogTarget(name)}
                    />
                  </Box>
                ))}
              </>
            )}
          </Collapse>
        </Box>
      </Box>
      )}

      {/* TL capacity override dialog — opens for whichever sidebar row was clicked. */}
      <CapacityOverrideDialog
        open={capacityDialogTarget !== null}
        onClose={() => setCapacityDialogTarget(null)}
        personName={capacityDialogTarget ?? ''}
        personRole={capacityDialogTarget && devNameSet.has(capacityDialogTarget) ? 'dev' : 'qm-or-tl'}
        current={capacityDialogTarget ? capacityByName[capacityDialogTarget] : undefined}
        setBy={voterName}
        onSubmit={onCapacityOverride}
      />
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
  devHasAnyData: Set<string>;
  onAssign: (pitchId: string, field: 'devTL' | 'qm' | 'pqa1', value: string | null) => void;
  onRef?: (el: HTMLTableRowElement | null) => void;
  highlighted?: boolean;
  devName: string | null;
  includeUXD: boolean;
  onToggleUXD: () => void;
  locked: boolean;
  onToggleLock: () => void;
  lockedPersonSet: ReadonlySet<string>;
  committed?: boolean;
  isAdhoc?: boolean;
  isStretch?: boolean;
  onEdit?: () => void;
  /** Reduce row opacity to signal this isn't a planned project (e.g. Up Next).
   *  Doesn't disable interaction — pre-staging assignments on Up Next rows is
   *  intentional, and the dim cue is enough to keep them visually secondary. */
  dimmed?: boolean;
  /** Plan status — drives the highlighted chip among Plan / Up Next / Not Now.
   *  Pass undefined to skip the status column entirely (when onStatusChange
   *  isn't wired). */
  status?: 'selected' | 'next-up' | 'cut';
  /** Move this pitch between Planned / Up Next / Not Now. Pre-checked against
   *  committed/locked guards by the parent (tryStatusChange in Step2View). */
  onStatusChange?: (newStatus: 'selected' | 'next-up' | 'cut') => void;
}

function Step2Row({
  pitch, assignment, devTLInterests, qmInterests, devTLNames, qmNames, devNames, devHasAnyData,
  onAssign, onRef, highlighted, devName, includeUXD, onToggleUXD,
  locked, onToggleLock, lockedPersonSet, committed, isAdhoc, isStretch, onEdit, dimmed,
  status, onStatusChange,
}: Step2RowProps) {
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLButtonElement | null>(null);

  const tlChanged = pitch.continuation && pitch.previousTL &&
    assignment.devTL !== null && assignment.devTL !== pitch.previousTL;
  const qmChanged = pitch.continuation && pitch.previousQM &&
    assignment.qm !== null && assignment.qm !== pitch.previousQM;

  const author = pitch.author ?? null;
  const authorDevTLInterest = author && devTLNames.includes(author)
    ? (devTLInterests.find(p => p.personName === author)?.interestByPitchId[pitch.id] ?? null)
    : null;
  const authorQMInterest = author && qmNames.includes(author)
    ? (qmInterests.find(p => p.personName === author)?.interestByPitchId[pitch.id] ?? null)
    : null;
  const devTLAuthorWarning = authorDevTLInterest === 1 && assignment.devTL !== null && assignment.devTL !== author;
  const qmAuthorWarning = authorQMInterest === 1 && assignment.qm !== null && assignment.qm !== author;
  // Dev TLs are excluded: their relevant warning is devTLAuthorWarning, not PQA1.
  const pqa1AuthorWarning = author && devNames.includes(author) && !devTLNames.includes(author) &&
    author !== devName &&
    (pitch.devInterest[author] ?? null) === 1 && assignment.pqa1 !== null && assignment.pqa1 !== author;

  return (
    <TableRow
      ref={onRef}
      sx={{
        bgcolor: highlighted ? 'rgba(25, 118, 210, 0.22)' : undefined,
        transition: highlighted ? 'none' : 'background-color 1.2s ease',
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {committed ? (
            <Tooltip title="Committed — already allocated for next quarter; cannot be changed from this view">
              <Box
                component="span"
                sx={{
                  display: 'inline-flex', alignItems: 'center', height: 16, px: 0.75, mr: 0.25,
                  borderRadius: 8, fontSize: '0.6rem', fontWeight: 700,
                  bgcolor: 'success.main', color: 'success.contrastText',
                }}
              >
                COMMITTED
              </Box>
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
          {isStretch && (
            <Tooltip title="Stretch goal — only completed if there's spare capacity">
              <StretchIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0, mr: 0.25 }} />
            </Tooltip>
          )}
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
          {onEdit && (
            <Tooltip title={isAdhoc ? 'Edit this locally-added project' : 'Edit status or team'}>
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
      {/* Team priority score */}
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
      {/* TL priority score */}
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
      {/* Plan / Up Next / Not Now status chips. Mirror of Step1View's
          status column — committed rows show only the Plan chip (locked
          into Planned), other rows toggle between all three. */}
      <TableCell sx={{ px: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
          {/* flexShrink: 0 + whiteSpace: nowrap on each chip protects their
              full label from being clipped when the row narrows — matches the
              guard in Step1View so "Not Now" never collapses to "Not N…" */}
          <Tooltip title={committed ? 'Committed projects are always planned' : "Include in this quarter's projects"}>
            <Chip
              label="Plan"
              size="small"
              onClick={committed || !onStatusChange ? undefined : () => onStatusChange('selected')}
              color={status === 'selected' ? 'primary' : 'default'}
              variant={status === 'selected' ? 'filled' : 'outlined'}
              sx={{ cursor: committed || !onStatusChange ? 'default' : 'pointer', fontSize: '0.65rem', minWidth: 36, opacity: committed ? 0.85 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}
            />
          </Tooltip>
          {!committed && onStatusChange && (
            <Tooltip title="Queue as a potential project — keeps any TL/QM/PQA1 picks but flags it as not-yet-planned">
              <Chip
                label="Up Next"
                size="small"
                onClick={() => onStatusChange('next-up')}
                color={status === 'next-up' ? 'info' : 'default'}
                variant={status === 'next-up' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 44, flexShrink: 0, whiteSpace: 'nowrap' }}
              />
            </Tooltip>
          )}
          {!committed && onStatusChange && (
            <Tooltip title="Cut from this quarter">
              <Chip
                label="Not Now"
                size="small"
                onClick={() => onStatusChange('cut')}
                color="default"
                variant={status === 'cut' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', minWidth: 52, color: status === 'cut' ? undefined : 'text.disabled', flexShrink: 0, whiteSpace: 'nowrap' }}
              />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      {/* UXD checkbox */}
      <TableCell align="center" sx={{ p: 0 }}>
        <Checkbox
          size="small"
          disabled={committed}
          checked={includeUXD}
          onChange={onToggleUXD}
          sx={{ p: 0.5 }}
        />
      </TableCell>
      {/* Dev read-only */}
      <TableCell align="center">
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {devName ? getShortName(devName) : '—'}
        </Typography>
      </TableCell>
      <TableCell sx={{ px: 0.5, py: 0.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AssignmentDropdown
              value={assignment.devTL}
              allNames={devTLNames}
              options={devTLInterests}
              pitchId={pitch.id}
              selectId={`${pitch.id}-devTL`}
              onChange={v => onAssign(pitch.id, 'devTL', v)}
              previousPerson={pitch.previousTL}
              author={author}
              lockedPersonSet={lockedPersonSet}
              disabled={committed}
              hideInterest={isAdhoc}
            />
          </Box>
          {devTLAuthorWarning && (
            <Tooltip title={`${author} wrote this pitch with highest interest but isn't assigned as TL`} placement="top">
              <WarnIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0 }} />
            </Tooltip>
          )}
          {tlChanged && (
            <Tooltip title={`Previous TL: ${pitch.previousTL} — team changed from last quarter`} placement="top">
              <WarnIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ px: 0.5, py: 0.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AssignmentDropdown
              value={assignment.qm}
              allNames={qmNames}
              options={qmInterests}
              pitchId={pitch.id}
              selectId={`${pitch.id}-qm`}
              onChange={v => onAssign(pitch.id, 'qm', v)}
              previousPerson={pitch.previousQM}
              author={author}
              lockedPersonSet={lockedPersonSet}
              disabled={committed}
              hideInterest={isAdhoc}
            />
          </Box>
          {qmAuthorWarning && (
            <Tooltip title={`${author} wrote this pitch with highest interest but isn't assigned as QM`} placement="top">
              <WarnIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0 }} />
            </Tooltip>
          )}
          {qmChanged && (
            <Tooltip title={`Previous QM: ${pitch.previousQM} — team changed from last quarter`} placement="top">
              <WarnIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ px: 0.5, py: 0.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Pqa1Dropdown
              value={assignment.pqa1 ?? null}
              devNames={devNames}
              devTLNames={devTLNames}
              devInterest={pitch.devInterest}
              devHasAnyData={devHasAnyData}
              excludeDev={devName}
              selectId={`${pitch.id}-pqa1`}
              onChange={v => onAssign(pitch.id, 'pqa1', v)}
              author={author}
              lockedPersonSet={lockedPersonSet}
              disabled={committed}
              hideInterest={isAdhoc}
            />
          </Box>
          {pqa1AuthorWarning && (
            <Tooltip title={`${author} wrote this pitch with highest interest but isn't assigned as PQA1`} placement="top">
              <WarnIcon sx={{ fontSize: '0.95rem', color: 'warning.main', flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ─── PQA1 reviewer dropdown ────────────────────────────────────────────────────

interface Pqa1DropdownProps {
  value: string | null;
  devNames: string[];
  devTLNames?: string[];
  devInterest: Record<string, InterestLevel>;
  devHasAnyData: Set<string>;
  excludeDev: string | null;
  selectId: string;
  onChange: (val: string | null) => void;
  author?: string | null;
  lockedPersonSet: ReadonlySet<string>;
  disabled?: boolean;
  /** Adhoc pitches have no interest data — suppress dots/chips and sort alphabetically instead of by interest. */
  hideInterest?: boolean;
}

function Pqa1Dropdown({ value, devNames, devTLNames = [], devInterest, devHasAnyData, excludeDev, selectId, onChange, author, lockedPersonSet, disabled, hideInterest }: Pqa1DropdownProps) {
  const exclusive = useExclusiveSelect(selectId);
  const devTLSet = new Set(devTLNames);
  const sortedAll = devNames
    .filter(d => d !== excludeDev)
    .sort((a, b) => {
      if (hideInterest) return a.localeCompare(b);
      const tA = (devInterest[a] ?? 5) as number;
      const tB = (devInterest[b] ?? 5) as number;
      return tA - tB;
    });
  const sorted = sortedAll.filter(d => !devTLSet.has(d));
  const sortedTLs = sortedAll.filter(d => devTLSet.has(d));

  return (
    <Select
      {...exclusive}
      size="small"
      disabled={disabled}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      displayEmpty
      sx={{ fontSize: '0.75rem', width: '100%', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
      renderValue={val => {
        if (!val) return <Typography variant="caption" color="text.disabled">Assign…</Typography>;
        if (val === ASSIGNMENT_NONE) {
          return <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None</Typography>;
        }
        const name = val as string;
        const level = (devInterest[name] ?? null) as (1 | 2 | 3 | 4 | null);
        const noData = !devHasAnyData.has(name);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {getShortName(name)}
            </Typography>
            {lockedPersonSet.has(name) && (
              <Tooltip title={`${getShortName(name)} is locked`}>
                <LockIcon sx={{ fontSize: '0.85rem', color: 'primary.main', flexShrink: 0 }} />
              </Tooltip>
            )}
            {!hideInterest && <InterestDot level={level} noData={noData} />}
          </Box>
        );
      }}
    >
      <MenuItem value=""><Typography variant="body2"><em>Unassign</em></Typography></MenuItem>
      <MenuItem value={ASSIGNMENT_NONE}>
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None — no PQA1 reviewer</Typography>
      </MenuItem>
      {[...sorted, ...sortedTLs].map((dev, idx) => {
        const isTLSection = idx === sorted.length;
        const interestLevel = (devInterest[dev] ?? null) as (1 | 2 | 3 | 4 | null);
        const authorGold = interestLevel === 1;
        return [
          isTLSection && sorted.length > 0 ? <Divider key="tl-divider" /> : null,
          <MenuItem key={dev} value={dev}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body2" sx={{ flex: 1 }}>{dev}</Typography>
              {dev === author && (
                <Tooltip title={authorGold ? 'Wrote this pitch with highest interest' : 'Wrote this pitch'} placement="left">
                  <StarIcon sx={{ fontSize: '0.85rem', color: authorGold ? 'success.main' : 'text.secondary', flexShrink: 0 }} />
                </Tooltip>
              )}
              {!hideInterest && (
                <InterestChip
                  level={interestLevel}
                  noData={!devHasAnyData.has(dev)}
                />
              )}
            </Box>
          </MenuItem>,
        ];
      })}
    </Select>
  );
}

// ─── Assignment dropdown ───────────────────────────────────────────────────────

interface AssignmentDropdownProps {
  value: string | null;
  allNames: string[];
  options: Phase2Interest[];
  pitchId: string;
  selectId: string;
  onChange: (val: string | null) => void;
  previousPerson?: string;
  author?: string | null;
  lockedPersonSet: ReadonlySet<string>;
  disabled?: boolean;
  /** Adhoc pitches have no interest data — suppress dots/chips and sort alphabetically. */
  hideInterest?: boolean;
}

function AssignmentDropdown({ value, allNames, options, pitchId, selectId, onChange, previousPerson, author, lockedPersonSet, disabled, hideInterest }: AssignmentDropdownProps) {
  const interestMap = new Map(options.map(o => [o.personName, o]));
  const exclusive = useExclusiveSelect(selectId);

  // Interest submitters first (sorted by level), then remaining names alphabetically.
  // For adhoc pitches there's no per-pitch interest, so just sort everyone alphabetically.
  const allEntries = hideInterest
    ? [...allNames].sort((a, b) => a.localeCompare(b))
    : (() => {
        const withInterest = [...options].sort((a, b) => {
          const tA = a.interestByPitchId[pitchId] ?? 5;
          const tB = b.interestByPitchId[pitchId] ?? 5;
          return (tA as number) - (tB as number);
        });
        const withoutInterest = allNames
          .filter(n => !interestMap.has(n))
          .sort((a, b) => a.localeCompare(b));
        return [...withInterest.map(o => o.personName), ...withoutInterest];
      })();

  return (
    <Select
      {...exclusive}
      size="small"
      disabled={disabled}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      displayEmpty
      sx={{ fontSize: '0.75rem', width: '100%', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
      renderValue={val => {
        if (!val) return <Typography variant="caption" color="text.disabled">Assign…</Typography>;
        if (val === ASSIGNMENT_NONE) {
          return <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None</Typography>;
        }
        const person = interestMap.get(val as string);
        const level = (person?.interestByPitchId[pitchId] ?? null) as (1 | 2 | 3 | 4 | null);
        const noData = !person || Object.keys(person.interestByPitchId).length === 0;
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
            {!hideInterest && <InterestDot level={level} noData={noData} />}
          </Box>
        );
      }}
    >
      <MenuItem value=""><Typography variant="body2"><em>Unassign</em></Typography></MenuItem>
      <MenuItem value={ASSIGNMENT_NONE}>
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None — no one needed in this role</Typography>
      </MenuItem>
      {allEntries.map(name => {
        const person = interestMap.get(name);
        const level = (person?.interestByPitchId[pitchId] ?? null) as (1 | 2 | 3 | 4 | null);
        const noData = !person || Object.keys(person.interestByPitchId).length === 0;
        const continuationGold = name === previousPerson && (level === 1 || level === 2);
        const authorGold = level === 1;
        return (
          <MenuItem key={name} value={name}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
              {name === previousPerson && (
                <Tooltip title={continuationGold ? 'Was on this project last quarter and has high interest' : 'Was on this project last quarter'} placement="left">
                  <AutorenewIcon sx={{ fontSize: '0.85rem', color: continuationGold ? 'success.main' : 'text.secondary', flexShrink: 0 }} />
                </Tooltip>
              )}
              {name === author && (
                <Tooltip title={authorGold ? 'Wrote this pitch with highest interest' : 'Wrote this pitch'} placement="left">
                  <StarIcon sx={{ fontSize: '0.85rem', color: authorGold ? 'success.main' : 'text.secondary', flexShrink: 0 }} />
                </Tooltip>
              )}
              {!hideInterest && <InterestChip level={level} noData={noData} />}
            </Box>
          </MenuItem>
        );
      })}
    </Select>
  );
}
