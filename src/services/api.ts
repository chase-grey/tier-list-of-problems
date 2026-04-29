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

// All GAS calls go through the Vite dev server proxy at /gas-proxy, which
// forwards to GAS server-side and follows the 302 redirect that browsers can't.
const GAS_PROXY = '/gas-proxy';

function getApiUrl(route: string): string {
  return `${GAS_PROXY}?route=${route}`;
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
  votes: Array<{
    pitch_id: string;
    tier?: number;
    interestLevel?: number | null;
  }>;
}

/**
 * Fetches all available pitches from the bundled static JSON.
 * Update src/assets/pitches.json once per quarter via the Dev Tools export button.
 */
export async function fetchPitches(): Promise<Pitch[]> {
  return staticPitches as unknown as Pitch[];
}

/**
 * Pushes the full pitch list to the backend PITCHES sheet so it stays in sync
 * with pitches.json. Called fire-and-forget after pitches load — failures are
 * logged but never surface to the user.
 */
export async function refreshPitchesInSheet(pitches: Pitch[]): Promise<void> {
  const payload = {
    pitches: pitches.map(p => ({
      pitch_id: p.id,
      title: p.title,
      problem: p.details.problem,
      ideaForSolution: p.details.ideaForSolution ?? '',
      characteristics: p.details.characteristics ?? '',
      whyNow: p.details.whyNow ?? '',
      smartToolsFit: p.details.smartToolsFit ?? '',
      epicFit: p.details.epicFit ?? '',
      success: p.details.success ?? '',
      maintenance: p.details.maintenance ?? '',
      internCandidate: p.details.internCandidate ?? false,
    })),
  };
  const response = await fetch(`${GAS_PROXY}?route=refresh-pitches`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    console.warn('refreshPitchesInSheet: sheet sync failed', response.status);
  }
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
    body: JSON.stringify({ voterName: payload.voterName, voterRole: payload.voterRole, votes: payload.votes }),
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
export async function savePlan(assignments: PlanAssignmentPayload[]): Promise<number> {
  const response = await fetch(`${GAS_PROXY}?route=save-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ assignments }),
  });
  const data = await response.json().catch(() => ({}));
  if (data.error) throw new ApiError(data.error, response.status || 200);
  return data.saved ?? assignments.length;
}

/**
 * Saves the finalized stage 4 team assignments (devTL, QM, PQA1) to the PLAN sheet,
 * merging with the stage 2 dev assignments already stored there.
 */
export async function saveFinalAssignments(assignments: FinalAssignmentPayload[]): Promise<number> {
  const response = await fetch(`${GAS_PROXY}?route=save-final-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ assignments }),
  });
  const data = await response.json().catch(() => ({}));
  if (data.error) throw new ApiError(data.error, response.status || 200);
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
 * Uses POST so free-text comments aren't corrupted by URL encoding.
 */
export async function submitFeedback(payload: SubmitFeedbackPayload): Promise<void> {
  const response = await fetch(`${GAS_PROXY}?route=feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      voterName: payload.voterName,
      voterRole: payload.voterRole,
      rating: payload.rating,
      comments: payload.comments,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(`Feedback submission failed (${response.status})${text ? ': ' + text : ''}`, response.status);
  }
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
