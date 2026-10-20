import type { ReactNode } from 'react'
import { ScrollViewStyleReset } from 'expo-router/html'

/**
 * The web export's HTML shell — Expo Router's default, plus the page's own
 * background.
 *
 * Mobile Safari tints its status bar and bottom toolbar from the PAGE, not from
 * the app drawn inside it: with the default shell the page is white, so a dark
 * app sat between two white bars (owner, 2026-10-20, on an iPhone). `#070708` is
 * `--background` (src/theme/global.css); `theme-color` says the same for the
 * browsers that read it. Serves the app and the link views alike — both are dark.
 *
 * Web only: native builds never render this file.
 */
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#070708" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background-color:#070708}' }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
