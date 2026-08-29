import { GetStaticProps } from 'next';
import Head from 'next/head';
import { BeatMachineUIGlass } from '../components/beat-machine-ui-glass';
import { loadMachine } from '../services/load-machine';
import type { IDefaultMachines } from '../components/beat-machine-ui';
import styles from './index.module.scss';

interface IHomeProps {
  machines: IDefaultMachines;
}

export default function Home({ machines }: IHomeProps) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <title>Salsa Beat Lab 🎼🎹</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF9933" />
        <meta
          name="description"
          content="Explore Salsa music with an interactive rhythm machine. Practice Salsa timing and train your ears. Combine and arrange instruments to create different salsa tunes."
        />
        <meta property="og:title" content="Salsa Beat Lab" />
        <meta
          property="og:description"
          content="Explore Salsa music with an interactive rhythm machine. Practice Salsa timing and train your ears. Combine and arrange instruments to create different salsa tunes."
        />
        <meta property="og:url" content="https://salsanor.no" />
        <meta property="og:image" content="https://salsabeatmachine.org/assets/images/salsabeatmachine-cover.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
      </Head>

      <main className={styles.homepage}>
        <h1 className={styles.title}>🎵 Salsa Beat Lab</h1>

        <div className={styles.appContainer}>
          <BeatMachineUIGlass machines={machines} />
        </div>

        <div className={styles.linkBar}>
          <a href="/docs" className={styles.link}>
            📚 Documentation
          </a>
        </div>

        <footer className={styles.footer}>
          <p>
            Based on the original{' '}
            <a
              href="https://github.com/urish/beat-machine"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              Beat Machine
            </a>
            {' '}by{' '}
            <a
              href="https://github.com/urish"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              Uri Shaked
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<IHomeProps> = async () => {
  try {
    const salsa = await loadMachine('salsa.xml');
    const merengue = await loadMachine('merengue.xml');
    return {
      props: {
        machines: { salsa, merengue },
      },
    };
  } catch (error) {
    console.error('Failed to load machines:', error);
    return {
      notFound: true,
    };
  }
};
