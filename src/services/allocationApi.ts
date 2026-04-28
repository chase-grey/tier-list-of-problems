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
    return data as AllocationConfig;
  } catch {
    return null;
  }
}

/**
 * Fetch per-pitch, per-voter priority tier data aggregated from the VOTES sheet.
 * Returns a map of pitchId → vote aggregates.
 * Returns {} on error so callers can fall back gracefully.
 */
export async function fetchAllocationVoteData(): Promise<Record<string, AllocationVoteData>> {
  if (!API_BASE_URL) return {};
  try {
    return await gasGet<Record<string, AllocationVoteData>>('allocation-data');
  } catch {
    return {};
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
