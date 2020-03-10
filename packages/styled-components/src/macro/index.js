// @flow
import traverse from '@babel/traverse';
import { createMacro } from 'babel-plugin-macros';
import babelPlugin from 'babel-plugin-styled-components';

function styledComponentsMacro({ references, state, babel: { types: t }, config = {} }) {
  const program = state.file.path;

  // FIRST STEP : replace `styled-components/macro` by `styled-components
  // references looks like this
  // { default: [path, path], css: [path], ... }
  let customImportName;
  const importedNames = new Set();
  const statement = t.importDeclaration([], t.stringLiteral('styled-components'));
  program.unshiftContainer('body', [statement]);
  Object.keys(references).forEach(refName => {
    references[refName].forEach(referencePath => {
      const { name } = referencePath.node;
      if (importedNames.has(name)) {
        return;
      }
      importedNames.add(name);
      const identifier = t.identifier(name);
      if (refName === 'default') {
        customImportName = name;
        statement.specifiers.push(t.importDefaultSpecifier(identifier));
      } else {
        statement.specifiers.push(
          t.importSpecifier(identifier, t.identifier(refName))
        );
      }
    });
  });

  // SECOND STEP : apply babel-plugin-styled-components to the file
  const stateWithOpts = { ...state, opts: config, customImportName };
  traverse(program.parent, babelPlugin({ types: t }).visitor, undefined, stateWithOpts);
}

export default createMacro(styledComponentsMacro, {
  configName: 'styledComponents',
});
