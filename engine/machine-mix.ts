export type MixState = 'all' | 'none' | 'mixed';

export function mixStateOf(enabled: boolean[]): MixState {
  if (!enabled.length) {
    return 'none';
  }
  return enabled.every(Boolean) ? 'all' : enabled.some(Boolean) ? 'mixed' : 'none';
}

/**
 * Your mix, then all off, then all on, and round again. A remembered mix that is no longer actually a mix is
 * no use as a third state, so it is skipped rather than repeating one of the other two.
 */
export function nextMix(enabled: boolean[], remembered: boolean[] | null): boolean[] {
  const state = mixStateOf(enabled);
  if (state === 'mixed') {
    return enabled.map(() => false);
  }
  if (state === 'none') {
    return enabled.map(() => true);
  }
  const usable = remembered && remembered.length === enabled.length && mixStateOf(remembered) === 'mixed';
  return usable ? [...remembered] : enabled.map(() => false);
}
