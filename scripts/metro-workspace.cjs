/**
 * Metro settings shared by the React Native apps in this workspace, for pnpm's
 * isolated linker with the global virtual store.
 *
 * Under that layout every installed package is a symlink into a shared store
 * outside the repository, and a package finds its own dependencies as siblings
 * of its real path. Metro therefore needs the store as a watch folder and must
 * keep its hierarchical lookup (the default), and the library workspace needs
 * its singletons pinned to the app's copy.
 */

const fs = require('fs');
const path = require('path');

const STORE_LINKS_SEGMENT = `${path.sep}links${path.sep}`;

/**
 * Packages the library requires lazily without declaring them, because
 * react-native brings them along. They resolve from react-native's own
 * dependencies.
 */
const REACT_NATIVE_DEPENDENCIES = new Set(['@react-native/normalize-colors']);

/**
 * The directory holding pnpm's global virtual store slots, found from where an
 * installed package really lives. Empty when dependencies sit inside the
 * workspace (no global store), where the workspace root watch folder already
 * covers them.
 */
function storeWatchFolders(projectRoot) {
  const installed = fs.realpathSync(path.join(projectRoot, 'node_modules', 'react-native'));
  const at = installed.indexOf(STORE_LINKS_SEGMENT);

  return at === -1 ? [] : [installed.slice(0, at + STORE_LINKS_SEGMENT.length - 1)];
}

/**
 * Wraps a Metro `resolveRequest` so the library workspace (consumed by the apps
 * through a workspace link) loads the packages the app declares from the app's
 * copy. The library lists react-native as an optional peer, so pnpm may give it
 * a different patch release than the app, and two copies of react or
 * react-native in one bundle crash at startup.
 */
function pinLibraryToApp({ libraryRoot, projectRoot, resolveRequest }) {
  const appPackage = require(path.join(projectRoot, 'package.json'));
  const declared = new Set(
    Object.keys({ ...appPackage.dependencies, ...appPackage.devDependencies })
  );
  const libraryPrefix = libraryRoot + path.sep;
  const appOrigin = path.join(projectRoot, 'package.json');
  const reactNativeOrigin = path.join(
    fs.realpathSync(path.join(projectRoot, 'node_modules', 'react-native')),
    'package.json'
  );

  return (context, moduleName, platform) => {
    const fromLibrary = context.originModulePath.startsWith(libraryPrefix);
    const bare = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);

    if (fromLibrary && bare) {
      const parts = moduleName.split('/');
      const packageName = moduleName.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];

      if (declared.has(packageName)) {
        return resolveRequest({ ...context, originModulePath: appOrigin }, moduleName, platform);
      }

      if (REACT_NATIVE_DEPENDENCIES.has(packageName)) {
        return resolveRequest(
          { ...context, originModulePath: reactNativeOrigin },
          moduleName,
          platform
        );
      }
    }

    return resolveRequest(context, moduleName, platform);
  };
}

module.exports = { pinLibraryToApp, storeWatchFolders };
