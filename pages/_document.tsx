import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta property="og:site_name" content="Ravi Singh Portfolio" />
        <meta name="twitter:site" content="@raysk4ever" />
          <link
            rel="alternate"
            type="application/rss+xml"
            title="Ravi Singh Blog RSS Feed"
            href="/rss.xml"
          />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
