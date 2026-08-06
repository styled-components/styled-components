#!/usr/bin/env node
/**
 * Consumer type-check budget.
 *
 * Generates a fixture in the shape large apps actually have (many styled
 * components, `styled(Component)` wrapping, attrs chains, spread call sites,
 * generic wrappers, and a minority of polymorphic `as` sites), type-checks it
 * against the BUILT `dist/*.d.ts` (what consumers and editors resolve, not
 * `src`), and fails when the cost exceeds the committed budget.
 *
 * This exists because 6.4.3 shipped a regression that tripled consumer
 * type-check cost and nothing in CI could see it (#5767). `test:types` measures
 * the library's own workload over `src`, which is a different number: v7 adds
 * internal files that never reach a consumer.
 *
 *   node scripts/typePerf.mjs            check against the budget
 *   node scripts/typePerf.mjs --update   rewrite the budget from this run
 *   node scripts/typePerf.mjs --count 500
 *   node scripts/typePerf.mjs --against node_modules/styled-components
 *
 * `--against` points the same fixture at some other copy of the package, which
 * is how "did we get better or worse than the version we replace" gets an
 * answer instead of an opinion. Install the comparison version anywhere, then
 * name its package root. It reports and exits; the budget belongs to this
 * package's own dist and a foreign measurement never writes to it. Expect a
 * couple of percent of inflation there: the fixture resolves React from this
 * repo while the comparison package resolves it from its own install, and two
 * copies of the same `@types/react` are two sets of type identities.
 *
 * Requires `pnpm build` first.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workDir = join(pkgRoot, '.type-perf');
const budgetFile = join(pkgRoot, 'type-perf.budget.json');

// parseArgs over hand-rolled indexOf: it accepts `--count=500` as well as
// `--count 500`, and throws on an unknown flag or a valueless one instead of
// silently measuring the default. A miscounted fixture measures the wrong thing
// and still reports success, which is the worst failure mode this tool has.
let parsed;
try {
  parsed = parseArgs({
    options: {
      against: { type: 'string' },
      count: { type: 'string', default: '100' },
      update: { type: 'boolean' },
    },
    strict: true,
  });
} catch (error) {
  console.error(`type-perf: ${error.message}`);
  process.exit(1);
}

const update = parsed.values.update === true;
const count = Number(parsed.values.count);
if (!Number.isInteger(count) || count < 1) {
  console.error(`type-perf: --count needs a positive integer, got ${parsed.values.count}`);
  process.exit(1);
}

// The measurement subject: this package's own build, or some other copy of it.
const against = parsed.values.against;
const target = against === undefined ? pkgRoot : resolve(against);

if (against !== undefined && update) {
  console.error("type-perf: --update banks this package's own cost, so it cannot take --against.");
  process.exit(1);
}

const distEntry = join(target, 'dist', 'index.d.ts');
if (!existsSync(distEntry)) {
  console.error(
    against === undefined
      ? 'type-perf: dist/index.d.ts missing, run `pnpm build` first.'
      : `type-perf: no dist/index.d.ts under ${target}; --against wants a package root.`
  );
  process.exit(1);
}

// A stale dist measures the previous build while reporting the current one.
// CI is safe (it builds immediately before), local runs are not. A comparison
// target is an installed package with no src to be stale against.
//
// `test/` never reaches dist, and `utils/errors.ts` is generated: the test run
// rewrites it, so counting either would report a stale dist after every
// `pnpm test` and train everyone to ignore the warning.
const IGNORED_SOURCES = new Set([
  join(pkgRoot, 'src', 'test'),
  join(pkgRoot, 'src', 'utils', 'errors.ts'),
]);

if (against === undefined) {
  const newestSource = (function newest(dir) {
    let latest = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (IGNORED_SOURCES.has(full)) continue;
      latest = Math.max(latest, entry.isDirectory() ? newest(full) : statSync(full).mtimeMs);
    }
    return latest;
  })(join(pkgRoot, 'src'));

  if (newestSource > statSync(distEntry).mtimeMs) {
    console.error('type-perf: dist is older than src, run `pnpm build` first.');
    process.exit(1);
  }
}

// -- fixture ---------------------------------------------------------------

const TAGS = ['div', 'span', 'button', 'a', 'p', 'section', 'li', 'input'];
const AS_TAGS = ['a', 'button', 'label', 'section', 'video', 'ul'];

// Declaration mix per PER_FILE-sized cycle, weighted toward what large apps
// actually contain. Adjusting a weight changes what the committed budget means,
// so the numbers must be re-measured with --update afterwards.
//
// `unionTarget` prices the distributive prop path. Without it nothing here
// contains a union-typed target, so the distribution that keeps `A | B` from
// collapsing to its shared keys costs nothing measurable, and the next pass over
// this area reads "free to remove" off a fixture that never used it. Because the
// run fails on any fixture compile error, it also makes this gate a correctness
// canary for that collapse.
const KIND_WEIGHTS = [
  ['plainTag', 8],
  ['wrapComponent', 5],
  ['chained', 3],
  ['attrsTag', 2],
  ['attrsWrap', 1],
  ['genericWrapper', 1],
  ['unionTarget', 1],
];
const PER_FILE = KIND_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);

function kindOf(i) {
  let cursor = i % PER_FILE;
  for (const [name, weight] of KIND_WEIGHTS) {
    if (cursor < weight) return name;
    cursor -= weight;
  }
  throw new Error('unreachable: KIND_WEIGHTS must sum to PER_FILE');
}

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

type PressableProps =
  | React.ButtonHTMLAttributes<HTMLButtonElement>
  | React.AnchorHTMLAttributes<HTMLAnchorElement>;
const Pressable = (_props: PressableProps) => null;

const spreadProps = { className: 'x', id: 'y' };
`;

function unit(i) {
  const tag = TAGS[i % TAGS.length];
  const N = `C${i}`;
  const kind = kindOf(i);
  let decl;

  switch (kind) {
    case 'plainTag':
      decl = `const ${N} = styled.${tag}<{ $a${i}?: number; $b${i}?: string; $c${i}?: boolean }>\`
  color: \${p => (p.$c${i} ? 'red' : 'blue')};
  padding: \${p => p.$a${i} ?? 0}px;
\`;`;
      break;
    case 'wrapComponent':
      decl = `const ${N} = styled(Plain)<{ $a${i}?: number }>\`
  margin: \${p => p.$a${i} ?? 0}px;
  color: \${p => (p.$active ? 'green' : 'gray')};
\`;`;
      break;
    case 'chained':
      // Always reachable: `chained` starts at cursor 8, so i >= 8 here and the
      // previous unit is always in this same file (PER_FILE governs both).
      decl = `const ${N} = styled(C${i - 1})<{ $x${i}?: string }>\`
  border-color: \${p => p.$x${i} ?? 'black'};
\`;`;
      break;
    case 'attrsTag':
      decl = `const ${N} = styled.${tag}.attrs<{ $a${i}?: number }>({ $a${i}: ${i} })\`
  width: \${p => p.$a${i}}px;
\`;`;
      break;
    case 'attrsWrap':
      decl = `const ${N} = styled(Plain).attrs({ $size: ${i} })\`
  height: \${p => p.$size}px;
\`;`;
      break;
    case 'unionTarget':
      decl = `const ${N} = styled(Pressable)<{ $a${i}?: number }>\`
  padding: \${p => p.$a${i} ?? 0}px;
\`;`;
      break;
    default:
      // Generic wrapper: the shape behind #4246/#1803, where a styled component
      // is consumed through a caller's own type parameter.
      decl = `const ${N}Inner = styled.${tag}<{ $a${i}?: number }>\`
  opacity: \${p => (p.$a${i} ?? 1)};
\`;
function ${N}<T extends BaseProps>({ item, ...rest }: { item: T } & React.ComponentProps<typeof ${N}Inner>) {
  return <${N}Inner {...rest}>{item.label}</${N}Inner>;
}`;
      break;
  }

  const generic = kind === 'genericWrapper';
  const sites = generic
    ? [`<${N} item={{ label: 'l' }} />`, `<${N} item={{ label: 'l' }} className="x" />`]
    : [`<${N} />`, `<${N} className="x">{'t'}</${N}>`];

  // A member-specific prop is the whole point of the union fixture: a plain call
  // site resolves against the shared keys and would price the same either way.
  if (kind === 'unionTarget') sites.push(`<${N} href="/x" />`);

  if (!generic) {
    if (i % 5 === 0) sites.push(`<${N} {...spreadProps} />`);
    if (i % 10 === 0) sites.push(`<${N} as="${AS_TAGS[i % AS_TAGS.length]}" />`);
    if (i % 33 === 0) sites.push(`<${N} as={Other} href="/x" />`);
    if (i % 50 === 0) sites.push(`<${N} forwardedAs="ul" />`);
  }

  return `${decl}

export const Use${i} = () => (
  <>
    ${sites.join('\n    ')}
  </>
);
`;
}

// `skipLibCheck` hides a broken dist: if the package's own declarations cannot
// resolve their dependencies, every export degrades to `any`, the fixture still
// compiles, and the run reports an enormous fake win. These directives error
// only while the types are intact; once they are not, tsc emits TS2578
// "Unused '@ts-expect-error'" and the clean-compile gate below catches it.
const CANARY = `import * as React from 'react';
import styled from 'styled-components';
import styledNative from 'styled-components/native';

const Canary = styled.button<{ $ok?: boolean }>\`\`;
// @ts-expect-error not a prop of a styled button
export const CanaryProp = <Canary notAPropOfButton={1} />;
// @ts-expect-error 'loop' belongs to video, not to the button this renders as
export const CanaryAs = <Canary loop />;

// The web and native entries resolve target props through the same types, so a
// native-only regression is invisible to a web-only fixture and to
// tsconfig.test-types.json, which checks src rather than what consumers resolve.
const NativeCanary = styledNative.View\`\`;
// @ts-expect-error not a prop of View
export const CanaryNative = <NativeCanary notAPropOfView={1} />;
export const NativeOk = <NativeCanary testID="ok" />;
`;

rmSync(workDir, { recursive: true, force: true });
mkdirSync(join(workDir, 'src'), { recursive: true });

for (let start = 0, f = 0; start < count; start += PER_FILE, f++) {
  const body = [];
  for (let i = start; i < Math.min(start + PER_FILE, count); i++) body.push(unit(i));
  writeFileSync(join(workDir, 'src', `mod${f}.tsx`), `${HEADER}\n${body.join('\n')}`);
}
writeFileSync(join(workDir, 'src', 'canary.tsx'), CANARY);

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
        paths: {
          'styled-components': [relative(workDir, target)],
          'styled-components/native': [relative(workDir, join(target, 'native'))],
        },
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

const tscPath = require.resolve('typescript/lib/tsc.js');

// Pinned so the memory figure is comparable across machines: V8 collects more
// eagerly under a smaller heap, so an unpinned run reports whatever the host had
// spare. Nothing else here is machine-sensitive; types and instantiations are
// bit-identical run to run, and no metric is wall-clock, so a slower CI box
// measures the same numbers this does.
const HEAP_MB = 4096;

function run(extraArgs) {
  try {
    return execFileSync(
      process.execPath,
      // `--expose-gc` is what makes the memory figure meaningful: tsc collects
      // before sampling only when `global.gc` exists, so without it the number
      // includes garbage and drifts ~1.5% between runs. With it, bit-identical.
      [`--max-old-space-size=${HEAP_MB}`, '--expose-gc', tscPath, '-p', workDir, ...extraArgs],
      {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      }
    );
  } catch (error) {
    // tsc exits non-zero when the fixture has type errors; keep its output.
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

// One pass, not two: `--extendedDiagnostics` prints the same `error TS` lines a
// plain run does, and the counter table never contains that substring.
const out = run(['--extendedDiagnostics']);
const errors = out.split('\n').filter(line => line.includes('error TS'));
if (errors.length > 0) {
  console.error(`type-perf: fixture did not compile cleanly (${errors.length} errors):`);
  console.error(errors.slice(0, 5).join('\n'));
  process.exit(1);
}

const read = label => Number((out.match(new RegExp(`^${label}:\\s+(\\d+)`, 'm')) ?? [])[1]);
const measured = {
  instantiations: read('Instantiations'),
  // Memory is the axis #5767 reporters actually hit (one build OOM'd where 6.4.2
  // fit). It also moves when types and instantiations barely do, so dropping it
  // leaves the regression mechanism unguarded.
  memoryKb: read('Memory used'),
  types: read('Types'),
};

if (!measured.types || !measured.instantiations || !measured.memoryKb) {
  console.error('type-perf: could not parse tsc diagnostics.\n', out);
  process.exit(1);
}

// Every figure is a function of these two, so a bump moves them wholesale and
// would otherwise read as "your change regressed cost".
const versions = {
  typescript: require('typescript/package.json').version,
  typesReact: require('@types/react/package.json').version,
};

const subject = against === undefined ? 'dist' : target;
console.log(
  `type-perf: ${count} components against ${subject}, ` +
    `TypeScript ${versions.typescript}, @types/react ${versions.typesReact}`
);
console.log(`  types:          ${measured.types.toLocaleString()}`);
console.log(`  instantiations: ${measured.instantiations.toLocaleString()}`);
console.log(`  memory:         ${Math.round(measured.memoryKb / 1024).toLocaleString()} MB`);

// A comparison run answers a question; it does not gate anything, and the
// budget belongs to this package's own dist.
if (against !== undefined) process.exit(0);

// All three figures are deterministic run to run, so these bands are headroom
// for dependency drift, not for noise; memory keeps a slightly wider one only
// because a different host can move it. Memory is budgeted at all because 6.4.4
// has FEWER instantiations than 6.4.3 while using far more of it: a
// counters-only budget reads that regression as an improvement.
const TOLERANCE_PCT = { instantiations: 10, memoryKb: 12, types: 10 };

if (update) {
  writeFileSync(
    budgetFile,
    `${JSON.stringify({ count, measured, tolerancePct: TOLERANCE_PCT, versions }, null, 2)}\n`
  );
  console.log(`type-perf: budget updated in ${budgetFile}`);
  process.exit(0);
}

const budget = JSON.parse(readFileSync(budgetFile, 'utf8'));
if (!budget.measured || !budget.tolerancePct) {
  console.error(`type-perf: ${budgetFile} is not in the expected shape, run with --update.`);
  process.exit(1);
}

// Per metric, not just per container. A metric missing from the file yields NaN
// bounds, every comparison against NaN is false, and the run reports "within
// budget" while checking nothing, silently disabling the metric it was added to
// enforce. Any budget written before a metric existed has exactly this shape.
for (const metric of Object.keys(TOLERANCE_PCT)) {
  if (!Number.isFinite(budget.measured[metric]) || !Number.isFinite(budget.tolerancePct[metric])) {
    console.error(`type-perf: budget is missing '${metric}', run with --update to re-measure.`);
    process.exit(1);
  }
}
if (budget.count !== count) {
  console.error(`type-perf: budget is for ${budget.count} components, measured ${count}.`);
  process.exit(1);
}

for (const [name, recorded] of Object.entries(budget.versions ?? {})) {
  if (versions[name] !== recorded) {
    console.warn(
      `type-perf: ${name} is ${versions[name]}, budget was measured on ${recorded}. ` +
        'A version bump moves these numbers on its own.'
    );
  }
}

// The budget stores what was measured, not a bare ceiling, so the file records
// the fact and derives the bound. That also makes an improvement visible: a
// ceiling-only file silently absorbs a win as extra slack for the next regression.
const LABELS = { instantiations: 'instantiations', memoryKb: 'memory', types: 'types' };
const over = [];
const under = [];
for (const [metric, label] of Object.entries(LABELS)) {
  const tolerance = budget.tolerancePct[metric] / 100;
  const actual = measured[metric];
  const baseline = budget.measured[metric];
  if (actual > baseline * (1 + tolerance)) over.push([label, actual, baseline]);
  else if (actual < baseline * (1 - tolerance)) under.push([label, actual, baseline]);
}

if (over.length > 0) {
  for (const [label, actual, baseline] of over) {
    console.error(
      `type-perf: ${label} ${actual.toLocaleString()} is +${Math.round((actual / baseline - 1) * 100)}% ` +
        `over the recorded ${baseline.toLocaleString()}`
    );
  }
  console.error(
    'Consumer type-check cost grew. Find the cause before raising the budget; ' +
      'run with --update only when the increase is understood and intended.'
  );
  process.exit(1);
}

for (const [label, actual, baseline] of under) {
  console.log(
    `type-perf: ${label} improved ${Math.round((1 - actual / baseline) * 100)}% ` +
      `(${baseline.toLocaleString()} -> ${actual.toLocaleString()}); run --update to bank it`
  );
}

console.log('type-perf: within budget');
