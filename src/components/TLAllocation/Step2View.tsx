import { lazy, Suspense, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, Divider, Tooltip, IconButton, Popover, TextField,
  Button, Checkbox, Collapse,
} from '@mui/material';
import {
  Warning as WarnIcon,
  CheckCircle as OkIcon,
  InfoOutlined as InfoIcon,
  MailOutline as MailOutlineIcon,
  Mail as MailIcon,
  Autorenew as AutorenewIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import type {
  AllocationPitch, Phase2Interest, StaffingAssignment, AllocationConfig,
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
  onAssign: (pitchId: string, field: 'devTL' | 'qm', value: string | null) => void;
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
  selectedPitches, assignments, phase2Interests, config, onAssign, devByPitchId,
}: Step2ViewProps) {
  // ── Sidebar resize (Item 5) ──────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(() => Math.round(window.innerWidth / 3));
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

  // ── Sidebar section collapse state ──────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState<Record<string, boolean>>({});
  const toggleSidebarSection = (label: string) =>
    setSidebarCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  // ── UXD checkboxes (Item 9) ──────────────────────────────────────────────
  const [includeUXD, setIncludeUXD] = useState<Record<string, boolean>>({});

  // ── Email messages + popover (Item 10) ──────────────────────────────────
  const [emailMessages, setEmailMessages] = useState<Record<string, string>>({});
  const [emailPopover, setEmailPopover] = useState<{ anchor: HTMLElement | null; pitchId: string | null }>({
    anchor: null, pitchId: null,
  });

  const getDefaultEmailMessage = useCallback((pitchId: string) => {
    const pitch = pitchMap.get(pitchId);
    if (!pitch) return '';
    const shortTitle = pitch.title.replace(/^[^/]+\/\s*/, '');
    const a = assignMap.get(pitchId);
    const qmFirstName = a?.qm ? a.qm.split(' ')[0] : 'QM';
    return `Hi everyone, this is the team for ${shortTitle}! @${qmFirstName}, please setup a kickoff meeting for this pitch in the next week.`;
  }, [pitchMap, assignMap]);

  const openEmailPopover = useCallback((anchor: HTMLElement, pitchId: string) => {
    setEmailPopover({ anchor, pitchId });
  }, []);

  // Popover pitch data
  const popoverPitch = emailPopover.pitchId ? pitchMap.get(emailPopover.pitchId) : null;
  const popoverAssignment = emailPopover.pitchId ? assignMap.get(emailPopover.pitchId) : null;
  const popoverMessage = emailPopover.pitchId
    ? (emailMessages[emailPopover.pitchId] ?? getDefaultEmailMessage(emailPopover.pitchId))
    : '';

  const getRecipientsList = (pitchId: string) => {
    const a = assignMap.get(pitchId);
    const parts: string[] = [];
    if (a?.devTL) parts.push(a.devTL.split(' ')[0]);
    const dev = devByPitchId[pitchId];
    if (dev) parts.push(dev.split(' ')[0]);
    if (a?.qm) parts.push(a.qm.split(' ')[0]);
    parts.push(config.testingCaptain);
    if (includeUXD[pitchId]) parts.push('UXD');
    return `To: ${parts.join(', ')}`;
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: assignment table (category buckets) ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, minWidth: 0 }}>
        {categories.map(cat => {
          const catPitches = pitchesByCategory[cat] ?? [];
          if (catPitches.length === 0) return null;
          const collapsed = categoryCollapsed[cat] ?? false;
          return (
            <Paper key={cat} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
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
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col />{/* pitch: flex */}
                    <col style={{ width: 72 }} />{/* Email/Message */}
                    <col style={{ width: 48 }} />{/* UXD */}
                    <col style={{ width: 72 }} />{/* dev read-only */}
                    <col style={{ width: 190 }} />{/* DevTL */}
                    <col style={{ width: 190 }} />{/* QM */}
                  </colgroup>
                  <TableHead>
                    <TableRow sx={{ '& th': { py: 0.5, fontSize: '0.72rem', color: 'text.secondary' } }}>
                      <TableCell>Pitch</TableCell>
                      <TableCell width={72} align="center">Message</TableCell>
                      <TableCell width={48} align="center">
                        <Tooltip title="Include UXD in project kickoff">
                          <span>UXD</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell width={72} align="center">Dev</TableCell>
                      <TableCell width={190} align="center">Dev TL</TableCell>
                      <TableCell width={190} align="center">QM</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catPitches.map(pitch => {
                      const a = assignMap.get(pitch.id) ?? { pitchId: pitch.id, devTL: null, qm: null };
                      return (
                        <Step2Row
                          key={pitch.id}
                          pitch={pitch}
                          assignment={a}
                          devTLInterests={devTLInterests}
                          qmInterests={qmInterests}
                          onAssign={onAssign}
                          onRef={registerRow(pitch.id)}
                          highlighted={pitch.id === highlightPitchId}
                          devName={devByPitchId[pitch.id] ?? null}
                          includeUXD={includeUXD[pitch.id] ?? false}
                          onToggleUXD={() => setIncludeUXD(prev => ({ ...prev, [pitch.id]: !(prev[pitch.id] ?? false) }))}
                          onOpenEmail={openEmailPopover}
                          emailCustomized={!!emailMessages[pitch.id]}
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

      {/* ── Drag handle (Item 5) ── */}
      <Box
        onMouseDown={handleDragStart}
        sx={{
          width: 6, flexShrink: 0, cursor: 'col-resize',
          bgcolor: 'divider',
          '&:hover': { bgcolor: 'primary.light' },
          transition: 'background-color 0.15s',
        }}
      />

      {/* ── Right: people sidebar (Item 6) ── */}
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
      </Box>

      {/* ── Shared email popover (Item 10) ── */}
      <Popover
        open={Boolean(emailPopover.anchor)}
        anchorEl={emailPopover.anchor}
        onClose={() => setEmailPopover({ anchor: null, pitchId: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {emailPopover.pitchId && popoverPitch && (
          <Box sx={{ p: 2, width: 340 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Kickoff Email
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {getRecipientsList(emailPopover.pitchId)}
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              size="small"
              value={popoverMessage}
              onChange={e => {
                const pid = emailPopover.pitchId!;
                setEmailMessages(prev => ({ ...prev, [pid]: e.target.value }));
              }}
              sx={{ mb: 1.5 }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={() => setEmailPopover({ anchor: null, pitchId: null })}
            >
              Done
            </Button>
          </Box>
        )}
      </Popover>
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
  onRef?: (el: HTMLTableRowElement | null) => void;
  highlighted?: boolean;
  devName: string | null;
  includeUXD: boolean;
  onToggleUXD: () => void;
  onOpenEmail: (anchor: HTMLElement, pitchId: string) => void;
  emailCustomized?: boolean;
}

function Step2Row({
  pitch, assignment, devTLInterests, qmInterests, onAssign, onRef, highlighted,
  devName, includeUXD, onToggleUXD, onOpenEmail, emailCustomized = false,
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
      {/* Email icon */}
      <TableCell align="center">
        <Tooltip title={emailCustomized ? 'Message customized — click to edit' : 'Compose kickoff email'}>
          <IconButton
            size="small"
            sx={{ p: 0.5 }}
            onClick={e => onOpenEmail(e.currentTarget, pitch.id)}
          >
            {emailCustomized
              ? <MailIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
              : <MailOutlineIcon sx={{ fontSize: '1rem' }} />
            }
          </IconButton>
        </Tooltip>
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
      sx={{ fontSize: '0.75rem', width: '100%' }}
      renderValue={val => {
        if (!val) return <Typography variant="caption" color="text.disabled">Assign…</Typography>;
        const selectedPerson = options.find(o => o.personName === (val as string));
        const level = (selectedPerson?.interestByPitchId[pitchId] ?? null) as (1 | 2 | 3 | 4 | null);
        const noData = selectedPerson ? !(pitchId in selectedPerson.interestByPitchId) : false;
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
