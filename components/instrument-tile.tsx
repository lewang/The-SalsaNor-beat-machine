import { FormControl, IconButton, MenuItem, Select, Slider } from '@mui/material';
import classnames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useState, useEffect, useRef } from 'react';
import { IInstrument } from '../engine/machine-interfaces';
import styles from './css/instrument-tile.module.css';
import SettingsIcon from '@mui/icons-material/Settings';
import VolumeIcon from '@mui/icons-material/VolumeUp';

export interface ILanguageOption {
  value: string;
  label: string;
}

// Some instruments carry twenty-odd programs with titles far wider than a tile, so the
// menu is bounded and scrolls rather than opening at the width of its longest entry.
const MENU_PROPS = {
  PaperProps: {
    sx: {
      maxHeight: 300,
      maxWidth: 320,
      bgcolor: 'rgba(24, 18, 14, 0.97)',
      color: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      '& .MuiMenuItem-root': { fontSize: 13 },
      '& .Mui-selected': { backgroundColor: 'rgba(255, 201, 71, 0.2) !important' },
    },
  },
};

interface IInstrumentTileProps {
  instrument: IInstrument;
  languages?: ILanguageOption[];
  language?: string;
  onLanguageChange?: (language: string) => void;
}

export const InstrumentTile = observer((props: IInstrumentTileProps) => {
  const { instrument, languages, language, onLanguageChange } = props;
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // Muting has to zero the gain as well as clear the enabled flag: notes are scheduled up to
  // ten seconds ahead, and those are already on their way to the speakers.
  const toggle = () => {
    if (instrument.enabled) {
      instrument.volume = 0;
    } else {
      instrument.volume = instrument.unmutedVolume;
    }
    instrument.enabled = !instrument.enabled;
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.main} title={instrument.title}>
        <div
          className={classnames(styles.thumbnail, !instrument.enabled && styles.disabled)}
          onClick={toggle}
          style={{ backgroundImage: `url(assets/instruments/${instrument.id}.svg)` }}
        />
        {languages && (
          <div className={styles.tools}>
            <IconButton className={styles.iconButton} size="small" onClick={() => setShowSettings(!showSettings)}>
              <SettingsIcon className={classnames(showSettings && styles.active)} />
            </IconButton>
          </div>
        )}
        {showSettings && languages && (
          <div className={styles.settingsPanel}>
            <div className={styles.settingLabel}>Language</div>
            <FormControl fullWidth size="small">
              <Select
                value={language ?? ''}
                onChange={(e) => onLanguageChange?.(String(e.target.value))}
                MenuProps={MENU_PROPS}
              >
                {languages.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}
      </div>
      <div className={classnames(styles.bottom, styles.instrumentLabel)}>{instrument.title}</div>
      <FormControl fullWidth size="small" className={styles.programSelect}>
        <Select
          value={instrument.activeProgram}
          onChange={(e) => (instrument.activeProgram = Number(e.target.value))}
          MenuProps={MENU_PROPS}
        >
          {instrument.programs.map((program, index) => (
            <MenuItem key={program.title} value={index}>
              {program.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <div className={styles.volume}>
        <VolumeIcon className={styles.volumeIcon} />
        <Slider
          min={0}
          max={1}
          step={0.05}
          size="small"
          aria-label="Instrument volume"
          value={instrument.volume}
          onChange={(_event, newValue) => {
            instrument.volume = newValue as number;
            if (instrument.volume > 0) {
              instrument.unmutedVolume = instrument.volume;
            }
          }}
        />
      </div>
      {/* filter is used by CSS to draw disabled instruments */}
      <svg height="0" width="0">
        <filter id="gray-overlay">
          <feFlood id="gray-overlay-flood" floodColor="rgb(104,104,104)" />
          <feComposite in2="SourceAlpha" operator="in" k1="-8.8" />
        </filter>
      </svg>
    </div>
  );
});
