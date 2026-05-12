---
'styled-components': minor
---

React Native: the public hooks (`useContainer`, `useContainerQuery`, `useContainerContext`) keep working unchanged. The container provider has moved from `ContainerContext` to `NativeStyleContext`. If your app renders `<ContainerContext.Provider>` directly from the native entry, swap it for `<NativeStyleContext.Provider value={{ container: …, cascade: DEFAULT_CASCADE }}>`. Most consumers will not need to change anything.
