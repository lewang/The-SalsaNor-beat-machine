export type MixChoice = 'last' | 'none' | 'all' | 'default';

/** Your own set first, then the two extremes, then back to how the machine shipped. */
export const MIX_CYCLE: MixChoice[] = ['last', 'none', 'all', 'default'];

export const MIX_LABELS: Record<MixChoice, string> = {
  last: 'last played',
  none: 'all off',
  all: 'all on',
  default: 'default',
};

const same = (a: boolean[], b: boolean[]) => a.length === b.length && a.every((value, i) => value === b[i]);

/** A remembered set is only worth a stop on the cycle while it still differs from the others. */
function usable(remembered: boolean[] | null, enabled: boolean[], defaults: boolean[]): remembered is boolean[] {
  if (!remembered || remembered.length !== enabled.length) {
    return false;
  }
  const allOn = enabled.map(() => true);
  const allOff = enabled.map(() => false);
  return !same(remembered, allOn) && !same(remembered, allOff) && !same(remembered, defaults);
}

export function mixFor(
  choice: MixChoice,
  enabled: boolean[],
  remembered: boolean[] | null,
  defaults: boolean[],
): boolean[] {
  if (choice === 'none') {
    return enabled.map(() => false);
  }
  if (choice === 'all') {
    return enabled.map(() => true);
  }
  if (choice === 'default') {
    return [...defaults];
  }
  return usable(remembered, enabled, defaults) ? [...remembered] : [...defaults];
}

/**
 * Which of the four the machine is currently sitting on, or null when it is a set you made by hand — which is
 * itself the "last played" one, so a click from there moves on to the next in the cycle.
 */
export function identifyMix(enabled: boolean[], remembered: boolean[] | null, defaults: boolean[]): MixChoice | null {
  if (enabled.every(Boolean)) {
    return 'all';
  }
  if (!enabled.some(Boolean)) {
    return 'none';
  }
  if (same(enabled, defaults)) {
    return 'default';
  }
  if (remembered && same(enabled, remembered)) {
    return 'last';
  }
  return null;
}

export function nextMixChoice(
  enabled: boolean[],
  remembered: boolean[] | null,
  defaults: boolean[],
): MixChoice {
  const current = identifyMix(enabled, remembered, defaults) ?? 'last';
  const from = MIX_CYCLE.indexOf(current);
  for (let step = 1; step <= MIX_CYCLE.length; step++) {
    const candidate = MIX_CYCLE[(from + step) % MIX_CYCLE.length];
    if (candidate === 'last' && !usable(remembered, enabled, defaults)) {
      continue;
    }
    return candidate;
  }
  return 'default';
}
