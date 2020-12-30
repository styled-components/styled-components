// @flow
import traverse from '@babel/traverse';
import { createMacro } from 'babel-plugin-macros';
import babelPlugin from 'babel-plugin-styled-components';

function styledComponentsMacro({ references, source, state, babel: { types }, config = {} }) {
  // Replace macro imports with `styled-components`.
  traverse(state.file.ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === source) {
        path.node.source.value = 'styled-components';
      }
    },
    VariableDeclaration(path) {
      path.node.declarations.forEach(declaration => {
        if (declaration.init.type === 'CallExpression') {
          const { callee, arguments: args } = declaration.init;
          if (
            callee.type === 'Identifier' &&
            callee.name === 'require' &&
            args.length === 1 &&
            args[0].value === source
          ) {
            args[0].value = 'styled-components';
          }
        }
      });
    },
  });

  // Find name of default export if it was used.
  let customImportName;
  if ('default' in references && references['default'].length > 0) {
    customImportName = references['default'][0].node.name;
  }

  // Run Babel plugin.
  const stateWithOpts = { ...state, opts: config, customImportName };
  traverse(state.file.ast, babelPlugin({ types }).visitor, undefined, stateWithOpts);

  // Don't remove the newly-modified import statement.
  return { keepImports: true };
}

export default createMacro(styledComponentsMacro, {
  configName: 'styledComponents',
});
