/**
 * API service for TL Allocation data.
 * Talks to the same GAS backend as api.ts but via the new allocation-specific routes.
 */
import type { AllocationConfig, Phase2Interest } from '../types/allocationTypes';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL) || '';

export type AllocationVoteData = {
  teamVotes: Record<string, 0 | 1 | 2 | 3 | 4>;
  tlVotes: Record<string, 0 | 1 | 2 | 3 | 4>;
  teamPriorityScore: number;
  tlPriorityScore: number;
  devInterest: Record<string, number | null>;
};

export type AllocationVoteResponse = {
  pitchData: Record<string, AllocationVoteData>;
  /** Names of team members fully unavailable next quarter (excluded from every pool). */
  unavailableNames: string[];
  /**
   * Devs who said no to "available for dev assignment" but yes to "available
   * as PQA1 reviewer" — excluded from Stage 2 dev assignment but kept in the
   * Stage 4 PQA1 pool. Optional: omitted by older backends → treated as empty.
   */
  unavailableForDevNames?: string[];
  /**
   * Devs who said yes to dev assignment but no to PQA1 — included in Stage 2
   * dev pool, excluded from Stage 4 PQA1 pool. Optional.
   */
  unavailableForPqa1Names?: string[];
  /**
   * Merged per-person capacity tiers + comments (voter answers overlaid with
   * TL overrides). The frontend pipes this into AllocationConfig.capacityByName
   * for the algorithms and Stage 2/4 sidebar tooltips. Optional — older
   * backends omit it and the frontend treats missing entries as `'avg'`.
   */
  capacityByName?: Record<string, import('../types/allocationTypes').PersonCapacity>;
};

/** Payload for the new TL-override endpoint (set-capacity-override). */
export type CapacityOverridePayload = {
  /** Person whose capacity is being overridden. */
  name: string;
  /** Devs only. */
  devCapacity?: 'above-avg' | 'avg' | 'fewer' | 'none';
  /** Devs only. */
  pqa1Capacity?: 'above-avg' | 'avg' | 'fewer' | 'none';
  /** QM / dev TL only. */
  capacity?: 'above-avg' | 'avg' | 'fewer' | 'none';
  /** Required when any capacity is non-`'avg'`. */
  comment?: string;
  /** Name of the TL recording the override (for audit). */
  setBy: string;
};

async function gasGet<T>(route: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}?route=${route}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `GET ${route} failed: ${response.status}`);
  }
  return response.json();
}

// GAS redirects POST through script.googleusercontent.com which blocks CORS reads.
// Use no-cors so the request goes through (GAS executes) even though the response
// is opaque. Callers receive a synthetic success value since we can't read the body.
async function gasPost<T>(route: string, payload: unknown, synthetic: T): Promise<T> {
  await fetch(`${API_BASE_URL}?route=${route}`, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return synthetic;
}

/**
 * Fetch the TL allocation config from Script Properties.
 * Returns null if the config has not been set up yet in the GAS backend.
 */
export async function fetchAllocationConfig(): Promise<AllocationConfig | null> {
  if (!API_BASE_URL) return null;
  try {
    const data = await gasGet<AllocationConfig | { error: string }>('config');
    if ('error' in data) return null;
    const cfg = data as Partial<AllocationConfig>;
    // Reject configs missing the roster arrays — downstream code (auto-assign,
    // derivePhase2Interests, sidebar render) blindly calls .map on them and
    // crashes the tree on a malformed response. Treat as no-config so callers
    // fall back to MOCK_CONFIG instead of breaking.
    if (!Array.isArray(cfg.devNames) || !Array.isArray(cfg.devTLNames) || !Array.isArray(cfg.qmNames)) {
      console.warn('Malformed allocation config from backend (missing roster arrays):', data);
      return null;
    }
    return cfg as AllocationConfig;
  } catch {
    return null;
  }
}

/**
 * Lightweight fetch of just the upcoming-quarter label from the backend's
 * `allocation_config` Script Property. Doesn't require the roster arrays
 * to be present, so it works for App.tsx (which only needs the label for
 * the AvailabilityDialog title and the SettingsMenu row) even when the
 * full allocation config isn't fully set up yet.
 *
 * Returns null when the backend returns no config / no label, or on error.
 */
export async function fetchQuarterLabel(): Promise<string | null> {
  if (!API_BASE_URL) return null;
  try {
    const data = await gasGet<{ quarterLabel?: string; error?: string }>('config');
    if (!data || 'error' in data) return null;
    if (typeof data.quarterLabel === 'string' && data.quarterLabel.trim()) {
      return data.quarterLabel.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Result shape for the get-voter-availability GAS endpoint. Returned with
 * `found: false` when the voter has no row on VOTES (and no override), in
 * which case the AvailabilityDialog should still prompt.
 */
export type VoterAvailability = {
  found: boolean;
  available?: boolean | null;
  availableForPQA1?: boolean | null;
  devCapacity?: 'above-avg' | 'avg' | 'fewer' | 'none' | null;
  pqa1Capacity?: 'above-avg' | 'avg' | 'fewer' | 'none' | null;
  capacity?: 'above-avg' | 'avg' | 'fewer' | 'none' | null;
  availabilityComment?: string;
  /**
   * True when the voter has at least one row with a non-empty interestLevel.
   * Used in Stage 3 to gate the "let late-arriving devs submit interest"
   * affordance — if true, the dev already voted in Stage 1 and shouldn't be
   * re-prompted; if false, they get the interest ranking UI like a TL.
   */
  hasInterestVotes?: boolean;
};

/**
 * Fetch the persisted availability + capacity record for one voter so we
 * can skip the AvailabilityDialog for people who've already submitted.
 * Reads from VOTES (their own answer) overlaid with CAPACITY_OVERRIDES
 * (TL override wins) — the same merge `getAllocationData` performs.
 *
 * Returns `{ found: false }` on missing voter, missing API URL, or error.
 */
export async function fetchVoterAvailability(voterName: string): Promise<VoterAvailability> {
  if (!API_BASE_URL || !voterName) return { found: false };
  try {
    const params = new URLSearchParams({ route: 'get-voter-availability', voterName });
    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
    if (!response.ok) return { found: false };
    return await response.json();
  } catch {
    return { found: false };
  }
}

/**
 * Polling state stored in backend Script Properties — overrides the
 * build-time VITE_POLLING_* env vars when present so admins can advance
 * stages / quarters without redeploying. Empty string means "not set,
 * use env fallback".
 */
export type PollingState = { stage: string; cycleId: string };

/**
 * Fetch the backend polling state. Returns null on error / no API URL so
 * callers can fall back to the env var.
 */
export async function fetchPollingState(): Promise<PollingState | null> {
  if (!API_BASE_URL) return null;
  try {
    return await gasGet<PollingState>('get-polling-state');
  } catch {
    return null;
  }
}

/**
 * Update the backend polling state. Gated server-side to setBy='Chase Grey'.
 * Pass empty/undefined for fields you don't want to change. Returns the
 * server's view after the update so callers can confirm.
 */
export async function setPollingStateRemote(payload: {
  stage?: string;
  cycleId?: string;
  setBy: string;
}): Promise<PollingState> {
  if (!API_BASE_URL) throw new Error('API URL not configured');
  return gasPost('set-polling-state', payload, {
    stage: payload.stage ?? '',
    cycleId: payload.cycleId ?? '',
  });
}

/**
 * Fetch per-pitch, per-voter priority tier data aggregated from the VOTES sheet,
 * plus the list of team members who indicated they are NOT available next quarter.
 * Returns empty data on error so callers can fall back gracefully.
 */
export async function fetchAllocationVoteData(): Promise<AllocationVoteResponse> {
  if (!API_BASE_URL) return { pitchData: {}, unavailableNames: [] };
  try {
    const raw = await gasGet<AllocationVoteResponse | Record<string, AllocationVoteData>>('allocation-data');
    // Handle old backend response shape ({ [pitchId]: AllocationVoteData }) gracefully.
    if ('pitchData' in raw && typeof raw.pitchData === 'object') {
      return raw as AllocationVoteResponse;
    }
    return { pitchData: raw as Record<string, AllocationVoteData>, unavailableNames: [] };
  } catch {
    return { pitchData: {}, unavailableNames: [] };
  }
}

/**
 * Fetch Phase 2 interest votes (dev TL / QM interest ratings for selected projects).
 * Returns [] if the INTEREST_VOTES sheet doesn't exist yet or on error.
 */
export async function fetchPhase2Interests(): Promise<Phase2Interest[]> {
  if (!API_BASE_URL) return [];
  try {
    return await gasGet<Phase2Interest[]>('phase2-interests');
  } catch {
    return [];
  }
}

export type SubmitInterestVotePayload = {
  voterName: string;
  role: 'dev TL' | 'QM';
  interests: Array<{ pitch_id: string; level: number | null }>;
};

/**
 * Submit Phase 2 interest votes for a dev TL or QM.
 * Returns the number of rows saved.
 */
export async function submitPhase2InterestVote(payload: SubmitInterestVotePayload): Promise<number> {
  if (!API_BASE_URL) throw new Error('API URL not configured');
  const data = await gasPost('interest-vote', payload, { saved: payload.interests.length });
  return data.saved ?? 0;
}

export async function sendKickoffEmail(payload: {
  subject: string;
  recipients: string[];
  htmlBody: string;
  senderName?: string;
}): Promise<number> {
  if (!API_BASE_URL) throw new Error('API URL not configured');
  const response = await fetch(`${API_BASE_URL}?route=send-kickoff-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `send-kickoff-email failed: ${response.status}`);
  }
  const data = await response.json();
  return data.sent ?? 0;
}

export type EmcAssignment = {
  pitchId: string;
  pitchTitle: string;
  assignedDev: string | null;
  devTL: string | null;
  qm: string | null;
  pqa1?: string | null;
};

export async function createEmcRecords(payload: {
  assignments: EmcAssignment[];
}): Promise<{ sent: number; skipped: string[] }> {
  if (!API_BASE_URL) throw new Error('API URL not configured');
  return gasPost('create-emr-records', payload, { sent: payload.assignments.length, skipped: [] });
}

/**
 * Persist a TL-driven capacity override for one person. The backend merges this
 * with the voter's own answer (TL override wins) and the next allocation-data
 * fetch returns the updated tier in `capacityByName`.
 *
 * Uses the same no-cors pattern as the other write endpoints — GAS executes the
 * request even though we can't read the response body, so we return a synthetic
 * success value.
 */
export async function setCapacityOverride(payload: CapacityOverridePayload): Promise<{ saved: number }> {
  if (!API_BASE_URL) throw new Error('API URL not configured');
  return gasPost('set-capacity-override', payload, { saved: 1 });
}
