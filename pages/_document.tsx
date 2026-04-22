import { Html, Head, Main, NextScript } from 'next/document'

const SITE_URL = 'https://www.socialamigo.in'
const OG_IMAGE = `${SITE_URL}/ravi.png`

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Global OG defaults */}
        <meta property="og:site_name" content="Ravi Singh — AI Engineer" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:locale" content="en_US" />

        {/* Twitter defaults */}
        <meta name="twitter:site" content="@raysk4ever" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* RSS */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Ravi Singh Blog RSS Feed"
          href={`${SITE_URL}/rss.xml`}
        />

        {/* Favicon variants */}
        <link rel="icon" href="/cloud.png" />
        <link rel="apple-touch-icon" href="/cloud.png" />

        {/* Theme color */}
        <meta name="theme-color" content="#4e77d8" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
