// Substitutes styled-components' build-time constants so Metro can
// compile its TS source verbatim (see `metro.config.js`). Mirrors
// `packages/styled-components/rollup.config.mjs`:
//
//   native target:
//     __SERVER__       → false
//     __NATIVE__       → true
//     __NATIVE_WEB__   → false
//
//   web target (rn-web bridge):
//     __SERVER__       → false
//     __NATIVE__       → false  (bridge routes through the web pipeline)
//     __NATIVE_WEB__   → true
//
//   __DEV__            → process.env.NODE_ENV !== 'production'
//   __VERSION__        → string literal from package.json
const sgPkg = require('styled-components/package.json');
const sgVersion = sgPkg.version;

function makeReplaceBuildConstants(isWebTarget) {
  const isDev = process.env.NODE_ENV !== 'production';
  return ({ types: t }) => ({
    name: 'styled-components-native-build-constants',
    visitor: {
      ReferencedIdentifier(path) {
        if (path.node.name === '__SERVER__') {
          path.replaceWith(t.booleanLiteral(false));
        } else if (path.node.name === '__NATIVE__') {
          path.replaceWith(t.booleanLiteral(!isWebTarget));
        } else if (path.node.name === '__NATIVE_WEB__') {
          path.replaceWith(t.booleanLiteral(isWebTarget));
        } else if (path.node.name === '__DEV__') {
          path.replaceWith(t.booleanLiteral(isDev));
        } else if (path.node.name === '__VERSION__') {
          path.replaceWith(t.stringLiteral(sgVersion));
        }
      },
    },
  });
}

module.exports = function (api) {
  const platform = api.caller(caller => (caller && caller.platform) || 'unknown');
  api.cache.using(() => platform);
  const isWebTarget = platform === 'web';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      makeReplaceBuildConstants(isWebTarget),
      // Stamps every `const X = styled.View`...`` with `displayName: 'X'`
      // (and a stable componentId) so the React DevTools tree, Hermes
      // inspector, and tree-walking error overlays show the variable name
      // instead of "Styled(View)" / unnamed Memo nodes.
      [
        'babel-plugin-styled-components',
        {
          displayName: true,
          fileName: false,
          // The plugin only matches `import styled from 'styled-components'` by
          // default. We import from the `/native` subpath, so without this it
          // silently skips every declaration in the showcase.
          topLevelImportPaths: ['styled-components/native', 'styled-components'],
        },
      ],
    ],
  };
};
