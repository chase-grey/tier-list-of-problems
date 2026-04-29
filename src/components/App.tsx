import React, { useEffect, memo, useState, useMemo, useRef } from 'react';
import { ThemeProvider, CssBaseline, Box, Typography, Tabs, Tab, Snackbar, Alert } from '@mui/material';
import { darkTheme, lightTheme } from '../theme';
import { NameGate } from './NameGate/NameGate';
import { TopBar } from './TopBar/TopBar';
import KanbanContainer from './VotingBoard/KanbanContainer';
import AvailabilityDialog from './AvailabilityDialog/AvailabilityDialog';
import InterestRanking from './InterestRanking/InterestRanking';
import SnackbarProvider from './SnackbarProvider';
import { useSnackbar } from '../hooks/useSnackbar';
import HelpDialog from './HelpDialog/HelpDialog';
import ConfirmationDialog from './ConfirmationDialog/ConfirmationDialog';
import FeedbackDialog from './FeedbackDialog/FeedbackDialog';
import type { FeedbackData } from './FeedbackDialog/FeedbackDialog';
import DevAutoPopulate from './DevAutoPopulate';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { submitVotes, submitFeedback, fetchPlanStatuses, convertVotesToApiFormat } from '../services/api';
import { isDevelopmentMode } from '../utils/testUtils';
import type { DropResult } from '@hello-pangea/dnd';
import type { AppState, Pitch, Tier, InterestLevel } from '../types/models';
import { isContributorRole, canRankInterestStage1, canRankInterestStage2 } from '../types/models';
import { useVoteManagement } from '../hooks/useVoteManagement';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { getPollingCycleId, isStage2, isTLAllocationStage, getPollingStage } from '../utils/config';
import { buildPollingKey, cleanupPollingStorageOnCycleChange, getEffectivePollingCycleId } from '../utils/pollingStorage';
import { getInterestLevelLabel } from '../utils/voteActions';
import { fetchPitches } from '../services/api';
import TLAllocationView, { type TLAllocationViewHandle } from './TLAllocation/TLAllocationView';
import CategoryBandwidthBar from './VotingBoard/CategoryBandwidthBar';
import type { CategoryBandwidthConfig } from './VotingBoard/CategoryBandwidthBar';
import { LoadingScreen, type LoadingStep } from './LoadingScreen/LoadingScreen';

const CATEGORIES = [
  'Support AI Charting',
  'Create and Improve Tools and Framework',
  'Mobile Feature Parity',
  'Address Technical Debt',
] as const;

// Access keys for category tabs (Shift+Alt+letter on Windows)
const CAT_KEYS: Record<string, string> = {
  'Support AI Charting': 's',
  'Create and Improve Tools and Framework': 'c',
  'Mobile Feature Parity': 'm',
  'Address Technical Debt': 'a',
};

// Target time allocation per category for this quarter.
// Shown in the voting section so voters can align their priorities.
const CATEGORY_BANDWIDTH_CONFIG: CategoryBandwidthConfig = {
  bandwidth: {
    'Support AI Charting': 50,
    'Create and Improve Tools and Framework': 30,
    'Mobile Feature Parity': 10,
    'Address Technical Debt': 10,
  },
  colors: {
    'Support AI Charting': '#1565c0',
    'Create and Improve Tools and Framework': '#2e7d32',
    'Mobile Feature Parity': '#e65100',
    'Address Technical Debt': '#6a1b9a',
  },
};

// Initial state
const initialState: AppState = {
  voterName: null,
  voterRole: null,
  available: null,
  stage: 'priority',
  votes: {},
};

/**
 * Main App component
 */
const AppContent: React.FC<{ themeMode: 'dark' | 'light'; onToggleTheme: () => void }> = ({ themeMode, onToggleTheme }) => {
  // State for selected priority category tab
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const isTLStage = isTLAllocationStage();
  const pollingStage = getPollingStage();
  // tl-1 = Allocation 1 only (step 0), tl-2 = Allocation 2 only (step 1)
  const allocationStep: 0 | 1 = pollingStage === 'tl-2' ? 1 : 0;
  const tlViewRef = useRef<TLAllocationViewHandle>(null);
  const [allocationSaveState, setAllocationSaveState] = useState<'idle' | 'waiting' | 'saving' | 'done'>('idle');
  const [allocationShowResults, setAllocationShowResults] = useState(false);
  const [allocationHasResults, setAllocationHasResults] = useState(false);

  const handleAllocationFinish = async () => {
    const MAX_RETRIES = 6;
    const RETRY_DELAY_MS = 5000;
    setAllocationSaveState('saving');
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await tlViewRef.current?.triggerFinalize();
        setAllocationSaveState('done');
        return;
      } catch (err: any) {
        const isServerBusy = (err?.message ?? '').toLowerCase().includes('server busy');
        if (isServerBusy && attempt < MAX_RETRIES) {
          setAllocationSaveState('waiting');
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          setAllocationSaveState('saving');
        } else {
          setAllocationSaveState('idle');
          return;
        }
      }
    }
    setAllocationSaveState('idle');
  };
  const [submitState, setSubmitState] = useState<'idle' | 'submitted' | 'changed'>('idle');

  // Check if we're in Stage 2 mode (configured via environment variable)
  const appStage2Mode = isStage2();

  // Loading step state — one entry per async init task
  const [pitchStepStatus, setPitchStepStatus] = useState<LoadingStep['status']>('loading');
  const [pitchStepError, setPitchStepError] = useState<string | undefined>(undefined);
  const [loadedPitches, setLoadedPitches] = useState<Pitch[] | null>(null);

  const [planStepStatus, setPlanStepStatus] = useState<LoadingStep['status']>(appStage2Mode ? 'pending' : 'done');
  const [planStepError, setPlanStepError] = useState<string | undefined>(undefined);
  const [planStatuses, setPlanStatuses] = useState<Record<string, string> | null>(null);

  const loadingSteps: LoadingStep[] = [
    { label: 'Loading pitches', status: pitchStepStatus, error: pitchStepError },
    ...(appStage2Mode ? [{ label: 'Loading plan assignments', status: planStepStatus, error: planStepError }] : []),
  ];

  const isLoading = loadingSteps.some(s => s.status === 'loading' || s.status === 'pending');
  const hasLoadError = loadingSteps.some(s => s.status === 'error');

  const runLoad = () => {
    setPitchStepStatus('loading');
    setPitchStepError(undefined);
    if (appStage2Mode) {
      setPlanStepStatus('pending');
      setPlanStepError(undefined);
      setPlanStatuses(null);
    }

    fetchPitches()
      .then(data => {
        setLoadedPitches(data);
        setPitchStepStatus('done');
        if (appStage2Mode) {
          setPlanStepStatus('loading');
          fetchPlanStatuses()
            .then(statuses => {
              setPlanStatuses(statuses);
              setPlanStepStatus('done');
            })
            .catch(err => {
              setPlanStatuses({});
              setPlanStepStatus('error');
              setPlanStepError(err?.message || 'Failed to load plan assignments');
            });
        }
      })
      .catch(err => {
        setPitchStepStatus('error');
        setPitchStepError(err?.message || 'Failed to load pitches');
      });
  };

  useEffect(() => { runLoad(); }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // State to control help dialog
  const [showHelp, setShowHelp] = useState(true); // Show help dialog by default
  // State to track if initial help dialog was shown
  const [initialHelpShown, setInitialHelpShown] = useState(false);
  // State to control reset confirmation dialog
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  // State to control feedback dialog
  const [showFeedback, setShowFeedback] = useState(false);

  // Pitches from the backend - in Stage 2, filter to only pitches marked 'selected' in PLAN sheet
  // useMemo ensures stable reference when loadedPitches is null (prevents render loop)
  const allPitches = useMemo(() => loadedPitches ?? [], [loadedPitches]);
  const pitches = useMemo(() => {
    if (appStage2Mode) {
      if (planStatuses === null) return []; // Still fetching plan
      if (Object.keys(planStatuses).length === 0) return allPitches; // No plan yet, show all
      return allPitches.filter(p => planStatuses[p.id] === 'selected');
    }
    return allPitches;
  }, [appStage2Mode, allPitches, planStatuses]);
  
  const TOTAL = pitches.length;

  const pollingCycleId = useMemo(() => getEffectivePollingCycleId(getPollingCycleId(), pitches), [pitches]);

  useEffect(() => {
    cleanupPollingStorageOnCycleChange(pollingCycleId);
  }, [pollingCycleId]);

  const appStateStorageKey = buildPollingKey(pollingCycleId, 'appState');
  const voterNameStorageKey = buildPollingKey(pollingCycleId, 'voterName');
  const voterRoleStorageKey = buildPollingKey(pollingCycleId, 'voterRole');
  
  // Use localStorage for persistence with a safety wrapper
  const [savedState, setSavedState] = (() => {
    try {
      // Try to use the normal localStorage hook
      return useLocalStorage<AppState>(appStateStorageKey, initialState);
    } catch (error) {
      // If localStorage fails completely, use a fallback implementation
      console.error('LocalStorage error, using initial state:', error);
      // Return a dummy state management function that doesn't persist
      const dummySetState = (_value: AppState | ((val: AppState) => AppState)): void => {
        console.log('LocalStorage disabled, state changes will not persist');
      };
      return [initialState, dummySetState] as [AppState, typeof dummySetState];
    }
  })();
  
  // Always ensure we have a properly formed state object
  // In Stage 2 mode, force users directly to interest stage (priority is locked)
  const completeState = {
    ...initialState,
    ...savedState,
    // In Stage 2 mode, always use 'interest' stage; in Stage 1, use 'priority'
    stage: appStage2Mode ? 'interest' as const : 'priority' as const,
    // Ensure voterRole exists if voterName exists
    voterRole: savedState.voterRole || (savedState.voterName ? null : initialState.voterRole)
  };
  
  // Use our centralized vote management hook
  const {
    state,
    // dispatch is not used directly
    setTier,
    setInterest,
    setStage,
    resetAll,
    syncPitches,
    setNameAndRole,

    setAvailability,
    getCompletionStats
  } = useVoteManagement(completeState);

  // Persist state to localStorage on every change so refreshes don't lose progress.
  useEffect(() => {
    try {
      window.localStorage.setItem(appStateStorageKey, JSON.stringify(state));
    } catch { /* ignore quota/security errors */ }
  }, [state, appStateStorageKey]);

  // Only pass pitches visible on screen to the keyboard nav hook.
  // In priority stage the board only renders the selected category — passing all
  // pitches caused arrow/n navigation to land on invisible cards from other categories.
  const keyboardNavPitches = useMemo(
    () => state.stage === 'priority' ? pitches.filter(p => p.category === selectedCategory) : pitches,
    [state.stage, pitches, selectedCategory]
  );

  const handleSendToBottomPriorityUnsorted = (pitchId: string) => {
    const unsortedPitchIds = pitches
      .filter(p => !state.votes[p.id]?.tier)
      .map(p => p.id);

    const maxTimestamp = unsortedPitchIds.reduce((max, id) => {
      const ts = state.votes[id]?.timestamp ?? 0;
      return ts > max ? ts : max;
    }, 0);

    const now = new Date().getTime();
    const newTimestamp = Math.max(now, maxTimestamp + 1);
    setTier(pitchId, null, newTimestamp);
  };

  const handleClearTierToTop = (pitchId: string) => {
    const visibleUnsorted = pitches.filter(
      p => p.category === selectedCategory && !state.votes[p.id]?.tier
    );
    const minTs = visibleUnsorted.reduce((min, p) => {
      const ts = state.votes[p.id]?.timestamp ?? Infinity;
      return ts < min ? ts : min;
    }, Infinity);
    setTier(pitchId, null, minTs === Infinity ? 1 : Math.max(1, minTs - 1));
  };

  const handleClearInterestToTop = (pitchId: string) => {
    const unranked = pitches.filter(p => !state.votes[p.id]?.interestLevel);
    const minTs = unranked.reduce((min, p) => {
      const ts = state.votes[p.id]?.timestamp ?? Infinity;
      return ts < min ? ts : min;
    }, Infinity);
    setInterest(pitchId, null, minTs === Infinity ? 1 : Math.max(1, minTs - 1));
  };

  // Keyboard navigation for voting board
  const { focusedPitchId, setFocusedPitchId } = useKeyboardNav({
    pitches: keyboardNavPitches,
    votes: state.votes,
    stage: state.stage,
    isActive: !isTLStage && !showHelp && !showResetConfirmation,
    setTier: (id, tier) => { setTier(id, tier); markVoteChanged(); },
    clearTier: (id) => { setTier(id, null); markVoteChanged(); },
    clearTierToTop: handleClearTierToTop,
    setInterest: (id, level) => { setInterest(id, level); markVoteChanged(); },
    clearInterest: (id) => { setInterest(id, null); markVoteChanged(); },
    clearInterestToTop: handleClearInterestToTop,
    sendToBottom: handleSendToBottomPriorityUnsorted,
    openHelp: () => setShowHelp(true),
  });

  // Clear keyboard focus when the visible category changes so there's no phantom selection
  useEffect(() => {
    setFocusedPitchId(null);
  }, [selectedCategory, setFocusedPitchId]);

  // [ / ] — cycle category tabs (priority stage only, when keyboard nav is active)
  useEffect(() => {
    if (isTLStage || state.stage !== 'priority') return;
    const handle = (e: KeyboardEvent) => {
      if (showHelp || showResetConfirmation) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).getAttribute('contenteditable') === 'true') return;
      if (e.key === ']') {
        setSelectedCategory(prev => {
          const idx = CATEGORIES.indexOf(prev as typeof CATEGORIES[number]);
          return idx < CATEGORIES.length - 1 ? CATEGORIES[idx + 1] : prev;
        });
      } else if (e.key === '[') {
        setSelectedCategory(prev => {
          const idx = CATEGORIES.indexOf(prev as typeof CATEGORIES[number]);
          return idx > 0 ? CATEGORIES[idx - 1] : prev;
        });
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isTLStage, state.stage, showHelp, showResetConfirmation]);

  // Get completion stats using our utility function
  const stats = getCompletionStats(pitches);
  const {
    rankCount,
    interestCount,
    // minimumRequired is not used directly
    isPriorityComplete,
    isInterestComplete
  } = stats;

  // Check if the user has a role that can access interest ranking
  // Stage 1: devs can rank interest (after priority)
  // Stage 2: QM and dev TL can rank interest on subset of pitches
  const canAccessInterestStage = state.voterRole !== null &&
    state.available === true &&
    (appStage2Mode
      ? canRankInterestStage2(state.voterRole)  // Stage 2: QM and dev TL only
      : canRankInterestStage1(state.voterRole)  // Stage 1: devs only
    );

  // Check if the user needs to rank interest (same logic as canAccessInterestStage, kept for backward compatibility)
  const needsInterestRanking = canAccessInterestStage;

  // Calculate completion status based on role and availability (now only requires 50%)
  // In Stage 2 mode, priority stage is considered complete (locked from Stage 1)
  const priorityStageComplete = appStage2Mode ? true : isPriorityComplete;

  // Access snackbar (must precede handleStageChange which uses it)
  const { showSnackbar } = useSnackbar();

  // Toggle between priority and interest stages
  const handleStageChange = () => {
    console.log('[DEBUG] Starting stage transition', {
      currentStage: state.stage,
      voterRole: state.voterRole,
      canAccessInterestStage,
      priorityStageComplete,
      available: state.available,
      votesCount: Object.keys(state.votes || {}).length,
      pitchesCount: Array.isArray(pitches) ? pitches.length : 0,
      appStage2Mode
    });

    // Toggle between stages
    const newStage = state.stage === 'priority' ? 'interest' : 'priority';

    // In Stage 2 mode, prevent going back to priority stage (it's locked)
    if (appStage2Mode && newStage === 'priority') {
      showSnackbar('Priority ranking is locked. Stage 2 is for interest ranking only.', 'info');
      return;
    }

    // Only allow switching to interest stage if conditions are met
    if (newStage === 'interest' && (!canAccessInterestStage || !priorityStageComplete)) {
      console.warn('[DEBUG] Interest stage transition blocked', {
        canAccessInterestStage,
        priorityStageComplete,
        voterRole: state.voterRole,
        available: state.available
      });

      // Show appropriate error message
      if (!canAccessInterestStage) {
        const roleMsg = appStage2Mode
          ? 'Only QM and dev TL roles who are available can rank interest in Stage 2'
          : 'Only devs who are available can rank interest';
        showSnackbar(roleMsg, 'error');
      } else {
        showSnackbar('You must complete priority rankings first', 'error');
      }
      return;
    }

    setStage(newStage);
  };

  // Shift+Alt+letter — jump directly to a category tab or the interest tab.
  useEffect(() => {
    if (isTLStage) return;
    const handle = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
      if (showHelp || showResetConfirmation) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).getAttribute('contenteditable') === 'true') return;

      const letter = e.key.toLowerCase();

      // Category tabs (priority stage only)
      if (state.stage === 'priority') {
        const entry = Object.entries(CAT_KEYS).find(([, k]) => k === letter);
        if (entry) {
          e.preventDefault();
          setSelectedCategory(entry[0]);
          setFocusedPitchId(null);
          return;
        }
      }

      // Interest tab
      if (letter === 'i' && canAccessInterestStage && priorityStageComplete && state.stage === 'priority') {
        e.preventDefault();
        handleStageChange();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isTLStage, state.stage, showHelp, showResetConfirmation, canAccessInterestStage, priorityStageComplete, handleStageChange, setFocusedPitchId]);

  // Sync reducer state with localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSavedState(state);
    }, 250);
    
    return () => clearTimeout(timer);
  }, [state, setSavedState]);

  // Additionally store the voter name in a separate key as per spec ('polling.voterName')
  useEffect(() => {
    if (state.voterName) {
      localStorage.setItem(voterNameStorageKey, state.voterName);
      if (state.voterRole) {
        localStorage.setItem(voterRoleStorageKey, state.voterRole);
      }
    }
  }, [state.voterName, state.voterRole, voterNameStorageKey, voterRoleStorageKey]);
  
  // Sync pitches with votes once pitches have loaded.
  // Guard prevents syncPitches([]) from firing on first render before pitches arrive,
  // which would wipe state.votes and overwrite saved localStorage data with empty votes.
  // In Stage 2 mode we also wait for planStatuses — without it, pitches = [] and
  // dispatching RESET_FROM_PITCHES([]) would erase all interest votes on refresh.
  useEffect(() => {
    if (loadedPitches === null) return;
    if (appStage2Mode && planStatuses === null) return;
    const pitchIds = pitches.map(pitch => pitch.id);
    syncPitches(pitchIds);
  }, [pitches, loadedPitches, appStage2Mode, planStatuses]);
  
  // Check if export is enabled based on role and stage
  const isExportEnabled = priorityStageComplete && 
    // For users who don't need to rank interest, enable export immediately
    // For users who need to rank interest, they need 50% completion and must visit the interest page
    (!needsInterestRanking || (needsInterestRanking && state.stage === 'interest' && isInterestComplete));
  
  // Handle name and role submission
  const handleNameSubmit = (name: string, role: string) => {
    setNameAndRole(name, role);
    showSnackbar(`Welcome, ${name}!`, 'success');
    
    // If this is a non-contributor role, automatically set available to false
    // This ensures they skip the availability dialog and can't access interest section
    if (!isContributorRole(role)) {
      // Set availability to false for non-contributors
      setAvailability(false);
    }
  };

  // Handle name + role update from settings (role is derived from the team roster)
  const handleUpdateNameAndRole = (name: string, role: string) => {
    const wasContributor = state.voterRole && isContributorRole(state.voterRole);
    const isNowContributor = isContributorRole(role);

    setNameAndRole(name, role);

    if (wasContributor && !isNowContributor) {
      setAvailability(false);
      if (state.stage === 'interest') setStage('priority');
    }

    showSnackbar(`Name updated to ${name}`, 'success');
  };

  // Handle availability update from settings
  const handleUpdateAvailability = (available: boolean) => {
    const wasAvailable = state.available === true;
    
    setAvailability(available);
    
    // If switching from available to not available, switch back to priority stage
    if (wasAvailable && !available && state.stage === 'interest') {
      setStage('priority');
      showSnackbar('Availability updated. Switched back to priority ranking.', 'info');
    } else {
      showSnackbar(`Availability ${available ? 'confirmed' : 'updated - priority ranking only'}`, 'success');
    }
  };
  
  // Handle drag end for priority stage
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId, source } = result;

    // Drop outside valid area
    if (!destination) return;

    // No-op drop
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const destId = destination.droppableId;

    const getOrderedPitchIdsForPriorityColumn = (columnId: string): string[] => {
      // Only include pitches from the currently visible category — the column renders
      // a single category at a time, so destination.index is relative to that subset.
      // Using all pitches here would mismatch the DnD index and place cards at the wrong position.
      const safePitches = Array.isArray(pitches)
        ? pitches.filter(p => p.category === selectedCategory)
        : [];

      const filtered = safePitches.filter(pitch => {
        if (columnId === 'unsorted') {
          return !state.votes[pitch.id]?.tier;
        }

        const tier = parseInt(columnId.replace('tier-', '')) as Tier;
        return state.votes[pitch.id]?.tier === tier;
      });

      return filtered
        .sort((a, b) => {
          const timestampA = state.votes[a.id]?.timestamp || 0;
          const timestampB = state.votes[b.id]?.timestamp || 0;
          if (timestampA !== timestampB) return timestampA - timestampB;
          return a.id.localeCompare(b.id);
        })
        .map(p => p.id);
    };

    const computeInsertionTimestamp = (
      prevTimestamp: number | undefined,
      nextTimestamp: number | undefined
    ): number => {
      const now = new Date().getTime();

      if (prevTimestamp === undefined && nextTimestamp === undefined) return now;
      if (prevTimestamp === undefined) return (nextTimestamp ?? now) - 1;
      if (nextTimestamp === undefined) return (prevTimestamp ?? now) + 1;

      if (prevTimestamp >= nextTimestamp) return prevTimestamp + 1;

      const mid = prevTimestamp + (nextTimestamp - prevTimestamp) / 2;
      return Number.isFinite(mid) ? mid : now;
    };

    const destTier: Tier = destId === 'unsorted' ? null : (parseInt(destId.replace('tier-', '')) as Tier);

    const destOrderedIds = getOrderedPitchIdsForPriorityColumn(destId).filter(id => id !== draggableId);
    const insertIndex = Math.min(destination.index, destOrderedIds.length);

    const prevId = insertIndex > 0 ? destOrderedIds[insertIndex - 1] : undefined;
    const nextId = insertIndex < destOrderedIds.length ? destOrderedIds[insertIndex] : undefined;

    const prevTimestamp = prevId ? state.votes[prevId]?.timestamp : undefined;
    const nextTimestamp = nextId ? state.votes[nextId]?.timestamp : undefined;
    const newTimestamp = computeInsertionTimestamp(prevTimestamp, nextTimestamp);

    setTier(draggableId, destTier, newTimestamp);
    markVoteChanged();

    // Only announce when the column changes (avoid noisy snackbars for reordering)
    if (source.droppableId !== destination.droppableId) {
      if (destId === 'unsorted') {
        showSnackbar('Pitch moved to unsorted', 'info');
      } else {
        showSnackbar(`Pitch moved to Tier ${destTier}`, 'info');
      }
    }
  };

  // Handle interest level change
  const handleInterestChange = (pitchId: string, interestLevel: InterestLevel, timestamp?: number) => {
    console.log(`[DEBUG] Setting interest level ${interestLevel} for pitch ${pitchId}`);
    
    try {
      // Find the pitch title for better logging
      const pitch = pitches.find(p => p.id === pitchId);
      const pitchTitle = pitch ? pitch.title.substring(0, 20) : 'unknown';
      
      console.log(`[DEBUG] Interest change for "${pitchTitle}..."`, {
        pitchId,
        interestLevel,
        previousLevel: state.votes[pitchId]?.interestLevel,
        previousTier: state.votes[pitchId]?.tier
      });
      
      const previousLevel = state.votes[pitchId]?.interestLevel;

      // Set the interest level in state
      setInterest(pitchId, interestLevel, timestamp);
      markVoteChanged();

      // Avoid noisy snackbars when the user is only reordering within a column
      if (previousLevel === interestLevel) {
        return;
      }

      if (interestLevel === null) {
        showSnackbar('Pitch moved to unsorted', 'info');
      } else {
        showSnackbar(`Interest level set to ${getInterestLevelLabel(interestLevel)}`, 'info');
      }
    } catch (error) {
      console.error('[DEBUG] Error handling interest change:', error);
    }
  };

  // Handle availability setting
  const handleAvailabilitySet = (available: boolean) => {
    setAvailability(available);
    showSnackbar(`Availability ${available ? 'confirmed' : 'noted - thanks for letting us know'}`, 'success');
  };

  // Handle showing help dialog
  const handleHelpClick = () => {
    setShowHelp(true);
  };
  
  // Handle closing the initial help dialog
  const handleInitialHelpClose = () => {
    setShowHelp(false);
    setInitialHelpShown(true);
  };
  
  // Handle reset button click
  const handleResetClick = () => {
    setShowResetConfirmation(true);
  };
  
  // Handle reset confirmation
  const handleResetConfirm = () => {
    // Reset all votes and clear voter name
    resetAll();
    // Close confirmation dialog
    setShowResetConfirmation(false);
    // Reset help dialog tracking to show instructions again
    setInitialHelpShown(false);
    setShowHelp(true);
    // Show success message
    showSnackbar('All data has been reset. Please enter your name to continue.', 'success');
  };

  const submitCurrentVotes = async () => {
    if (!state.voterName || !state.voterRole) return;
    setIsSubmitting(true);
    try {
      const pitchTitleMap = Object.fromEntries(pitches.map(p => [p.id, p.title]));
      const apiVotes = convertVotesToApiFormat(state.votes, pitchTitleMap);
      await submitVotes({ voterName: state.voterName, voterRole: state.voterRole ?? undefined, votes: apiVotes });
      showSnackbar('Your votes have been submitted successfully!', 'success');
      setSubmitState('submitted');
    } catch (err: any) {
      showSnackbar(err?.message || 'Submission failed — please try again', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markVoteChanged = () => {
    setSubmitState(prev => prev === 'submitted' ? 'changed' : prev);
  };

  // Handle finish process
  const handleFinish = () => {
    if (state.voterName && isExportEnabled) {
      setShowFeedback(true);
    } else {
      showSnackbar('Complete at least 50% of rankings first', 'error');
    }
  };

  // Handle feedback submission
  const handleFeedbackSubmit = (feedbackData: FeedbackData) => {
    setShowFeedback(false);
    submitCurrentVotes();
    if (feedbackData.rating != null || feedbackData.comments) {
      submitFeedback({
        voterName: state.voterName || '',
        voterRole: state.voterRole || '',
        rating: feedbackData.rating,
        comments: feedbackData.comments,
      }).catch(err => console.error('Feedback submission failed:', err));
    }
  };

  // Handle feedback dialog close (skip feedback, still submit votes)
  const handleFeedbackClose = () => {
    setShowFeedback(false);
    submitCurrentVotes();
  };
  
  // Dev only: Handle auto-populate
  const handleAutoPopulate = (name: string, votes: Record<string, any>, complete?: boolean) => {
    // Set the name if not already set
    if (!state.voterName) {
      // Default to 'dev' role for auto-populate
      setNameAndRole(name, 'dev');
    }
    
    // Apply each vote
    Object.entries(votes).forEach(([pitchId, vote]) => {
      // Set tier if present
      if (vote.tier) {
        setTier(pitchId, vote.tier);
      }
    });
    
    // Show success message
    showSnackbar(`Auto-populated with ${name} and ${complete ? 'complete' : 'partial'} votes!`, 'success');
  };
  
  // Show availability dialog for specific roles after name is set
  // Only ask QMs, devs, QM TLs, and dev TLs
  const showAvailabilityDialog = state.voterName !== null && 
    state.voterRole !== null &&
    isContributorRole(state.voterRole) && 
    state.available === null;

  if (isLoading || hasLoadError) {
    return (
      <LoadingScreen
        steps={loadingSteps}
        onRetry={hasLoadError ? runLoad : undefined}
      />
    );
  }

  return (
    <>
      <NameGate
        onNameSubmit={handleNameSubmit}
        open={!state.voterName && initialHelpShown}
      />

      <AvailabilityDialog 
        open={showAvailabilityDialog}
        onAvailabilitySet={handleAvailabilitySet}
      />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TopBar
          voterName={state.voterName}
          voterRole={state.voterRole}
          available={state.available}
          totalPitchCount={TOTAL}
          rankCount={rankCount}
          interestCount={interestCount}
          onFinish={handleFinish}
          isExportEnabled={isExportEnabled}
          onHelpClick={handleHelpClick}
          onResetClick={handleResetClick}
          stage={state.stage}
          onNextStage={handleStageChange}
          canAccessInterestStage={canAccessInterestStage}
          priorityStageComplete={priorityStageComplete}
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
          onUpdateNameAndRole={handleUpdateNameAndRole}
          onUpdateAvailability={handleUpdateAvailability}
          appStage2Mode={appStage2Mode}
          allocationMode={isTLStage}
          allocationStep={allocationStep}
          onAllocationFinish={isTLStage && state.voterRole === 'dev TL' ? handleAllocationFinish : undefined}
          allocationSaveState={allocationSaveState}
          allocationShowResults={allocationShowResults}
          allocationHasResults={allocationHasResults}
          onAllocationViewSummary={() => setAllocationShowResults(true)}
          onAllocationBackToEdit={() => setAllocationShowResults(false)}
          votingLoading={isSubmitting}
          submitState={submitState}
        />
        
        <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden', p: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* TL Allocation stage: dev TLs see the allocation view; everyone else waits */}
          {isTLStage && state.voterRole === 'dev TL' ? (
            <TLAllocationView
              ref={tlViewRef}
              activeStep={allocationStep}
              showResults={allocationShowResults}
              onShowResultsChange={(v) => { setAllocationShowResults(v); if (v) setAllocationHasResults(true); }}
              onFinalize={() => setAllocationSaveState('done')}
              onAllocationChange={() => setAllocationSaveState('idle')}
              voterName={state.voterName ?? ''}
              voterRole={state.voterRole ?? ''}
            />
          ) : isTLStage ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2, p: 4 }}>
              <Typography variant="h5" color="text.secondary" textAlign="center">
                TL Allocation in Progress
              </Typography>
              <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 500 }}>
                The dev TLs are currently working through the{' '}
                {getPollingStage() === 'tl-1' ? 'first' : 'second'} round of allocation.
                Check back soon for updates on the selected projects for next quarter.
              </Typography>
            </Box>
          ) : appStage2Mode && !canAccessInterestStage ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2, p: 4 }}>
              <Typography variant="h5" color="text.secondary" textAlign="center">
                Stage 2: Interest Ranking
              </Typography>
              <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 500 }}>
                This stage is only available to QM and dev TL roles who have indicated they are available for next quarter.
                {state.voterRole && !canRankInterestStage2(state.voterRole) && (
                  <><br /><br />Your current role ({state.voterRole}) does not have access to this stage.</>
                )}
                {state.voterRole && canRankInterestStage2(state.voterRole) && state.available !== true && (
                  <><br /><br />Please indicate that you are available for next quarter to access interest ranking.</>
                )}
              </Typography>
            </Box>
          ) : state.stage === 'priority' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Tab bar + bandwidth chip share one row */}
              <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Tabs
                  value={selectedCategory}
                  onChange={(_, v: string) => {
                    if (v === '__interest__') {
                      handleStageChange();
                    } else {
                      setSelectedCategory(v);
                    }
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ flex: 1 }}
                >
                  {CATEGORIES.map(cat => (
                    <Tab
                      key={cat}
                      value={cat}
                      label={<span style={{ whiteSpace: 'nowrap' }}><u>{cat[0]}</u>{cat.slice(1)}</span>}
                    />
                  ))}
                  {canAccessInterestStage && (
                    <Tab
                      value="__interest__"
                      label={<span style={{ whiteSpace: 'nowrap' }}><u>I</u>nterest</span>}
                      disabled={!priorityStageComplete}
                    />
                  )}
                </Tabs>
                <CategoryBandwidthBar config={CATEGORY_BANDWIDTH_CONFIG} />
              </Box>
              <KanbanContainer
                pitches={pitches.filter(p => p.category === selectedCategory)}
                votes={state.votes}
                onFocusPitch={setFocusedPitchId}
                onDragEnd={handleDragEnd}
                onSendToBottomUnsorted={handleSendToBottomPriorityUnsorted}
                userRole={state.voterRole}
                focusedPitchId={focusedPitchId}
              />
            </Box>
          ) : (
            // Only render interest ranking if the user has access and priority stage is complete
            canAccessInterestStage && priorityStageComplete ? (
              <InterestRanking
                pitches={Array.isArray(pitches) ? pitches : []}
                votes={state.votes || {}}
                onSetInterest={handleInterestChange}
                userRole={state.voterRole}
                focusedPitchId={focusedPitchId}
                onFocusPitch={setFocusedPitchId}
              />
            ) : (
              // If user somehow got to interest stage but shouldn't be there, show fallback UI
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="h5" color="text.secondary">
                  You need to complete priority ranking before accessing this section.
                </Typography>
              </Box>
            )
          )}

          {/* Help dialog */}
          <HelpDialog
            open={showHelp}
            onClose={handleInitialHelpClose}
            userRole={state.voterRole}
            showInterestStep={canAccessInterestStage}
            stage={state.stage}
            allocationMode={isTLStage}
            allocationStep={allocationStep}
          />
          
          {/* Reset confirmation dialog */}
          <ConfirmationDialog
            open={showResetConfirmation}
            title="Reset Everything"
            message="Are you sure you want to reset everything? This will clear all your votes and allow you to change your name. You'll also see the instructions page again. This action cannot be undone."
            onConfirm={handleResetConfirm}
            onCancel={() => setShowResetConfirmation(false)}
            confirmText="Yes, Reset Everything"
            severity="warning"
          />
          
          {/* Feedback dialog */}
          <FeedbackDialog
            open={showFeedback}
            onClose={handleFeedbackClose}
            onSubmit={handleFeedbackSubmit}
          />

          {/* Development-only Auto-Populate Tool */}
          {isDevelopmentMode() && (
            <DevAutoPopulate 
              onPopulate={handleAutoPopulate}
              pitchIds={pitches.map(pitch => pitch.id)}
            />
          )}
        </Box>
      </Box>
    </>
  );
};

/**
 * Wrapped app with providers
 */
const App: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const handleToggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <AppContent themeMode={themeMode} onToggleTheme={handleToggleTheme} />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default memo(App);
