/**
 * API Service for Problem-Polling App
 * Handles communication with the Shadow Web / Track Shadow backend
 */
import type { Pitch, Vote } from '../types/models';
import { submitMockVotes } from './mockApi';
import staticPitches from '../assets/pitches.json';

// Get the API URL from environment variables safely
const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL) || '';

const USE_MOCK_API = false;

// In dev, calls go through the Vite middleware at /gas-proxy so we can read
// POST response bodies (GAS's 302 redirect breaks CORS for direct browser POSTs).
// In production (static GitHub Pages build) the middleware doesn't exist, so we
// hit GAS directly — the same pattern allocationApi.ts uses successfully.
const IS_DEV_PROXY = import.meta.env.DEV;
const GAS_BASE = IS_DEV_PROXY ? '/gas-proxy' : API_BASE_URL;
const GAS_PROXY = GAS_BASE;

function getApiUrl(route: string): string {
  return `${GAS_BASE}?route=${route}`;
}

/**
 * POST a JSON payload to a GAS route. In dev we use the Vite proxy and can read
 * the response body (so callers can detect e.g. lock-contention errors). In
 * production builds we go directly to GAS with `no-cors` because the redirect
 * to googleusercontent.com strips CORS headers — the request still executes,
 * but the response is opaque, so callers receive `synthetic` instead.
 */
async function gasJsonPost<T>(route: string, payload: unknown, synthetic: T): Promise<T> {
  if (IS_DEV_PROXY) {
    const response = await fetch(`${GAS_BASE}?route=${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (data && data.error) throw new ApiError(data.error, response.status || 200);
    return (data ?? synthetic) as T;
  }
  await fetch(`${API_BASE_URL}?route=${route}`, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return synthetic;
}

/**
 * Error class for API responses
 */
export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Response format for votes submission
 * @internal Used in API implementations
 */
export type VoteResponse = {
  saved: number;
};

/**
 * Response format for results
 */
export interface ResultItem {
  pitch_id: string;
  mean_tier: number;
}

/**
 * Format for submitting votes
 */
export interface SubmitVotesPayload {
  voterName: string;
  voterRole?: string;
  /**
   * Whether the voter is available to work on projects next quarter.
   * For devs this means "available for dev assignment in Stage 2"; for QM/dev TL
   * it's their single availability flag.
   */
  available?: boolean;
  /**
   * Devs only: whether they're available to be assigned as a PQA1 reviewer
   * in Stage 4. A dev committed to another project may answer false to
   * `available` but true here; a dev on leave answers false to both.
   * Undefined for non-devs.
   */
  availableForPQA1?: boolean;
  /** Devs only — granular capacity tier for Stage 2 dev assignment. */
  devCapacity?: 'above-avg' | 'avg' | 'fewer' | 'none';
  /** Devs only — granular capacity tier for Stage 4 PQA1 assignment. */
  pqa1Capacity?: 'above-avg' | 'avg' | 'fewer' | 'none';
  /** QM / dev TL only — single capacity tier for project assignment. */
  capacity?: 'above-avg' | 'avg' | 'fewer' | 'none';
  /** Required when any capacity field is non-`'avg'`. Surfaced to TLs in Stage 2/4. */
  availabilityComment?: string;
  votes: Array<{
    pitch_id: string;
    tier?: number;
    interestLevel?: number | null;
  }>;
}

/**
 * Fetches all available pitches from the bundled static JSON.
 * Update src/assets/pitches.json once per quarter via the Dev Tools export button.
 *
 * Adhoc (locally-added) pitches are NOT included here — they have a separate
 * fetchAdhocPitches() endpoint and only flow into the TL allocation UI, never
 * into the voting flow.
 */
export async function fetchPitches(): Promise<Pitch[]> {
  return staticPitches as unknown as Pitch[];
}

/**
 * Fetch the adhoc rows from the backend PITCHES sheet. Returns [] on any
 * fetch error so the TL allocation UI keeps working with localStorage-cached
 * adhoc pitches when the backend is unreachable.
 */
export async function fetchAdhocPitches(): Promise<Pitch[]> {
  if (USE_MOCK_API || !API_BASE_URL) return [];
  try {
    const response = await fetch(`${GAS_PROXY}?route=adhoc-pitches`);
    if (!response.ok) return [];
    const rows: Array<{ pitch_id: string; title: string; category: string; committed: boolean; adhoc: boolean }> = await response.json();
    return rows.map(r => ({
      id: r.pitch_id,
      title: r.title,
      category: r.category,
      adhoc: true,
      committed: !!r.committed,
      details: { problem: '' },
    }));
  } catch (err) {
    console.warn('fetchAdhocPitches: failed', err);
    return [];
  }
}

/**
 * Pushes the full pitch list to the backend PITCHES sheet so it stays in sync
 * with pitches.json. Called fire-and-forget after pitches load — failures are
 * logged but never surface to the user. Adhoc rows on the backend are
 * preserved across this rewrite by the server.
 */
export async function refreshPitchesInSheet(pitches: Pitch[]): Promise<void> {
  const payload = {
    pitches: pitches
      // Don't push adhoc pitches through the static-replacement route — they
      // have their own upsert path (saveAdhocPitch) and the backend filters
      // them out anyway.
      .filter(p => !p.adhoc)
      .map(p => ({
        pitch_id: p.id,
        title: p.title,
        category: p.category,
        problem: p.details.problem,
        ideaForSolution: p.details.ideaForSolution ?? '',
        characteristics: p.details.characteristics ?? '',
        whyNow: p.details.whyNow ?? '',
        smartToolsFit: p.details.smartToolsFit ?? '',
        epicFit: p.details.epicFit ?? '',
        success: p.details.success ?? '',
        maintenance: p.details.maintenance ?? '',
        internCandidate: p.details.internCandidate ?? false,
        committed: p.committed ?? false,
      })),
  };
  try {
    await gasJsonPost('refresh-pitches', payload, { saved: pitches.length });
  } catch (err) {
    console.warn('refreshPitchesInSheet: sheet sync failed', err);
  }
}

/**
 * Upsert a single adhoc (locally-added) pitch on the backend PITCHES sheet.
 * Called on add and edit. Throws on failure so the caller can surface a
 * snackbar — adhoc pitches that don't reach the backend won't be visible to
 * other TLs / on other machines.
 */
export async function saveAdhocPitch(pitch: Pitch): Promise<void> {
  const payload = {
    pitch: {
      pitch_id: pitch.id,
      title: pitch.title,
      category: pitch.category,
      committed: pitch.committed ?? false,
    },
  };
  await gasJsonPost('save-adhoc-pitch', payload, { saved: 1 });
}

/** Removes an adhoc pitch from the backend. Throws on failure. */
export async function deleteAdhocPitch(pitchId: string): Promise<void> {
  await gasJsonPost('delete-adhoc-pitch', { pitch_id: pitchId }, { deleted: 1 });
}


/**
 * Submits priority tier votes to the backend (stage 1).
 * Uses no-cors because GAS redirects through googleusercontent.com — the request
 * still reaches GAS and votes are recorded, but the response is opaque.
 * Deduplication is handled server-side via a SHA-256 checksum (voterName + pitchId + secret).
 */
export async function submitVotes(payload: Omit<SubmitVotesPayload, 'nonce'>): Promise<number> {
  if (USE_MOCK_API) {
    const savedCount = await submitMockVotes({ ...payload, nonce: 'mock' });
    return savedCount;
  }

  if (!API_BASE_URL) throw new ApiError('API URL not configured', 0);
  await fetch(`${API_BASE_URL}?route=vote`, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      voterName: payload.voterName,
      voterRole: payload.voterRole,
      available: payload.available,
      availableForPQA1: payload.availableForPQA1,
      devCapacity: payload.devCapacity,
      pqa1Capacity: payload.pqa1Capacity,
      capacity: payload.capacity,
      availabilityComment: payload.availabilityComment,
      votes: payload.votes,
    }),
  });
  return payload.votes.length;
}

export interface SubmitInterestPayload {
  voterName: string;
  voterRole: string;
  interests: Array<{ pitch_id: string; level: number | null }>;
}

/**
 * Submits interest ranking votes to the backend (stage 3 / interest-vote route).
 * No CSRF nonce required for this endpoint.
 */
export async function submitInterestVotes(payload: SubmitInterestPayload): Promise<number> {
  if (USE_MOCK_API) {
    return payload.interests.length;
  }

  const params = new URLSearchParams({
    route: 'interest-vote',
    voterName: payload.voterName,
    role: payload.voterRole,
    interests: JSON.stringify(payload.interests),
  });
  const response = await fetch(`${GAS_PROXY}?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(`Interest submission failed (${response.status})${text ? ': ' + text : ''}`, response.status);
  }
  const data = await response.json();
  return data.saved ?? payload.interests.length;
}

export interface PlanAssignmentPayload {
  pitchId: string;
  pitchTitle?: string;
  status: 'selected' | 'next-up' | 'cut';
  assignedDev: string | null;
}

export interface FinalAssignmentPayload extends PlanAssignmentPayload {
  devTL: string | null;
  qm: string | null;
  pqa1?: string | null;
}

/**
 * Saves the finalized stage 2 plan (pitch decisions + dev assignments) to the PLAN sheet.
 * Uses the dev-server proxy so we can follow GAS's redirect and read the response body,
 * which allows detecting lock-contention errors returned by withLock().
 */
export async function savePlan(assignments: PlanAssignmentPayload[], submittedBy: string): Promise<number> {
  const data = await gasJsonPost<{ saved?: number }>(
    'save-plan',
    { assignments, submittedBy },
    { saved: assignments.length },
  );
  return data.saved ?? assignments.length;
}

/**
 * Saves the finalized stage 4 team assignments (devTL, QM, PQA1) to the PLAN sheet,
 * merging with the stage 2 dev assignments already stored there.
 */
export async function saveFinalAssignments(assignments: FinalAssignmentPayload[], submittedBy: string): Promise<number> {
  const data = await gasJsonPost<{ saved?: number }>(
    'save-final-assignments',
    { assignments, submittedBy },
    { saved: assignments.length },
  );
  return data.saved ?? assignments.length;
}

/**
 * Fetches aggregated results (admin only)
 */
export async function fetchResults(): Promise<ResultItem[]> {
  try {
    const url = getApiUrl('results');
    console.log('Fetching results from URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error || 'Failed to fetch results',
        response.status,
        error.detail
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error while fetching results', 0);
  }
}

/**
 * Fetches the status of all pitches in the PLAN sheet (selected / next-up / cut).
 * Returns an empty object if the PLAN sheet has no data yet.
 */
export async function fetchPlanStatuses(): Promise<Record<string, 'selected' | 'next-up' | 'cut'>> {
  const response = await fetch(`${GAS_PROXY}?route=get-plan`);
  if (!response.ok) {
    throw new ApiError(`Get plan statuses failed (${response.status})`, response.status);
  }
  const data = await response.json();
  return data.statuses ?? {};
}

export type PlanRow = {
  status: 'selected' | 'next-up' | 'cut' | '';
  assignedDev: string | null;
  devTL: string | null;
  qm: string | null;
  pqa1: string | null;
};

/**
 * Fetches the full PLAN sheet rows keyed by pitchId, including dev / devTL /
 * qm / pqa1 assignments. Used by Stage 4 (TL allocation step 2) to read the
 * latest plan state from the backend rather than relying on per-machine
 * localStorage, which can drift when multiple TLs collaborate or after
 * cycle changes.
 */
export async function fetchPlanFull(): Promise<Record<string, PlanRow>> {
  const response = await fetch(`${GAS_PROXY}?route=get-plan`);
  if (!response.ok) {
    throw new ApiError(`Get plan failed (${response.status})`, response.status);
  }
  const data = await response.json();
  return data.assignments ?? {};
}

/**
 * Fetches current follow-up completion state (projectCreated, kickoffEmailSent) from the PLAN sheet.
 */
export async function getFollowups(): Promise<Record<string, { projectCreated: boolean; kickoffEmailSent: boolean }>> {
  const response = await fetch(`${GAS_PROXY}?route=get-followups`);
  if (!response.ok) {
    throw new ApiError(`Get followups failed (${response.status})`, response.status);
  }
  const data = await response.json();
  return data.followups ?? {};
}

/**
 * Updates a single follow-up checkbox (projectCreated or kickoffEmailSent) for a pitch in the PLAN sheet.
 */
export async function updateFollowup(
  pitchId: string,
  field: 'projectCreated' | 'kickoffEmailSent',
  value: boolean,
): Promise<void> {
  const params = new URLSearchParams({ route: 'update-followup', pitchId, field, value: String(value) });
  const response = await fetch(`${GAS_PROXY}?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(`Update followup failed (${response.status})${text ? ': ' + text : ''}`, response.status);
  }
}

export interface SubmitFeedbackPayload {
  voterName: string;
  voterRole: string;
  rating: number | null;
  comments: string;
}

/**
 * Submits optional feedback (rating + comments) to the FEEDBACK sheet.
 * Uses no-cors (same as submitVotes) so it works from static hosting where
 * the /gas-proxy dev server isn't available.
 */
export async function submitFeedback(payload: SubmitFeedbackPayload): Promise<void> {
  if (!API_BASE_URL) return;
  await fetch(`${API_BASE_URL}?route=feedback`, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      voterName: payload.voterName,
      voterRole: payload.voterRole,
      rating: payload.rating,
      comments: payload.comments,
    }),
  });
}

/**
 * Convert frontend votes to the format expected by the ?route=vote endpoint.
 * Ranked pitches send tier 1–4. Pitches explicitly moved back to unsorted send
 * tier=0 so the backend can record that the voter submitted but left it unranked.
 * Pitches the voter never touched (tier=undefined) are excluded entirely.
 */
export function convertVotesToApiFormat(
  votes: Record<string, Vote>,
  pitchTitles?: Record<string, string>,
): Array<{
  pitch_id: string;
  pitchTitle?: string;
  tier: number;
  interestLevel?: number | null;
}> {
  return Object.entries(votes)
    .filter(([_, vote]) => vote.tier !== undefined || vote.interestLevel !== undefined)
    .map(([pitchId, vote]) => ({
      pitch_id: pitchId,
      ...(pitchTitles ? { pitchTitle: pitchTitles[pitchId] ?? '' } : {}),
      tier: vote.tier ?? 0,  // null (explicitly unsorted) → 0
      ...(vote.interestLevel != null ? { interestLevel: vote.interestLevel } : {}),
    }));
}

/**
 * Convert frontend votes to the format expected by the ?route=interest-vote endpoint.
 * Only includes votes that have an interestLevel set.
 */
export function convertVotesToInterestFormat(votes: Record<string, Vote>): Array<{
  pitch_id: string;
  level: number | null;
}> {
  return Object.entries(votes)
    .filter(([_, vote]) => vote.interestLevel !== undefined && vote.interestLevel !== null)
    .map(([pitchId, vote]) => ({
      pitch_id: pitchId,
      level: vote.interestLevel as number,
    }));
}
