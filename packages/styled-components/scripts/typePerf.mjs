#!/usr/bin/env node
/**
 * Consumer type-check budget.
 *
 * Generates a fixture in the shape large apps actually have -- many styled
 * components, `styled(Component)` wrapping, attrs chains, and a minority of
 * polymorphic `as` call sites -- type-checks it against the BUILT `dist/*.d.ts`
 * (what consumers and editors resolve, not `src`), and fails when types or
 * instantiations exceed the committed budget.
 *
 * This exists because 6.4.3 shipped a regression that tripled consumer
 * type-check cost and nothing in CI could see it (#5767).
 *
 *   node scripts/typePerf.mjs            check against the budget
 *   node scripts/typePerf.mjs --update   rewrite the budget from this run
 *   node scripts/typePerf.mjs --count 500
 *
 * Requires `pnpm build` first.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workDir = join(pkgRoot, '.type-perf');
const budgetFile = join(pkgRoot, 'type-perf.budget.json');

const args = process.argv.slice(2);
const update = args.includes('--update');

// Parsed explicitly rather than via indexOf+1, which reads argv[0] when the flag
// is absent (indexOf returns -1) and silently falls back to the default when the
// flag is present but valueless. A miscounted fixture measures the wrong thing.
const countFlag = args.indexOf('--count');
let count = 100;
if (countFlag !== -1) {
  count = Number(args[countFlag + 1]);
  if (!Number.isInteger(count) || count < 1) {
    console.error(`type-perf: --count needs a positive integer, got ${args[countFlag + 1]}`);
    process.exit(1);
  }
}

if (!existsSync(join(pkgRoot, 'dist', 'index.d.ts'))) {
  console.error('type-perf: dist/index.d.ts missing -- run `pnpm build` first.');
  process.exit(1);
}

// -- fixture ---------------------------------------------------------------

const TAGS = ['div', 'span', 'button', 'a', 'p', 'section', 'li', 'input'];
const AS_TAGS = ['a', 'button', 'label', 'section', 'video', 'ul'];

const HEADER = `import * as React from 'react';
import styled from 'styled-components';

interface BaseProps {
  $variant?: 'primary' | 'secondary';
  $size?: number;
  $active?: boolean;
  label?: string;
}

const Plain = (props: BaseProps & { className?: string; children?: React.ReactNode }) => (
  <div className={props.className}>{props.children}</div>
);

const Other = (props: { href?: string; children?: React.ReactNode }) => <a {...props} />;
`;

function unit(i) {
  const tag = TAGS[i % TAGS.length];
  const kind = i % 20;
  const N = `C${i}`;
  let decl;

  if (kind < 8) {
    decl = `const ${N} = styled.${tag}<{ $a${i}?: number; $b${i}?: string; $c${i}?: boolean }>\`
  color: \${p => (p.$c${i} ? 'red' : 'blue')};
  padding: \${p => p.$a${i} ?? 0}px;
\`;`;
  } else if (kind < 13) {
    decl = `const ${N} = styled(Plain)<{ $a${i}?: number }>\`
  margin: \${p => p.$a${i} ?? 0}px;
  color: \${p => (p.$active ? 'green' : 'gray')};
\`;`;
  } else if (kind < 16) {
    decl = `const ${N} = styled(${i > 0 ? `C${i - 1}` : 'Plain'})<{ $x${i}?: string }>\`
  border-color: \${p => p.$x${i} ?? 'black'};
\`;`;
  } else if (kind < 18) {
    decl = `const ${N} = styled.${tag}.attrs<{ $a${i}?: number }>({ $a${i}: ${i} })\`
  width: \${p => p.$a${i}}px;
\`;`;
  } else {
    decl = `const ${N} = styled(Plain).attrs({ $size: ${i} })\`
  height: \${p => p.$size}px;
\`;`;
  }

  const sites = [`<${N} />`, `<${N} className="x">{'t'}</${N}>`];
  if (i % 10 === 0) sites.push(`<${N} as="${AS_TAGS[i % AS_TAGS.length]}" />`);
  if (i % 33 === 0) sites.push(`<${N} as={Other} href="/x" />`);
  if (i % 50 === 0) sites.push(`<${N} forwardedAs="ul" />`);

  return `${decl}

export const Use${i} = () => (
  <>
    ${sites.join('\n    ')}
  </>
);
`;
}

rmSync(workDir, { recursive: true, force: true });
mkdirSync(join(workDir, 'src'), { recursive: true });

const PER_FILE = 20;
for (let start = 0, f = 0; start < count; start += PER_FILE, f++) {
  const body = [];
  for (let i = start; i < Math.min(start + PER_FILE, count); i++) body.push(unit(i));
  writeFileSync(join(workDir, 'src', `mod${f}.tsx`), `${HEADER}\n${body.join('\n')}`);
}

writeFileSync(
  join(workDir, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        baseUrl: '.',
        jsx: 'react-jsx',
        lib: ['ES2021', 'DOM'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        noEmit: true,
        // Resolve the package the way a consumer does, through its `types` entry.
        paths: { 'styled-components': ['..'] },
        skipLibCheck: true,
        strict: true,
        target: 'ES2020',
        types: [],
      },
      include: ['src'],
    },
    null,
    2
  )}\n`
);

// -- measure ---------------------------------------------------------------

const tsc = join(pkgRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');
const tscPath = existsSync(tsc)
  ? tsc
  : resolve(pkgRoot, '..', '..', 'node_modules', 'typescript', 'lib', 'tsc.js');

function run(extraArgs) {
  try {
    return execFileSync(process.execPath, [tscPath, '-p', workDir, ...extraArgs], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    // tsc exits non-zero when the fixture has type errors; keep its output.
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

// A fixture that fails to resolve the package type-checks almost instantly and
// looks like an enormous win. Never report numbers for a run that isn't clean.
const errors = run([])
  .split('\n')
  .filter(line => line.includes('error TS'));
if (errors.length > 0) {
  console.error(`type-perf: fixture did not compile cleanly (${errors.length} errors):`);
  console.error(errors.slice(0, 5).join('\n'));
  process.exit(1);
}

const out = run(['--extendedDiagnostics']);
const read = label => Number((out.match(new RegExp(`^${label}:\\s+(\\d+)`, 'm')) ?? [])[1]);
const measured = { instantiations: read('Instantiations'), types: read('Types') };

if (!measured.types || !measured.instantiations) {
  console.error('type-perf: could not parse tsc diagnostics.\n', out);
  process.exit(1);
}

const tsVersion = run(['--version']).trim();
console.log(`type-perf: ${count} components, ${tsVersion}`);
console.log(`  types:          ${measured.types.toLocaleString()}`);
console.log(`  instantiations: ${measured.instantiations.toLocaleString()}`);

if (update) {
  // Headroom absorbs ordinary compiler and @types/react patch drift while still
  // catching a regression of the size #5767 reported (+75% instantiations).
  const pad = n => Math.ceil((n * 1.15) / 1000) * 1000;
  writeFileSync(
    budgetFile,
    `${JSON.stringify(
      { count, maxInstantiations: pad(measured.instantiations), maxTypes: pad(measured.types) },
      null,
      2
    )}\n`
  );
  console.log(`type-perf: budget updated in ${budgetFile}`);
  process.exit(0);
}

const budget = JSON.parse(readFileSync(budgetFile, 'utf8'));
if (budget.count !== count) {
  console.error(`type-perf: budget is for ${budget.count} components, measured ${count}.`);
  process.exit(1);
}

const over = [
  ['types', measured.types, budget.maxTypes],
  ['instantiations', measured.instantiations, budget.maxInstantiations],
].filter(([, actual, max]) => actual > max);

if (over.length > 0) {
  for (const [label, actual, max] of over) {
    console.error(
      `type-perf: ${label} ${actual.toLocaleString()} exceeds budget ${max.toLocaleString()} ` +
        `(+${Math.round((actual / max - 1) * 100)}%)`
    );
  }
  console.error(
    'Consumer type-check cost grew. Find the cause before raising the budget; ' +
      'run with --update only when the increase is understood and intended.'
  );
  process.exit(1);
}

console.log('type-perf: within budget');
