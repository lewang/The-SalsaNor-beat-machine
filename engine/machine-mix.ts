export type MixState = 'all' | 'none' | 'mixed';

export function mixStateOf(enabled: boolean[]): MixState {
  if (!enabled.length) {
    return 'none';
  }
  return enabled.every(Boolean) ? 'all' : enabled.some(Boolean) ? 'mixed' : 'none';
}

/**
 * All on, then all off, then back to the mix you last had by hand. A remembered mix that is no longer actually
 * a mix is no use as a third state, so it is skipped rather than repeating one of the other two.
 */
export function nextMix(enabled: boolean[], remembered: boolean[] | null): boolean[] {
  const state = mixStateOf(enabled);
  if (state === 'all') {
    return enabled.map(() => false);
  }
  if (state === 'mixed') {
    return enabled.map(() => true);
  }
  const usable = remembered && remembered.length === enabled.length && mixStateOf(remembered) === 'mixed';
  return usable ? [...remembered] : enabled.map(() => true);
}
