// @flow
import { createMacro, MacroError } from 'babel-plugin-macros';
import babelPlugin from 'babel-plugin-styled-components';

const allowedImports = [
  'css',
  'keyframes',
  'createGlobalStyle',
  'isStyledComponent',
  'ThemeConsumer',
  'ThemeProvider',
  'withTheme',
  'ServerStyleSheet',
  'StyleSheetManager',
  '__DO_NOT_USE_OR_YOU_WILL_BE_HAUNTED_BY_SPOOKY_GHOSTS',
  'default',
];

function styledComponentsMacro({ references, state, babel: { types: t }, config = {} }) {
  // create a node for styled-components's imports
  const program = state.file.path;
  const imports = t.importDeclaration([], t.stringLiteral('styled-components'));
  // and add it to top of the document
  program.node.body.unshift(imports);

  // references looks like this
  // { default: [path, path], css: [path], ... }
  Object.keys(references).forEach(refName => {
    if (!allowedImports.includes(refName)) {
      throw new MacroError(
        `Invalid import: ${refName}. You can only import ${allowedImports.join(
          ', '
        )} from 'styled-components/macro'.`
      );
    }

    // add imports
    let id;
    if (refName === 'default') {
      id = program.scope.generateUidIdentifier('styled');
      imports.specifiers.push(t.importDefaultSpecifier(id));
    } else {
      id = program.scope.generateUidIdentifier(refName);
      imports.specifiers.push(t.importSpecifier(id, t.identifier(refName)));
    }

    references[refName].forEach(referencePath => {
      // transform the variable imported for the macro
      // into the new id generated
      // eslint-disable-next-line no-param-reassign
      referencePath.node.name = id.name;
    });
  });

  const stateWithOpts = { ...state, opts: config };
  program.traverse(babelPlugin({ types: t }).visitor, stateWithOpts);
}

const configName = 'styledComponents';

export default createMacro(styledComponentsMacro, { configName });

export { allowedImports };
