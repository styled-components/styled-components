const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
// Skip the rollup `dist/` build for native dev. The babel plugin in
// `babel.config.js` substitutes the same `__SERVER__` / `__NATIVE__` /
// `__NATIVE_WEB__` constants rollup-plugin-replace handles for production
// bundles, so Metro can compile the TS source verbatim. `__NATIVE_WEB__`
// flips to `true` on the web platform only.
const styledNativeSource = path.resolve(
  workspaceRoot,
  'packages/styled-components/src/native/index.ts'
);
// On web, route `styled-components/native` imports through the bridge
// entry instead of the native engine. The bridge re-exports the same
// surface as the native entry but maps to rn-web primitives via the
// web pipeline + styleq `$$css` escape hatch.
const styledWebBridgeSource = path.resolve(
  workspaceRoot,
  'packages/styled-components/src/native/web-bridge/index.tsx'
);

// pretty-format v30 ships an ESM shim whose last line is
// `export default cjsModule.default.default`, which assumes the importer
// wrapped the CJS module in a `{ default: … }` envelope. Metro's interop
// returns the module untouched when it already carries `__esModule`, so
// `cjsModule.default` is the pretty-format function and `.default` on it
// is undefined. That leaves the module's own `default` export undefined,
// and React Native's HMR client dereferences it at startup, so the app
// dies with "Cannot read property 'default' of undefined" before it
// renders. Resolving the CJS build directly skips the broken shim.
//
// The workspace has v30 hoisted (Jest 30 pulls it in) while React Native
// asks for v29. `disableHierarchicalLookup` below stops Metro walking up
// into `react-native/node_modules`, so v30 is what it finds.
// Resolved via `package.json`, the only subpath the package's `exports`
// map exposes besides the root; asking for `build/index.js` directly is
// blocked by exports resolution.
const prettyFormatCjs = path.join(
  path.dirname(require.resolve('pretty-format/package.json', { paths: [workspaceRoot] })),
  'build/index.js'
);

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'styled-components' || moduleName === 'styled-components/native') {
    const filePath = platform === 'web' ? styledWebBridgeSource : styledNativeSource;
    return { type: 'sourceFile', filePath };
  }
  if (moduleName === 'pretty-format') {
    return { type: 'sourceFile', filePath: prettyFormatCjs };
  }
  return baseResolveRequest
    ? baseResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
