import classnames from 'classnames';
import React from 'react';
import { TapClass, TapSource } from '../../engine/drill';
import styles from './drill.module.css';

interface ITapPadProps {
  cls: TapClass | null;
  onTap: (perfMs: number, src: TapSource) => void;
  children: React.ReactNode;
}

/**
 * The whole panel is the target. pointerdown fires on contact rather than on release, and controls inside the
 * pad are exempt so that pressing one does not also score as a tap.
 */
export const TapPad = ({ cls, onTap, children }: ITapPadProps) => (
  <div
    className={classnames(styles.pad, cls && styles[cls])}
    onPointerDown={(event) => {
      if ((event.target as HTMLElement).closest('button, a, input, select')) {
        return;
      }
      event.preventDefault();
      onTap(event.timeStamp, 'pad');
    }}
  >
    {children}
  </div>
);
