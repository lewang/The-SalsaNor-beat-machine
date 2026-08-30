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
          <p className={styles.subtitle}>Complete guide to using the Beat Machine app</p>
        </header>

        <nav className={styles.nav}>
          <a href="#app">Main App</a>
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
