import React, { useEffect, useRef } from 'react';
import { CLOSE_BEATS, ITap, ON_BEATS } from '../../engine/drill';
import styles from './drill.module.css';

const WIDTH = 1240;
const HEIGHT = 60;
const SHOWN = 90;
const TONE: Record<ITap['cls'], string> = { on: '#4ADE80', close: '#FFC947', stray: '#F87171' };

interface ITapPlotProps {
  taps: ITap[];
}

/** Every tap as a mark against the beat it was aimed at, oldest faintest. Full scale is half a beat either way. */
export const TapPlot = React.memo(({ taps }: ITapPlotProps) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) {
      return;
    }
    const mid = WIDTH / 2;
    const perBeat = mid / CLOSE_BEATS;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = 'rgba(74, 222, 128, 0.16)';
    context.fillRect(mid - ON_BEATS * perBeat, 0, 2 * ON_BEATS * perBeat, HEIGHT);
    context.fillStyle = 'rgba(74, 222, 128, 0.8)';
    context.fillRect(mid - 1, 0, 2, HEIGHT);

    const shown = taps.slice(-SHOWN);
    shown.forEach((tap, index) => {
      context.globalAlpha = 0.3 + (0.7 * (index + 1)) / shown.length;
      context.fillStyle = TONE[tap.cls];
      const x = mid + Math.max(-1.1, Math.min(1.1, tap.errBeats / CLOSE_BEATS)) * mid;
      context.fillRect(Math.max(2, Math.min(WIDTH - 6, x - 2)), 9, 4, HEIGHT - 18);
    });
    context.globalAlpha = 1;
  }, [taps]);

  return <canvas ref={canvas} className={styles.plot} width={WIDTH} height={HEIGHT} />;
});

TapPlot.displayName = 'TapPlot';
