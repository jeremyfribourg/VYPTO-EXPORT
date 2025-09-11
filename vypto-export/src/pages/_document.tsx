import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content="Vypto" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Vypto" />
        <meta name="description" content="Real-time cryptocurrency price tracking with voice announcements" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2B5797" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#000000" />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />

        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://vypto.app" />
        <meta name="twitter:title" content="Vypto" />
        <meta name="twitter:description" content="Real-time cryptocurrency price tracking with voice announcements" />
        <meta name="twitter:image" content="https://vypto.app/icons/icon-192x192.png" />
        <meta name="twitter:creator" content="@VyptoApp" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Vypto" />
        <meta property="og:description" content="Real-time cryptocurrency price tracking with voice announcements" />
        <meta property="og:site_name" content="Vypto" />
        <meta property="og:url" content="https://vypto.app" />
        <meta property="og:image" content="https://vypto.app/icons/icon-192x192.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
