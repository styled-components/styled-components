---
'styled-components': patch
---

On React Native (Expo and other Metro projects), importing from `styled-components/native` could pull React Native Web into your iOS and Android bundles, bloating them and breaking styling on device. The correct build is now selected automatically for each platform, so React Native Web stays out of native bundles and no custom Metro resolver workaround is needed.
