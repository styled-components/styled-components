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
    return { type: 'sourceFile', filePath: styledNativeSource };
  }
  return baseResolveRequest
    ? baseResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
