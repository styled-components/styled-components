import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Expo Router web HTML shell. The native entry of styled-components
 * resolves theme tokens to literal hex on rn-web, so dark-mode chrome
 * relies on the browser-native `light-dark()` CSS function. That
 * function only honors `prefers-color-scheme` when the document opts
 * into dark via `color-scheme` — without this meta, `light-dark()`
 * silently falls back to its first (light) argument.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
