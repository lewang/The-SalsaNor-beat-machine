import Head from 'next/head';
import Link from 'next/link';
import styles from './docs.module.css';

export default function Docs() {
  return (
    <>
      <Head>
        <title>Documentation - Salsa Beat Lab</title>
        <meta name="description" content="Complete documentation for the Salsa Beat Lab - interactive rhythm trainer for salsa and merengue" />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1>📚 Salsa Beat Lab Documentation</h1>
          <p className={styles.subtitle}>Complete guide to using the Beat Machine app and embedding widgets</p>
        </header>

        <nav className={styles.nav}>
          <a href="#app">Main App</a>
          <a href="#widget">Widget Embedding</a>
          <a href="#inline">Inline Placement</a>
          <a href="#features">Features</a>
        </nav>

        <main className={styles.main}>
          {/* Main App Documentation */}
          <section id="app" className={styles.section}>
            <h2>🎵 Main Application</h2>
            <p>The Beat Machine is an interactive rhythm trainer for Latin dance rhythms.</p>

            <h3>Getting Started</h3>
            <ol>
              <li>Visit <a href="https://beat.salsanor.no" target="_blank" rel="noopener">beat.salsanor.no</a></li>
              <li>Choose your flavor: <strong>Salsa</strong> or <strong>Merengue</strong></li>
              <li>Select BPM (tempo) using the slider</li>
              <li>Click instrument tiles to enable/disable them</li>
              <li>Press <strong>Play</strong> to start the rhythm</li>
            </ol>

            <h3>Available Instruments</h3>
            <p className={styles.note}>Note: Available instruments vary by machine type (Salsa has 12 instruments, Merengue has 8)</p>
            <div className={styles.grid}>
              <div className={styles.card}>
                <h4>🎤 Instructor</h4>
                <p>Counts the beats aloud in 6 languages</p>
              </div>
              <div className={styles.card}>
                <h4>🥁 Clave</h4>
                <p>The fundamental rhythm pattern</p>
              </div>
              <div className={styles.card}>
                <h4>🔔 Cowbell</h4>
                <p>Sharp metallic percussion</p>
              </div>
              <div className={styles.card}>
                <h4>🪘 Bongo</h4>
                <p>High-pitched hand drums</p>
              </div>
              <div className={styles.card}>
                <h4>🥁 Timbales</h4>
                <p>Latin percussion drums</p>
              </div>
              <div className={styles.card}>
                <h4>🪇 Maracas</h4>
                <p>Shaken rhythm instruments</p>
              </div>
              <div className={styles.card}>
                <h4>🥁 Congas</h4>
                <p>Deep toned hand drums</p>
              </div>
              <div className={styles.card}>
                <h4> Piano</h4>
                <p>Melodic foundation</p>
              </div>
              <div className={styles.card}>
                <h4>🎸 Bass</h4>
                <p>Low-end rhythm support</p>
              </div>
              <div className={styles.card}>
                <h4>🪈 Guiro</h4>
                <p>Scraped percussion sound</p>
              </div>
              <div className={styles.card}>
                <h4>🥁 Tambora</h4>
                <p>Dominican two-headed drum (Merengue)</p>
              </div>
            </div>

            <p className={styles.note}>💡 <strong>Note:</strong> Some instruments are machine-specific. Tambora is only available in Merengue, while Timbales, Bongos, and Maracas are Salsa-only.</p>

            <h3>Instructor Language Selection</h3>
            <p>Select the instructor's voice language using the 🌐 dropdown in the control bar:</p>
            <ul>
              <li><strong>EN</strong> - English (default)</li>
              <li><strong>IT</strong> - Italian</li>
              <li><strong>ES</strong> - Spanish</li>
              <li><strong>FR</strong> - French</li>
              <li><strong>RU</strong> - Russian</li>
              <li><strong>DE</strong> - German</li>
            </ul>
            <p className={styles.note}>💾 Your language preference is saved automatically</p>
          </section>

          {/* Widget Embedding */}
          <section id="widget" className={styles.section}>
            <h2>🔧 Embedding the Widget</h2>
            <p>Embed the Beat Machine on your own website with simple HTML.</p>

            <h3>Quick Start</h3>
            <ol>
              <li>Copy one of the snippets below</li>
              <li>Paste it into your website</li>
            </ol>

            <h3>Manual Embedding</h3>
            <p>Add this code to your HTML page:</p>

            <pre className={styles.code}><code>{`<!-- Load the widget script -->
<script src="https://beat.salsanor.no/widget.js"></script>

<!-- Place the widget where you want it -->
<div
  data-beat-widget
  data-instruments="clave,cowbell"
  data-bpm="120"
></div>`}</code></pre>

            <h3>Available Attributes</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Description</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>data-beat-widget</code></td>
                  <td>Required - identifies the widget</td>
                  <td><em>(no value)</em></td>
                </tr>
                <tr>
                  <td><code>data-instruments</code></td>
                  <td>Comma-separated list of instruments</td>
                  <td><code>"clave,cowbell,bongo"</code></td>
                </tr>
                <tr>
                  <td><code>data-bpm</code></td>
                  <td>Tempo (beats per minute)</td>
                  <td><code>"120"</code></td>
                </tr>
                <tr>
                  <td><code>data-programs</code></td>
                  <td>Select rhythm patterns for instruments</td>
                  <td><code>"clave:1,cowbell:2"</code></td>
                </tr>
                <tr>
                  <td><code>data-machine</code></td>
                  <td>Machine type (salsa or merengue)</td>
                  <td><code>"salsa"</code> or <code>"merengue"</code></td>
                </tr>
                <tr>
                  <td><code>data-autoplay</code></td>
                  <td>Start playing automatically</td>
                  <td><code>"true"</code></td>
                </tr>
                <tr>
                  <td><code>data-instructor-language</code></td>
                  <td>Instructor voice language</td>
                  <td><code>"spanish"</code> or <code>"italian"</code></td>
                </tr>
              </tbody>
            </table>

            <h3>Instrument IDs</h3>
            <p>Use these IDs in the <code>data-instruments</code> attribute:</p>
            <ul className={styles.columns}>
              <li><code>instructor</code></li>
              <li><code>clave</code></li>
              <li><code>cowbell</code></li>
              <li><code>bongo</code></li>
              <li><code>timbales</code></li>
              <li><code>maracas</code></li>
              <li><code>congas</code></li>
              <li><code>piano</code></li>
              <li><code>bass</code></li>
              <li><code>guiro</code></li>
              <li><code>tambora</code> (Merengue only)</li>
            </ul>

            <h3>Language Codes</h3>
            <p>For <code>data-instructor-language</code>:</p>
            <ul className={styles.columns}>
              <li><code>italian</code></li>
              <li><code>spanish</code></li>
              <li><code>french</code></li>
              <li><code>russian</code></li>
              <li><code>german</code></li>
              <li><em>(omit for English)</em></li>
            </ul>

            <h3>Rhythm Patterns (Programs)</h3>
            <p>Many instruments have multiple rhythm patterns you can choose from using <code>data-programs</code>:</p>
            <pre className={styles.code}><code>{`<div
  data-beat-widget
  data-instruments="clave,cowbell"
  data-programs="clave:1,cowbell:0"
  data-bpm="120"
></div>`}</code></pre>
            <p>The format is <code>instrumentId:patternIndex</code>. For example:</p>
            <ul>
              <li><strong>Clave:</strong> Pattern 0 = Son Clave, Pattern 1 = Rumba Clave</li>
              <li><strong>Cowbell:</strong> Pattern 0 = Complex, Pattern 1 = Simple</li>
            </ul>
          </section>

          {/* Inline Placement Examples */}
          <section id="inline" className={styles.section}>
            <h2>📍 Inline Widget Placement</h2>
            <p>Widgets can be placed anywhere in your content - inline with text, in sidebars, or as standalone components.</p>

            <h3>Example 1: Inline with Paragraph Text</h3>
            <pre className={styles.code}><code>{`<p>
  Here's a basic salsa clave rhythm you can practice along with:
</p>

<div
  data-beat-widget
  data-instruments="clave"
  data-bpm="90"
></div>

<p>
  Start slowly and gradually increase the tempo as you get comfortable.
</p>`}</code></pre>

            <h3>Example 2: Side-by-Side Comparison</h3>
            <pre className={styles.code}><code>{`<div style="display: flex; gap: 20px;">
  <div>
    <h3>Slow Tempo</h3>
    <div
      data-beat-widget
      data-instruments="clave,instructor"
      data-bpm="80"
      data-instructor-language="spanish"
    ></div>
  </div>

  <div>
    <h3>Fast Tempo</h3>
    <div
      data-beat-widget
      data-instruments="clave,instructor"
      data-bpm="160"
      data-instructor-language="spanish"
    ></div>
  </div>
</div>`}</code></pre>

            <h3>Example 3: Full Lesson Layout</h3>
            <pre className={styles.code}><code>{`<article>
  <h2>Lesson 1: Understanding the Clave</h2>

  <section>
    <h3>Listen to the Pattern</h3>
    <div
      data-beat-widget
      data-instruments="clave,instructor"
      data-bpm="100"
    ></div>
  </section>

  <section>
    <h3>Add the Cowbell</h3>
    <p>Now let's layer the cowbell on top:</p>
    <div
      data-beat-widget
      data-instruments="clave,cowbell,instructor"
      data-bpm="100"
    ></div>
  </section>

  <section>
    <h3>Full Rhythm</h3>
    <p>Here's the complete salsa rhythm:</p>
    <div
      data-beat-widget
      data-instruments="clave,cowbell,bongo,timbales"
      data-bpm="120"
    ></div>
  </section>
</article>`}</code></pre>

            <h3>Styling Tips</h3>
            <ul>
              <li>The widget adapts to its container width</li>
              <li>Minimum recommended width: 320px</li>
              <li>Works well in columns, sidebars, and main content areas</li>
              <li>Transparent background blends with any design</li>
            </ul>
          </section>

          {/* Features */}
          <section id="features" className={styles.section}>
            <h2>✨ Features</h2>

            <div className={styles.features}>
              <div className={styles.feature}>
                <h3>🎯 Practice Mode</h3>
                <p>Focus on specific instruments to learn patterns individually</p>
              </div>

              <div className={styles.feature}>
                <h3>🌍 Multilingual</h3>
                <p>Instructor counts in 6 languages for international users</p>
              </div>

              <div className={styles.feature}>
                <h3>🎨 Customizable</h3>
                <p>Choose instruments, tempo, and language for your needs</p>
              </div>

              <div className={styles.feature}>
                <h3>📱 Responsive</h3>
                <p>Works perfectly on desktop, tablet, and mobile devices</p>
              </div>

              <div className={styles.feature}>
                <h3>🔊 High Quality Audio</h3>
                <p>Professional samples for authentic Latin percussion sounds</p>
              </div>

              <div className={styles.feature}>
                <h3>⚡ Fast & Light</h3>
                <p>Optimized performance with minimal loading time</p>
              </div>
            </div>
          </section>

          {/* Resources */}
          <section className={styles.section}>
            <h2>🔗 Resources</h2>
            <ul>
              <li><Link href="/">Main App</Link> - Full Beat Machine experience</li>
              <li><Link href="/widget-demo">Widget Demo</Link> - Live examples of widgets</li>
              <li><a href="https://github.com/urish/beat-machine" target="_blank" rel="noopener">GitHub Repository</a> - Source code</li>
            </ul>
          </section>
        </main>

        <footer className={styles.footer}>
          <p>
            <strong>Powered by Salsa Beat Lab</strong>
          </p>
          <p>
            <a href="https://beat.salsanor.no" target="_blank" rel="noopener">beat.salsanor.no</a>
            {' · '}
            Based on <a href="https://github.com/urish/beat-machine" target="_blank" rel="noopener">Beat Machine</a> by Uri Shaked
          </p>
        </footer>
      </div>
    </>
  );
}
