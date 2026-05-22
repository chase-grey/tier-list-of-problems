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
const IS_DEV_PROXY = (import.meta as any).env?.DEV ?? false;
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
    const rows: Array<{ pitch_id: string; title: string; category: string; committed: boolean; adhoc: boolean; prjId?: string }> = await response.json();
    return rows.map(r => ({
      id: r.pitch_id,
      title: r.title,
      category: r.category,
      adhoc: true,
      committed: !!r.committed,
      ...(r.prjId ? { prjId: String(r.prjId) } : {}),
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
        prjId: p.prjId ?? '',
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
      prjId: pitch.prjId ?? '',
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
  /** Tracker project ID for adhoc pitches. Empty string for non-adhoc rows
   *  (their static dataset doesn't carry a prjId). Surfaced on the PLAN
   *  sheet's prjId column so downstream consumers don't have to join. */
  prjId?: string;
  /** Stretch goal flag — projects we'll only complete with spare capacity.
   *  Persisted on the PLAN sheet alongside status so the flag survives
   *  refreshes / hand-offs between TLs. */
  stretch?: boolean;
  /** Full-bandwidth flag — adhoc pitches where the assigned person(s) are
   *  fully consumed by this one project (e.g. team transfer). Algorithm
   *  reads this on load to clamp the assignee's effective cap. */
  fullBandwidth?: boolean;
  /** TL-set category override. Non-empty means the pitch should display in
   *  this category instead of its source value (only meaningful for
   *  non-adhoc pitches; adhocs persist category on PITCHES directly). */
  categoryOverride?: string;
}

export interface FinalAssignmentPayload extends PlanAssignmentPayload {
  devTL: string | null;
  qm: string | null;
  pqa1?: string | null;
}

/**
 * Saves the stage 2 plan (pitch decisions + dev assignments) to the PLAN sheet.
 * Backend upserts by pitchId — fields not in the payload are preserved, and
 * pitches not in the payload aren't touched. Throws EditLockConflictError if
 * caller doesn't hold the stage-2 edit lock.
 */
export async function savePlan(assignments: PlanAssignmentPayload[], submittedBy: string, sessionId: string): Promise<number> {
  const data = await gasJsonPost<{ saved?: number; error?: string; lock?: EditLockState }>(
    'save-plan',
    { assignments, submittedBy, sessionId },
    { saved: assignments.length },
  );
  if (data && data.error === 'edit-lock-conflict') {
    throw new EditLockConflictError('2', data.lock);
  }
  return data.saved ?? assignments.length;
}

/**
 * Saves stage 4 team assignments. Same upsert semantics as savePlan: partial
 * saves preserve untouched pitches. Throws EditLockConflictError if caller
 * doesn't hold the stage-4 edit lock.
 */
export async function saveFinalAssignments(assignments: FinalAssignmentPayload[], submittedBy: string, sessionId: string): Promise<number> {
  const data = await gasJsonPost<{ saved?: number; error?: string; lock?: EditLockState }>(
    'save-final-assignments',
    { assignments, submittedBy, sessionId },
    { saved: assignments.length },
  );
  if (data && data.error === 'edit-lock-conflict') {
    throw new EditLockConflictError('4', data.lock);
  }
  return data.saved ?? assignments.length;
}

// ─── Edit-lock client ────────────────────────────────────────────────────────
//
// Stage 2 (dev assignment) and Stage 4 (TL/QM/PQA1 staffing) are single-editor
// stages — only one TL holds the lock at a time. Everyone else sees a view-
// only banner naming the current holder. Heartbeat every 60s while editing;
// auto-stale after EDIT_LOCK_TTL_MS (5min) of no heartbeat so a closed browser
// doesn't permanently strand the lock.

export type LockStage = '2' | '4';

export interface EditLockState {
  holder: string | null;
  /** Per-tab session ID of the current holder. The lock is now scoped to a
   *  single tab, so a second tab from the same user sees `holder` match its
   *  voterName but `holderSession` differ — that's treated as "viewer" by
   *  the frontend. Null on legacy records written before sessions existed. */
  holderSession?: string | null;
  acquiredAt: number;
  lastHeartbeat: number;
}

export class EditLockConflictError extends Error {
  stage: LockStage;
  lock: EditLockState | undefined;
  constructor(stage: LockStage, lock: EditLockState | undefined) {
    super(`edit-lock-conflict for stage ${stage}`);
    this.name = 'EditLockConflictError';
    this.stage = stage;
    this.lock = lock;
  }
}

export async function fetchEditLock(stage: LockStage): Promise<EditLockState> {
  const empty: EditLockState = { holder: null, holderSession: null, acquiredAt: 0, lastHeartbeat: 0 };
  if (!API_BASE_URL) return empty;
  const url = `${GAS_PROXY}?route=get-edit-lock&stage=${encodeURIComponent(stage)}`;
  const response = await fetch(url);
  if (!response.ok) return empty;
  const data = await response.json().catch(() => ({} as any));
  return (data?.lock as EditLockState) ?? empty;
}

/**
 * Try to acquire the edit lock for a stage. Returns { acquired, lock }. When
 * acquired=false, the current holder is fresh — the caller can offer a
 * "Force take" path that re-calls with force=true (the previous holder's
 * unsaved work is lost; the UI should disclaim this).
 */
export async function acquireEditLock(stage: LockStage, voterName: string, sessionId: string, force = false): Promise<{ acquired: boolean; lock: EditLockState }> {
  const synthetic = {
    acquired: true,
    lock: { holder: voterName, holderSession: sessionId, acquiredAt: Date.now(), lastHeartbeat: Date.now() } as EditLockState,
  };
  try {
    const data = await gasJsonPost<{ acquired?: boolean; lock?: EditLockState }>(
      'acquire-edit-lock',
      { stage, voterName, sessionId, force },
      synthetic,
    );
    if (data.acquired === undefined) return synthetic;
    return {
      acquired: !!data.acquired,
      lock: data.lock ?? { holder: null, holderSession: null, acquiredAt: 0, lastHeartbeat: 0 },
    };
  } catch (err) {
    console.warn('acquireEditLock: backend unreachable, granting locally', err);
    return synthetic;
  }
}

/** Release the lock. Caller must be the current holder for this session;
 *  another tab from the same user can't drop a lock it doesn't actually hold. */
export async function releaseEditLock(stage: LockStage, voterName: string, sessionId: string): Promise<void> {
  await gasJsonPost('release-edit-lock', { stage, voterName, sessionId }, { released: true });
}

/**
 * Bump the lock heartbeat. The returned state lets the caller detect when
 * the lock was force-taken or grabbed by another tab — if `holder` or
 * `holderSession` no longer matches the caller, the UI should transition to
 * view-only.
 */
export async function heartbeatEditLock(stage: LockStage, voterName: string, sessionId: string): Promise<EditLockState> {
  const data = await gasJsonPost<{ lock?: EditLockState }>(
    'heartbeat-edit-lock',
    { stage, voterName, sessionId },
    { lock: { holder: voterName, holderSession: sessionId, acquiredAt: 0, lastHeartbeat: Date.now() } as EditLockState },
  );
  return data.lock ?? { holder: null, holderSession: null, acquiredAt: 0, lastHeartbeat: 0 };
}

// ─── Allocation locks (per-stage auto-assign skip flags) ────────────────────
// Pitch and person locks tell the auto-assign algorithm to leave specific
// rows / people as-is. Persisted server-side so every TL sees the same locks
// rather than relying on per-machine localStorage. Writes are gated by the
// stage's edit lock; reads are public.

export interface AllocationLockSet {
  pitchIds: string[];
  personNames: string[];
}

export interface AllocationLocks {
  '2': AllocationLockSet;
  '4': AllocationLockSet;
}

function normalizeLockSet(obj: any): AllocationLockSet {
  return {
    pitchIds: Array.isArray(obj?.pitchIds) ? obj.pitchIds.map(String) : [],
    personNames: Array.isArray(obj?.personNames) ? obj.personNames.map(String) : [],
  };
}

/**
 * Returns the shared lock state, or `null` when the backend can't be reached
 * (no API URL, network error, non-OK response, or the GAS route hasn't been
 * deployed yet — that route returns `{error:"NOT_FOUND"}` rather than HTTP
 * 404, so we can't rely on response.ok alone). Callers should treat `null`
 * as "keep whatever local state you already have" rather than overwriting
 * the user's in-progress locks with empty arrays.
 */
export async function fetchAllocationLocks(): Promise<AllocationLocks | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${GAS_PROXY}?route=get-allocation-locks`);
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object') return null;
    // GAS notFound() returns 200 + { error: "NOT_FOUND" } — detect it and
    // bail out instead of normalizing into empty lock sets.
    if ('error' in data) return null;
    // Real responses always have at least one stage key. If both are
    // missing the route returned something we don't recognize.
    if (!('2' in data) && !('4' in data)) return null;
    return {
      '2': normalizeLockSet((data as any)['2']),
      '4': normalizeLockSet((data as any)['4']),
    };
  } catch {
    return null;
  }
}

/**
 * Persist per-stage pitch/person locks. Throws EditLockConflictError when
 * the caller doesn't hold the stage's edit lock (viewers' lock toggles are
 * intentionally rejected so the shared lock state stays authoritative).
 */
export async function setAllocationLocks(
  stage: LockStage,
  locks: AllocationLockSet,
  submittedBy: string,
  sessionId: string,
): Promise<void> {
  const data = await gasJsonPost<{ saved?: boolean; error?: string; lock?: EditLockState }>(
    'set-allocation-locks',
    { stage, locks, submittedBy, sessionId },
    { saved: true },
  );
  if (data && data.error === 'edit-lock-conflict') {
    throw new EditLockConflictError(stage, data.lock);
  }
}

/** "The plan is done" flag per stage. When Stage 4 finalized=true, every TL
 *  viewing the page sees the summary view by default + an extra confirmation
 *  before editing. Persisted in Script Properties on the backend. */
export type AllocationFinalizedState = { '2': boolean; '4': boolean };

export async function fetchAllocationFinalized(): Promise<AllocationFinalizedState> {
  const fallback: AllocationFinalizedState = { '2': false, '4': false };
  if (!API_BASE_URL) return fallback;
  try {
    const response = await fetch(`${GAS_PROXY}?route=get-allocation-finalized`);
    if (!response.ok) return fallback;
    const data = await response.json().catch(() => ({} as any));
    const f = data?.finalized;
    if (!f) return fallback;
    return { '2': f['2'] === true, '4': f['4'] === true };
  } catch {
    return fallback;
  }
}

export async function setAllocationFinalized(
  stage: LockStage,
  finalized: boolean,
  submittedBy: string,
  sessionId: string,
): Promise<void> {
  const data = await gasJsonPost<{ saved?: boolean; error?: string; lock?: EditLockState }>(
    'set-allocation-finalized',
    { stage, finalized, submittedBy, sessionId },
    { saved: true },
  );
  if (data && data.error === 'edit-lock-conflict') {
    throw new EditLockConflictError(stage, data.lock);
  }
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
  stretch?: boolean;
  fullBandwidth?: boolean;
  /** TL-set category override. Non-empty means the TL has remapped this
   *  pitch in Stage 4; the frontend should display it in this category
   *  instead of the source value. Empty/null = use source category. */
  categoryOverride?: string | null;
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
 * Fetches current follow-up completion state (projectCreated, kickoffEmailSent,
 * backlogPrjCreated, backlogTL) from the PLAN sheet. Returns empty string /
 * false for fields whose column predates this commit on the deployed sheet.
 */
export async function getFollowups(): Promise<Record<string, { projectCreated: boolean; kickoffEmailSent: boolean; backlogPrjCreated: boolean; backlogTL: string }>> {
  const response = await fetch(`${GAS_PROXY}?route=get-followups`);
  if (!response.ok) {
    throw new ApiError(`Get followups failed (${response.status})`, response.status);
  }
  const data = await response.json();
  return data.followups ?? {};
}

/**
 * Persists the backlog-TL ownership for a pitch. Once a backlog pitch is shown
 * under a TL, this lock-in prevents round-robin reshuffles from moving it off
 * that TL when a sibling pitch gets cut.
 */
export async function setBacklogTL(pitchId: string, tl: string): Promise<void> {
  const params = new URLSearchParams({ route: 'set-backlog-tl', pitchId, tl });
  const response = await fetch(`${GAS_PROXY}?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(`Set backlog TL failed (${response.status})${text ? ': ' + text : ''}`, response.status);
  }
}

/**
 * Updates a single follow-up checkbox for a pitch in the PLAN sheet.
 */
export async function updateFollowup(
  pitchId: string,
  field: 'projectCreated' | 'kickoffEmailSent' | 'backlogPrjCreated',
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
