// @flow
import { createMacro, MacroError } from 'babel-plugin-macros';
import babelPlugin from 'babel-plugin-styled-components';
import * as styled from '..';

const allowedImports: Array<string> = Object.keys(styled).filter(helper => helper !== '__esModule');

function styledComponentsMacro({ references, state, babel: { types: t }, config = {} }) {
  const program = state.file.path;

  // replace `styled-components/macro` by `styled-components`
  // create a node for styled-components's imports
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

    // generate new identifier and add to imports
    let id;
    if (refName === 'default') {
      id = program.scope.generateUidIdentifier('styled');
      imports.specifiers.push(t.importDefaultSpecifier(id));
    } else {
      id = program.scope.generateUidIdentifier(refName);
      imports.specifiers.push(t.importSpecifier(id, t.identifier(refName)));
    }

    // update references with the new identifiers
    references[refName].forEach(referencePath => {
      // eslint-disable-next-line no-param-reassign
      referencePath.node.name = id.name;
    });
  });

  // apply babel-plugin-styled-components to the file
  const stateWithOpts = { ...state, opts: config };
  program.traverse(babelPlugin({ types: t }).visitor, stateWithOpts);
}

const configName = 'styledComponents';

export default createMacro(styledComponentsMacro, { configName });
