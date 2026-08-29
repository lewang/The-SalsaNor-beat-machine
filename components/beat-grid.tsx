import classnames from 'classnames';
import { Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { BeatEngine } from '../engine/beat-engine';
import { buildGrid, columnLabel, gridColumns, playheadColumn } from '../engine/beat-grid';
import { IMachine } from '../engine/machine-interfaces';
import styles from './css/beat-grid.module.css';

const MELODIC = new Set(['piano', 'bass', 'trumpet']);

/**
 * Reads the beat every frame and moves one element, so the several hundred cells behind it are not rebuilt
 * sixty times a second.
 */
const Playhead = observer(({ engine, columns }: { engine: BeatEngine; columns: number }) => {
  const column = engine.playing ? playheadColumn(engine.beat, columns) : -1;
  if (column < 0) {
    return null;
  }
  return <div className={styles.playhead} style={{ transform: `translateX(calc(var(--cell) * ${column}))` }} />;
});

Playhead.displayName = 'Playhead';

interface IBeatGridProps {
  machine: IMachine;
  engine: BeatEngine | null;
}

export const BeatGrid = observer(({ machine, engine }: IBeatGridProps) => {
  const columns = gridColumns(machine);
  const rows = buildGrid(machine, columns);

  if (!rows.length) {
    return <div className={styles.empty}>Nothing playing — switch an instrument on to see its pattern.</div>;
  }

  return (
    <div className={styles.scroll}>
      <div className={styles.frame} style={{ ['--columns' as string]: columns }}>
        <div className={styles.grid}>
          <div className={styles.label} />
          {Array.from({ length: columns }, (_, column) => (
            <div
              key={'h' + column}
              className={classnames(
                styles.cell,
                styles.head,
                column % 2 === 0 && styles.on,
                column % 8 === 0 ? styles.bar : column % 2 === 0 && styles.beat,
              )}
            >
              {columnLabel(machine, column)}
            </div>
          ))}

          {rows.map((row) => (
            <Fragment key={row.id}>
              <div className={styles.label}>{row.title}</div>
              {row.cells.map((cell, column) => (
                <div
                  key={row.id + column}
                  className={classnames(
                    styles.cell,
                    column % 8 === 0 ? styles.bar : column % 2 === 0 && styles.beat,
                  )}
                >
                  {cell && (
                    <div
                      className={classnames(styles.hit, MELODIC.has(row.id) && styles.melodic)}
                      style={{
                        opacity: 0.4 + 0.6 * cell.velocity,
                        ...(MELODIC.has(row.id)
                          ? {}
                          : { width: 6 + 8 * cell.velocity, height: 6 + 8 * cell.velocity }),
                      }}
                    />
                  )}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
        <div className={styles.track}>{engine && <Playhead engine={engine} columns={columns} />}</div>
      </div>
    </div>
  );
});

BeatGrid.displayName = 'BeatGrid';
