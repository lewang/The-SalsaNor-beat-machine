import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { observable } from 'mobx';
import { useMachine } from '../hooks/use-machine';
import { IMachine } from '../engine/machine-interfaces';

// Import WidgetCompact with SSR disabled
const WidgetCompact = dynamic(
  () => import('../src/widget/WidgetCompact').then(mod => mod.WidgetCompact),
  { ssr: false }
);

export default function WidgetDemo() {
  // Load the real salsa machine with audio samples
  const salsaMachine = useMachine('/assets/machines/salsa.xml');

  // Create observable copies with filtered instruments and custom BPM
  const createFilteredMachine = (instruments: string[], bpm: number): IMachine | null => {
    if (!salsaMachine) return null;

    return observable({
      ...salsaMachine,
      bpm,
      instruments: salsaMachine.instruments.map(inst =>
        observable({
          ...inst,
          enabled: instruments.includes(inst.id)
        })
      )
    });
  };

  // Don't render until machine is loaded
  if (!salsaMachine) {
    return (
      <>
        <Head>
          <title>Widget Demo - Salsa Beat Lab</title>
        </Head>
        <div style={containerStyle}>
          <div style={wrapperStyle}>
            <h1 style={titleStyle}>🎵 Loading Salsa Beat Lab...</h1>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Widget Demo - Salsa Beat Lab</title>
        <meta name="description" content="Live examples of Salsa Beat Lab widgets with embed code" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={containerStyle}>
        <div style={wrapperStyle}>
          <nav style={navStyle}>
            <Link href="/" style={navLinkStyle}>🏠 Main App</Link>
            <Link href="/docs" style={navLinkStyle}>📚 Documentation</Link>
          </nav>

          <h1 style={titleStyle}>🎵 Salsa Beat Lab Widget Demo</h1>
          <p style={{ ...textStyle, textAlign: 'center', marginBottom: '3rem' }}>
            Live examples showing how to embed the Beat Machine widget on your website
          </p>

          {/* Example 1: Basic Clave */}
          <div style={sectionStyle}>
            <h2 style={subtitleStyle}>Example 1: Simple Clave Pattern</h2>
            <p style={textStyle}>The most basic usage - just a clave rhythm with default settings.</p>
            <pre style={preStyle}><code style={codeStyle}>&lt;div data-beat-widget data-instruments="clave"&gt;&lt;/div&gt;</code></pre>
            <div style={demoBoxStyle}>
              <WidgetCompact machine={createFilteredMachine(['clave'], 120)!} />
            </div>
          </div>

          {/* Example 2: Cowbell at 140 BPM */}
          <div style={sectionStyle}>
            <h2 style={subtitleStyle}>Example 2: Cowbell with Custom Tempo</h2>
            <p style={textStyle}>Cowbell rhythm at a faster tempo of 140 BPM.</p>
            <pre style={preStyle}><code style={codeStyle}>&lt;div data-beat-widget data-instruments="cowbell" data-bpm="140"&gt;&lt;/div&gt;</code></pre>
            <div style={demoBoxStyle}>
              <WidgetCompact machine={createFilteredMachine(['cowbell'], 140)!} />
            </div>
          </div>

          {/* Example 3: Multiple Instruments */}
          <div style={sectionStyle}>
            <h2 style={subtitleStyle}>Example 3: Salsa Rhythm Combination</h2>
            <p style={textStyle}>Multiple instruments playing together - clave, cowbell, and bongo.</p>
            <pre style={preStyle}><code style={codeStyle}>&lt;div data-beat-widget data-instruments="clave,cowbell,bongo" data-bpm="120"&gt;&lt;/div&gt;</code></pre>
            <div style={demoBoxStyle}>
              <WidgetCompact machine={createFilteredMachine(['clave', 'cowbell', 'bongo'], 120)!} />
            </div>
          </div>

          {/* Example 4: Slow Tempo */}
          <div style={sectionStyle}>
            <h2 style={subtitleStyle}>Example 4: Educational Slow Tempo</h2>
            <p style={textStyle}>Perfect for learning - clave at a slow 80 BPM.</p>
            <pre style={preStyle}><code style={codeStyle}>&lt;div data-beat-widget data-instruments="clave" data-bpm="80"&gt;&lt;/div&gt;</code></pre>
            <div style={demoBoxStyle}>
              <WidgetCompact machine={createFilteredMachine(['clave'], 80)!} />
            </div>
          </div>

          {/* Example 5: Inline */}
          <div style={sectionStyle}>
            <h2 style={subtitleStyle}>Example 5: Inline with Paragraph</h2>
            <p style={textStyle}>
              You can even embed the widget inline with text, like this:{' '}
              <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                <WidgetCompact machine={createFilteredMachine(['clave'], 100)!} />
              </span>
              {' '}See how it flows naturally with the content?
            </p>
            <p style={textStyle}>Here's the code for inline embedding:</p>
            <pre style={preStyle}><code style={codeStyle}>{`<p>
  Practice with this rhythm:
  <span style="display: inline-flex; vertical-align: middle;">
    <div data-beat-widget data-instruments="clave" data-bpm="100"></div>
  </span>
  Try to count along!
</p>`}</code></pre>
          </div>

          {/* Usage Instructions */}
          <div style={sectionStyle}>
            <h2 style={subtitleStyle}>📦 How to Use on Your Website</h2>
            <p style={textStyle}><strong>Step 1:</strong> Add this script tag to your HTML page (before closing &lt;/body&gt; tag):</p>
            <pre style={preStyle}><code style={codeStyle}>&lt;script src="https://beat.salsanor.no/widget.js"&gt;&lt;/script&gt;</code></pre>

            <p style={textStyle}><strong>Step 2:</strong> Add the widget anywhere in your HTML:</p>
            <pre style={preStyle}><code style={codeStyle}>{`<div
  data-beat-widget
  data-instruments="clave,cowbell"
  data-bpm="120"
></div>`}</code></pre>

            <p style={textStyle}><strong>Step 3:</strong> Customize with these attributes:</p>
            <ul style={listStyle}>
              <li><code style={inlineCodeStyle}>data-instruments</code> - Comma-separated list: clave, cowbell, bongo, timbales, maracas, piano, bass, instructor</li>
              <li><code style={inlineCodeStyle}>data-bpm</code> - Tempo (beats per minute): 60-200</li>
              <li><code style={inlineCodeStyle}>data-instructor-language</code> - Language for instructor voice: italian, spanish, french, russian, german</li>
            </ul>

            <p style={textStyle}><strong>Complete Example:</strong></p>
            <pre style={preStyle}><code style={codeStyle}>{`<!DOCTYPE html>
<html>
<head>
  <title>My Salsa Page</title>
</head>
<body>
  <h1>Learn Salsa Timing</h1>

  <!-- The widget -->
  <div
    data-beat-widget
    data-instruments="clave,instructor"
    data-bpm="100"
    data-instructor-language="spanish"
  ></div>

  <!-- Load the widget script -->
  <script src="https://beat.salsanor.no/widget.js"></script>
</body>
</html>`}</code></pre>
          </div>

          {/* Footer with links */}
          <div style={footerStyle}>
            <p style={{ margin: '1rem 0' }}>
              <strong>Need help?</strong> Check out the{' '}
              <Link href="/docs" style={linkStyle}>full documentation</Link>.
            </p>
            <p style={{ margin: '1rem 0', fontSize: '0.875rem', opacity: 0.7 }}>
              Powered by Salsa Beat Lab · <a href="https://beat.salsanor.no" style={linkStyle}>beat.salsanor.no</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Inline styles
const containerStyle: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  color: 'rgba(255, 255, 255, 0.95)',
  padding: '2rem',
  minHeight: '100vh',
};

const wrapperStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
};

const titleStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '3rem',
  background: 'linear-gradient(135deg, #FFC947 0%, #FF9933 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const sectionStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '1rem',
  padding: '2rem',
  marginBottom: '2rem',
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '1rem',
  color: '#FFC947',
};

const textStyle: React.CSSProperties = {
  marginBottom: '1rem',
  lineHeight: 1.6,
};

const preStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  padding: '1rem',
  borderRadius: '0.5rem',
  overflow: 'auto',
  margin: '1rem 0',
};

const codeStyle: React.CSSProperties = {
  fontFamily: "'Fira Code', monospace",
  fontSize: '0.875rem',
  color: '#FFC947',
};

const demoBoxStyle: React.CSSProperties = {
  padding: '1rem',
  background: 'rgba(0, 0, 0, 0.2)',
  borderRadius: '0.5rem',
  margin: '1rem 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginBottom: '2rem',
  padding: '1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '0.5rem',
  backdropFilter: 'blur(10px)',
};

const navLinkStyle: React.CSSProperties = {
  color: '#FFC947',
  textDecoration: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  transition: 'all 0.2s',
  fontWeight: 500,
};

const listStyle: React.CSSProperties = {
  marginLeft: '1.5rem',
  marginTop: '1rem',
  lineHeight: 1.8,
};

const inlineCodeStyle: React.CSSProperties = {
  background: 'rgba(255, 193, 7, 0.2)',
  padding: '0.125rem 0.375rem',
  borderRadius: '0.25rem',
  fontFamily: "'Fira Code', monospace",
  fontSize: '0.875rem',
  color: '#FFC947',
};

const linkStyle: React.CSSProperties = {
  color: '#FFC947',
  textDecoration: 'none',
  fontWeight: 500,
};

const footerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '3rem',
  paddingTop: '2rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
};
