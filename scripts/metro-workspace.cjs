/**
 * Metro settings shared by the React Native apps in this workspace, for pnpm's
 * isolated linker with the global virtual store.
 *
 * Under that layout every installed package is a symlink into a shared store
 * outside the repository, and a package finds its own dependencies as siblings
 * of its real path. Metro therefore needs the store as a watch folder and must
 * keep its hierarchical lookup (the default), and the singleton packages need
 * pinning to the app's copy.
 */

const fs = require('fs');
const path = require('path');

const STORE_LINKS_SEGMENT = `${path.sep}links${path.sep}`;

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
 * Packages that must exist once per bundle. Every importer gets the app's copy:
 * react-native and its dependency react-native/virtualized-lists import each
 * other, and the store can hold more than one link set for that pair.
 */
const SINGLETONS = new Set(['react', 'react-dom', 'react-native', 'react-native-web']);

/**
 * Wraps a Metro `resolveRequest` so each singleton resolves from the app for
 * every importer, and the library workspace (consumed by the apps through a
 * workspace link) loads every package the app declares from the app's copy. The
 * library lists react-native as an optional peer, so pnpm may give it a
 * different patch release than the app, and two copies of react or react-native
 * in one bundle crash at startup.
 */
function pinSingletonsToApp({ libraryRoot, projectRoot, resolveRequest }) {
  const appPackage = require(path.join(projectRoot, 'package.json'));
  const declared = new Set(
    Object.keys({ ...appPackage.dependencies, ...appPackage.devDependencies })
  );
  const libraryPrefix = libraryRoot + path.sep;
  const appOrigin = path.join(projectRoot, 'package.json');

  return (context, moduleName, platform) => {
    const fromLibrary = context.originModulePath.startsWith(libraryPrefix);
    const bare = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);

    if (bare) {
      const parts = moduleName.split('/');
      const packageName = moduleName.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
      const pinned = declared.has(packageName) && (fromLibrary || SINGLETONS.has(packageName));

      if (pinned) {
        return resolveRequest({ ...context, originModulePath: appOrigin }, moduleName, platform);
      }
    }

    return resolveRequest(context, moduleName, platform);
  };
}

module.exports = { pinSingletonsToApp, storeWatchFolders };
