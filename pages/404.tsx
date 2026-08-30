import Head from 'next/head';
import Link from 'next/link';
import { withBasePath } from '../services/base-path';
import styles from './404.module.css';

export default function Error404() {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <title>Not Found - Salsa Beat Lab 🎼🎹</title>

        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/x-icon" href={withBasePath('/favicon.ico')} />
        <link rel="manifest" href={withBasePath('/manifest.json')} />
        <meta name="theme-color" content="#1976d2" />
        <meta
          name="description"
          content="Explore Salsa music with an interactive rhythm machine. Practice Salsa timing and train your ears. Combine and arrange instruments to create different salsa tunes."
        />
        <meta property="og:title" content="Salsa Beat Lab" />
        <meta
          property="og:description"
          content="Explore Salsa music with an interactive rhythm machine. Practice Salsa timing and train your ears. Combine and arrange instruments to create different salsa tunes."
        />
        <meta property="og:image" content="https://www.salsabeatmachine.org/assets/images/salsabeatmachine-cover.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
      </Head>

      <div className={styles.page}>
        <h1>Page Not Found (404)</h1>

        <Link href="/">Take me 🏠</Link>
      </div>
    </>
  );
}
