import { addDefault, addNamed } from '@babel/helper-module-imports';
import traverse from '@babel/traverse';
import { createMacro } from 'babel-plugin-macros';
import babelPlugin from 'babel-plugin-styled-components';

function styledComponentsMacro({
  references,
  state,
  babel: { types: t },
  config: { importModuleName = 'styled-components', ...config } = {},
}) {
  const program = state.file.path;

  // FIRST STEP : replace `styled-components/macro` by `styled-components
  // references looks like this
  // { default: [path, path], css: [path], ... }
  let customImportName;
  Object.keys(references).forEach(refName => {
    // generate new identifier
    let id;
    if (refName === 'default') {
      id = addDefault(program, importModuleName, { nameHint: 'styled' });
      customImportName = id;
    } else {
      id = addNamed(program, refName, importModuleName, { nameHint: refName });
    }

    // update references with the new identifiers
    references[refName].forEach(referencePath => {
      // eslint-disable-next-line no-param-reassign
      referencePath.node.name = id.name;
    });
  });

  // SECOND STEP : apply babel-plugin-styled-components to the file
  const stateWithOpts = {
    ...state,
    opts: {
      ...config,
      topLevelImportPaths: (config.topLevelImportPaths || []).concat(importModuleName),
    },
    customImportName,
  };
  traverse(program.parent, babelPlugin({ types: t }).visitor, undefined, stateWithOpts);
}

export default createMacro(styledComponentsMacro, {
  configName: 'styledComponents',
});
