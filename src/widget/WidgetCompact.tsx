'use client';

import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { IMachine } from '../../engine/machine-interfaces';
import { BeatEngine } from '../../engine/beat-engine';
import { AudioBackend } from '../../engine/audio-backend';
import { getWidgetBaseUrl } from '../services/load-machine-client';

// Inject widget CSS into the page
function injectWidgetCSS() {
  if (typeof document === 'undefined') return; // SSR guard
  if (document.getElementById('beat-machine-widget-styles')) {
    return; // Already injected
  }

  const style = document.createElement('style');
  style.id = 'beat-machine-widget-styles';
  style.textContent = `
    .beat-widget {
      display: inline-flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem 1.25rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(0, 245, 255, 0.1));
      border: 1px solid rgba(0, 245, 255, 0.3);
      border-radius: 0.75rem;
      backdrop-filter: blur(10px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
    }

    .beat-widget .playButton {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #FFC947 0%, #FF9933 100%);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(255, 201, 71, 0.3);
      padding: 0;
    }

    .beat-widget .playButton:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(255, 201, 71, 0.5);
    }

    .beat-widget .playButton:active {
      transform: scale(0.95);
    }

    .beat-widget .playButton:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .beat-widget .playButton.playing {
      background: linear-gradient(135deg, #FF8C69 0%, #FF6B4A 100%);
    }

    .beat-widget .playButton svg {
      width: 1.25rem;
      height: 1.25rem;
      fill: currentColor;
    }

    .beat-widget .bpmControl {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 120px;
    }

    .beat-widget .bpmLabel {
      font-size: 0.875rem;
      font-weight: 600;
      color: #FF9933;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .beat-widget .slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 153, 51, 0.25);
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
    }

    .beat-widget .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #FF9933;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 153, 51, 0.4);
    }

    .beat-widget .slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #FF9933;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 153, 51, 0.4);
    }

    .beat-widget .widgetContent {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .beat-widget .footer {
      margin-top: 0.25rem;
      text-align: center;
      font-size: 0.65rem;
      opacity: 0.6;
      line-height: 1;
    }

    .beat-widget .footer a {
      color: inherit;
      text-decoration: none;
      transition: opacity 0.2s ease;
    }

    .beat-widget .footer a:hover {
      opacity: 1;
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);
}

interface WidgetCompactProps {
  machine: IMachine;
  instruments?: string[];
  initialBpm?: number;
  autoplay?: boolean;
}

export const WidgetCompact = observer(({ machine, instruments, initialBpm, autoplay = false }: WidgetCompactProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [engine, setEngine] = useState<BeatEngine | null>(null);

  // Inject CSS on mount
  useEffect(() => {
    injectWidgetCSS();
  }, []);

  useEffect(() => {
    const initEngine = async () => {
      const baseUrl = getWidgetBaseUrl();
      const mixer = new AudioBackend(baseUrl);
      const newEngine = new BeatEngine(mixer);
      await newEngine.init();
      setEngine(newEngine);
    };

    initEngine();

    return () => {
      if (engine) {
        engine.stop();
      }
    };
  }, []);

  // Filter instruments if specified
  useEffect(() => {
    if (instruments && instruments.length > 0) {
      machine.instruments.forEach(instrument => {
        instrument.enabled = instruments.includes(instrument.id);
      });
    }
  }, [instruments, machine]);

  // Set initial BPM only if explicitly provided and different from machine's current BPM
  useEffect(() => {
    if (initialBpm !== undefined && machine.bpm !== initialBpm) {
      machine.bpm = initialBpm;
    }
  }, [initialBpm, machine]);

  const togglePlay = () => {
    if (!engine) return;

    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
    } else {
      engine.machine = machine;
      engine.play();
      setIsPlaying(true);
    }
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    machine.bpm = parseInt(e.target.value, 10);
  };

  return (
    <div className="beat-widget">
      <div className="widgetContent">
        <button
          className={`playButton ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          disabled={!engine}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <div className="bpmControl">
          <label className="bpmLabel">
            {machine.bpm} BPM
          </label>
          <input
            type="range"
            className="slider"
            min="60"
            max="200"
            value={machine.bpm}
            onChange={handleBpmChange}
            aria-label="Tempo"
          />
        </div>
      </div>

      <div className="footer">
        <a href="https://beat.salsanor.no" target="_blank" rel="noopener noreferrer">
          Powered by Salsa Beat Lab
        </a>
      </div>
    </div>
  );
});
