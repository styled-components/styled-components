// Substitutes the build-time constants rollup-plugin-replace handles for
// production bundles (see `packages/styled-components/rollup.config.mjs`):
// `__SERVER__` → false, `__NATIVE__` → true, `__NATIVE_WEB__` → true on
// the web platform. Metro pulls styled-components from source via
// `metro.config.js`, so without this the bare identifiers would
// ReferenceError at runtime.
function makeReplaceBuildConstants(isWebTarget) {
  return ({ types: t }) => ({
    name: 'styled-components-native-build-constants',
    visitor: {
      ReferencedIdentifier(path) {
        if (path.node.name === '__SERVER__') {
          path.replaceWith(t.booleanLiteral(false));
        } else if (path.node.name === '__NATIVE__') {
          path.replaceWith(t.booleanLiteral(true));
        } else if (path.node.name === '__NATIVE_WEB__') {
          path.replaceWith(t.booleanLiteral(isWebTarget));
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
