import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Analytics } from '@vercel/analytics/react';
import Navbar from '@/components/navbar';

import "highlight.js/styles/atom-one-dark.css";


export default function App({ Component, pageProps }: AppProps) {
  return <>
    <Navbar />
    <Component {...pageProps} />
    <Analytics />
  </>
}
