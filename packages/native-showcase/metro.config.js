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
  return baseResolveRequest
    ? baseResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
