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
  /** Per-voter priority tiers across all voters. 0 = explicitly unsorted, 1 = highest priority, 4 = lowest. Key absent = voter never submitted. */
  teamVotes: Record<string, 0 | 1 | 2 | 3 | 4>;
  /** Per-TL priority tiers (subset of teamVotes, dev TLs only). */
  tlVotes: Record<string, 0 | 1 | 2 | 3 | 4>;
  // previousDev, previousTL, previousQM inherited from Pitch
}

export type AssignmentStatus = 'selected' | 'next-up' | 'cut';

/** A single pitch's status and dev assignment within a plan. */
export interface PlanAssignment {
  pitchId: string;
  assignedDev: string | null;
  status: AssignmentStatus;
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
  /**
   * Names of team members fully unavailable next quarter (e.g. paternity leave).
   * Excluded from every assignment pool — Stage 2 dev, Stage 4 TL/QM/PQA1.
   * For QM / dev TL, this is their single availability flag.
   */
  unavailableNames?: string[];
  /**
   * Devs who are NOT available for Stage 2 dev assignment but *are* available
   * as Stage 4 PQA1 reviewers (e.g. committed to another project). They stay
   * eligible in `devNames` for the PQA1 pool; the dev-assign algorithm filters
   * them out using this list. Devs in `unavailableNames` should not also be
   * here — the broader list already excludes them everywhere.
   */
  unavailableForDevNames?: string[];
  /**
   * Devs who *are* available for Stage 2 dev assignment but NOT available as
   * Stage 4 PQA1 reviewers. The PQA1 auto-assign filters them out via this
   * list; they remain eligible for dev assignment.
   */
  unavailableForPqa1Names?: string[];
  /**
   * Per-person capacity tiers + comment. Keyed by voter name. The merged view
   * the backend returns: voter-submitted values overlaid with TL overrides
   * (overrides win). Algorithms read this to compute per-person caps:
   *   above-avg → baseline + 1
   *   avg       → baseline (or unset → baseline)
   *   fewer     → max(0, baseline - 1)
   *   none      → 0 (excluded; also surfaced via the unavailable*Names lists)
   * Comments are display-only — Stage 2/4 sidebars surface them on hover.
   */
  capacityByName?: Record<string, PersonCapacity>;
}

/**
 * Capacity record for a single person — returned by the backend in
 * `AllocationConfig.capacityByName` and used to drive both auto-assign caps
 * and the Stage 2/4 sidebar capacity badges + tooltips.
 */
export interface PersonCapacity {
  /** Devs only — Stage 2 dev capacity. Undefined for non-devs. */
  devCapacity?: import('./models').Capacity;
  /** Devs only — Stage 4 PQA1 capacity. Undefined for non-devs. */
  pqa1Capacity?: import('./models').Capacity;
  /** QM / dev TL only — single project capacity. Undefined for devs. */
  capacity?: import('./models').Capacity;
  /** Free-text reason for any non-`'avg'` capacity. Empty for fully-standard answers. */
  comment?: string;
  /**
   * Where this record came from. `'voter'` = the person submitted it via the
   * dialog; `'tl-override'` = a TL set/changed it from the Stage 2/4 UI.
   * Used in the hover tooltip ("TL set fewer — {comment}" vs "Voter said…").
   */
  source?: 'voter' | 'tl-override';
}
