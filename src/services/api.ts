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

  const params = new URLSearchParams({
    route: 'vote',
    voterName: payload.voterName,
    votes: JSON.stringify(payload.votes),
  });
  const response = await fetch(`${GAS_PROXY}?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(`Vote submission failed (${response.status})${text ? ': ' + text : ''}`, response.status);
  }
  const data = await response.json();
  return data.saved ?? payload.votes.length;
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
 * Convert frontend votes to the format expected by the ?route=vote endpoint.
 * Only includes votes that have a tier set (backend requires tier 1–8).
 */
export function convertVotesToApiFormat(votes: Record<string, Vote>): Array<{
  pitch_id: string;
  tier: number;
  interestLevel?: number | null;
}> {
  return Object.entries(votes)
    .filter(([_, vote]) => vote.tier != null)
    .map(([pitchId, vote]) => ({
      pitch_id: pitchId,
      tier: vote.tier as number,
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
