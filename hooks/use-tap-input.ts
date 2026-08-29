import { useEffect, useRef } from 'react';
import { TapSource } from '../engine/drill';

const TAP_KEYS = [' ', 'm', 'M', 't', 'T'];

/**
 * Keyboard half of a tap target. event.timeStamp is the OS event time, so nothing the main thread does between
 * the key going down and this handler running lands in the measurement.
 */
export function useTapInput(active: boolean, onTap: (perfMs: number, src: TapSource) => void) {
  const handler = useRef(onTap);
  handler.current = onTap;

  useEffect(() => {
    if (!active) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !TAP_KEYS.includes(event.key)) {
        return;
      }
      // A space typed into a field is a space, not a tap. The target is not always an element -- an event
      // dispatched at the window or the document has no closest() to ask.
      const target = event.target;
      if (target instanceof Element && target.closest('input, select, textarea, [contenteditable]')) {
        return;
      }
      // Space would scroll the page and would re-press whichever control still holds focus.
      event.preventDefault();
      handler.current(event.timeStamp, 'key');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
}
