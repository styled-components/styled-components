---
'styled-components': patch
---

CSS generic font-family keywords (`serif`, `sans-serif`, `monospace`, `system-ui`, `ui-serif`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`, `cursive`, `fantasy`, `emoji`, `math`, `fangsong`) now resolve to a platform-specific face name on iOS and Android. `react-native-web` passes the keyword through so the browser's user-agent stylesheet applies. Comma-separated fallback lists on React Native keep only the first family (RN supports a single face); a one-time dev warning surfaces the truncation.
