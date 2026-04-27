import type { Pitch, InterestLevel } from './models';

export type { Pitch, InterestLevel };

/**
 * A pitch enriched with aggregated vote scores for TL allocation.
 * Extends Pitch so it's compatible with DetailsBubble directly.
 */
export interface AllocationPitch extends Pitch {
  /**
   * Average priority tier across all voters.
   * Scale: 1.0 (tier 1, highest priority) – 4.0 (tier 4, lowest priority).
   */
  teamPriorityScore: number;
  /** Same, filtered to dev TL voters only. */
  tlPriorityScore: number;
  /**
   * Dev name → interest tier (1 = highest interest, 4 = lowest, null = skipped).
   * Key missing entirely = dev submitted no interest votes at all.
   */
  devInterest: Record<string, InterestLevel>;
  /** Per-voter priority tiers across all voters (devs + TLs + QMs). 1 = highest priority, 4 = lowest. */
  teamVotes: Record<string, 1 | 2 | 3 | 4>;
  /** Per-TL priority tiers (subset of teamVotes, dev TLs only). */
  tlVotes: Record<string, 1 | 2 | 3 | 4>;
  /** For continuation pitches: the dev TL who led this project last quarter. */
  previousTL?: string;
  /** For continuation pitches: the QM who covered this project last quarter. */
  previousQM?: string;
}

export type AssignmentStatus = 'selected' | 'next-up' | 'cut';

/** A single pitch's status and dev assignment within a plan. */
export interface PlanAssignment {
  pitchId: string;
  assignedDev: string | null;
  status: AssignmentStatus;
}

/** One of the 2–3 generated plan options TLs can flip between. */
export interface AllocationPlan {
  id: 'A' | 'B' | 'C';
  label: string;
  description: string;
  assignments: PlanAssignment[];
}

/** Phase 2 interest: a dev TL or QM's interest ratings across the selected projects. */
export interface Phase2Interest {
  personName: string;
  role: 'dev TL' | 'QM';
  /** Pitch ID → interest tier (1 = highest, null = skipped, key absent = no data). */
  interestByPitchId: Partial<Record<string, InterestLevel>>;
}

/** Step 2 output: dev TL, QM, and PQA1 reviewer assigned to a project. */
export interface StaffingAssignment {
  pitchId: string;
  devTL: string | null;
  qm: string | null;
  pqa1?: string | null;
}

/** Quarterly bandwidth config. */
export interface AllocationConfig {
  /** Category name → target % (should sum to ~100). */
  bandwidth: Record<string, number>;
  /** How many next-up projects to track as potential backlog items. Default 15. */
  nextUpCount: number;
  /** Testing captain email/name — same person for every project kickoff email. */
  testingCaptain: string;
  devNames: string[];
  devTLNames: string[];
  qmNames: string[];
  /** Map of TL name → email address for per-TL kickoff emails. */
  tlEmails: Record<string, string>;
  /** Map of any team member name → email (devs, QMs, PQA1s, testing captain). */
  memberEmails?: Record<string, string>;
  /** Quarter label used in email subjects, e.g. "4" or "Next Quarter". Defaults to "Next Quarter". */
  quarterLabel?: string;
}
