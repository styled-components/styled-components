const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { pinLibraryToApp, storeWatchFolders } = require('../../scripts/metro-workspace.cjs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(projectRoot);
const defaultResolveRequest = defaultConfig.resolver.resolveRequest;

const config = {
  watchFolders: [workspaceRoot, ...storeWatchFolders(projectRoot)],
  resolver: {
    // The RN Babel preset injects `@babel/runtime` helper imports into
    // third-party code that does not declare the package, so the lookup falls
    // back to the app, which does.
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
    resolveRequest: pinLibraryToApp({
      libraryRoot: path.resolve(workspaceRoot, 'packages/styled-components'),
      projectRoot,
      resolveRequest: (context, moduleName, platform) =>
        defaultResolveRequest
          ? defaultResolveRequest(context, moduleName, platform)
          : context.resolveRequest(context, moduleName, platform),
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);
