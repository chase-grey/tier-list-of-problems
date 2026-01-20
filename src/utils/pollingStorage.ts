type PitchLike = { id: string; title?: string };

const POLLING_PREFIX = 'polling';
const CYCLE_META_KEY = `${POLLING_PREFIX}.cycleId`;

export const getStoredPollingCycleId = (): string => {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(CYCLE_META_KEY) || '';
  } catch {
    return '';
  }
};

export const buildPollingKey = (cycleId: string | null | undefined, key: string): string => {
  if (!cycleId) {
    return `${POLLING_PREFIX}.${key}`;
  }
  return `${POLLING_PREFIX}.${cycleId}.${key}`;
};

const hashStringFnv1a = (input: string): string => {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }

  return hash.toString(36);
};

export const computePitchesSignature = (pitches: PitchLike[]): string => {
  const stable = pitches
    .map(p => `${p.id}:${p.title ?? ''}`)
    .sort()
    .join('|');

  return hashStringFnv1a(stable);
};

export const getEffectivePollingCycleId = (explicitCycleId: string, pitches: PitchLike[]): string => {
  if (explicitCycleId) {
    return explicitCycleId;
  }

  return `sig-${computePitchesSignature(pitches)}`;
};

export const cleanupPollingStorageOnCycleChange = (cycleId: string): void => {
  if (typeof window === 'undefined') return;

  try {
    const previousCycleId = window.localStorage.getItem(CYCLE_META_KEY);

    if (!previousCycleId) {
      window.localStorage.setItem(CYCLE_META_KEY, cycleId);
      return;
    }

    if (previousCycleId === cycleId) {
      return;
    }

    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      const isLegacyPollingKey =
        key === `${POLLING_PREFIX}.appState` ||
        key === `${POLLING_PREFIX}.voterName` ||
        key === `${POLLING_PREFIX}.voterRole` ||
        key === `${POLLING_PREFIX}.migrationCompleted`;

      if (isLegacyPollingKey) {
        keysToRemove.push(key);
        continue;
      }

      if (key.startsWith(`${POLLING_PREFIX}.${previousCycleId}.`)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => window.localStorage.removeItem(k));
    window.localStorage.setItem(CYCLE_META_KEY, cycleId);
  } catch {
    return;
  }
};
