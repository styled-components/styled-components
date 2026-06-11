---
'styled-components': patch
---

React Native: on Expo and other Metro projects, importing from `styled-components/native` selects the correct build automatically for each platform, so react-native-web stays out of your iOS and Android bundles and no custom Metro resolver workaround is needed. This keeps the device bundle small and styling intact on device.
