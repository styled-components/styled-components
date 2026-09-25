import * as acorn from 'acorn';

/**
 * Node-only globals with no browser counterpart. Referencing one directly
 * (not behind a `typeof` guard) throws in a browser without a polyfill
 * (#5819).
 */
export const NODE_GLOBAL_NAMES = new Set([
  'process',
  'Buffer',
  'global',
  '__dirname',
  '__filename',
  'setImmediate',
]);

/** A single offending reference: the global's name and a snippet of
 *  surrounding source so a human can find it in the bundle. */
export interface NodeGlobalReference {
  name: string;
  snippet: string;
}

const SNIPPET_RADIUS = 40;

function snippetAround(code: string, start: number, end: number): string {
  const from = Math.max(0, start - SNIPPET_RADIUS);
  const to = Math.min(code.length, end + SNIPPET_RADIUS);
  return code.slice(from, to);
}

/**
 * True when the Identifier found at `parent[key]` is a declared name (a
 * function/class name, an imported/exported binding, a statement label)
 * rather than a reference to that name's value. Destructured and plain
 * function-parameter bindings are treated as never colliding with these
 * exact global names (a real bundler will not shadow them), so they are
 * skipped one level up, in the `params` handling below, rather than here.
 */
function isBindingPosition(parent: any, key: string): boolean {
  if (!parent) return false;
  switch (parent.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
    case 'ClassDeclaration':
    case 'ClassExpression':
      return key === 'id';
    case 'ImportSpecifier':
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
      return key === 'local' || key === 'imported';
    case 'ExportSpecifier':
      return key === 'local' || key === 'exported';
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return key === 'label';
    default:
      return false;
  }
}

/**
 * Finds every free (non-binding, non-property-name) Identifier reference to
 * a Node-only global in `code`. Allowed: the direct operand of `typeof`
 * (`typeof process`, which never throws even when `process` is undeclared),
 * and `process` as the object of a `.env` member access. Everything else is
 * reported with a snippet of surrounding source.
 *
 * A generic, duck-typed walk over the parsed AST (rather than a per-node-type
 * visitor table): the acorn/ESTree node shape is heterogeneous by design, so
 * `any` here reflects that the shape truly is unknown at each step, the same
 * way a generic AST-walking library (e.g. estree-walker) is typed.
 */
export function findFreeNodeGlobalRefs(code: string): NodeGlobalReference[] {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  const found: NodeGlobalReference[] = [];
  const visited = new Set<object>();

  function visit(node: any, parent: any, key: string | null): void {
    if (!node || typeof node.type !== 'string' || visited.has(node)) return;
    visited.add(node);

    if (node.type === 'Identifier' && NODE_GLOBAL_NAMES.has(node.name)) {
      const isTypeofOperand =
        parent &&
        parent.type === 'UnaryExpression' &&
        parent.operator === 'typeof' &&
        key === 'argument';
      const isProcessEnvObject =
        node.name === 'process' &&
        parent &&
        parent.type === 'MemberExpression' &&
        key === 'object' &&
        !parent.computed &&
        parent.property &&
        parent.property.type === 'Identifier' &&
        parent.property.name === 'env';

      if (!isTypeofOperand && !isProcessEnvObject && !isBindingPosition(parent, key || '')) {
        found.push({ name: node.name, snippet: snippetAround(code, node.start, node.end) });
      }
      return;
    }

    for (const childKey in node) {
      if (childKey === 'type' || childKey.charCodeAt(0) === 95 /* _ */) continue;

      // A non-computed member/property name is not a reference.
      if (childKey === 'property' && node.type === 'MemberExpression' && !node.computed) continue;
      if (childKey === 'key' && node.type === 'Property' && !node.computed) continue;

      // Function name and parameter bindings are declarations, not
      // references; a parameter's default value is still checked.
      if (
        (node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression') &&
        childKey === 'params'
      ) {
        for (const param of node.params) {
          if (param.type === 'AssignmentPattern') visit(param.right, param, 'right');
        }
        continue;
      }
      // Declared name(s) on the left of `=`; `init` (visited via the
      // generic path below) is the reference side.
      if (node.type === 'VariableDeclarator' && childKey === 'id') continue;
      if (node.type === 'CatchClause' && childKey === 'param') continue;

      const value = node[childKey];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child.type === 'string') visit(child, node, childKey);
        }
      } else if (value && typeof value.type === 'string') {
        visit(value, node, childKey);
      }
    }
  }

  visit(ast, null, null);
  return found;
}
