import type { AppProps } from 'next/app';
import Head from 'next/head';
import { GoogleAnalyticsScript } from '../components/google-analytics';
import '../styles/globals.scss';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Salsa Beat Lab 🎼🎹</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
      <GoogleAnalyticsScript />
    </>
  );
}

export default MyApp;
