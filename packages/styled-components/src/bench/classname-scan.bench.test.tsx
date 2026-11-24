/**
 * Cost of a styled render that receives a `className` (the scan for outer styled components), in an
 * app with no wrapped components, where nothing the scan finds is ever an outer.
 *
 * Each row updates 1,000 mounted items one update at a time, so every update re-renders every item
 * and the sheet already holds each item's rules (no injector mounts). Rows:
 *
 * - 0 tokens: no `className` at all.
 * - 5 and 30 tokens, cache-friendly: every item receives one fixed string.
 * - 5 and 30 tokens, worst case: every item receives a string unique to the item and the update, so
 *   a cache of past strings never hits.
 * - 30 tokens, first letters shared with ids: the same two shapes, with registered ids that start
 *   with every letter (as a build plugin's `<displayName>-<hash>` ids do) and tokens that start
 *   with every letter, so a check on a token's first character rules out nothing.
 * - 5 and 30 tokens, per-item stable: every item receives its own string, the same on every update
 *   (more strings than a cache of past strings holds).
 *
 * The figures to compare across trees are the minimum and the median of the runs, in ms per 1,000
 * items (each update renders 1,000 items); ns per render is that figure times 1,000. The minimum is
 * the steadier of the two on a loaded machine.
 *
 * Run: pnpm --filter styled-components bench:web -- classname-scan
 */
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { performance } from 'perf_hooks';
import styled from '../index';

const ITEMS = 1000;
const UPDATES = 20;
const RUNS = 21;

const Item = styled.div`
  color: red;
`;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Registers ids that start with every letter, spelled the way a build plugin writes them
 * (`<displayName>-<hash>`), so a token starting with any letter can be a registered id. It runs
 * just before the rows that need it, so the rows above see only the ids of `Item`.
 */
const registerLetterIds = () => {
  let seed = 1;
  const next = (limit: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;

    return seed % limit;
  };
  const word = (length: number) =>
    Array.from({ length }, () => LETTERS[next(LETTERS.length)]).join('');

  // About three hundred components with unrelated names, a mid-sized app's worth.
  for (let index = 0; index < 300; index++) {
    const componentId = `${LETTERS[index % LETTERS.length]}${word(2 + next(10))}-${word(6)}`;
    styled.span.withConfig({ componentId })`
      color: blue;
    `;
  }
};

const tokens = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}`).join(' ');

/** Utility-style tokens whose first characters cycle through every letter. */
const letterTokens = (count: number, seed: string) =>
  Array.from({ length: count }, (_, index) => `${LETTERS[index % 26]}${seed}-${index}`).join(' ');

type Row = {
  name: string;
  classNameFor: ((update: number, item: number) => string) | undefined;
  /** Runs once before the row; the ids it registers stay for the rows after it. */
  setup?: () => void;
};

const rows: Row[] = [
  { name: '0 tokens', classNameFor: undefined },
  ...[5, 30].flatMap(count => {
    const fixed = tokens(count, 'util-');
    const tail = tokens(count - 1, 'tail-');

    return [
      { name: `${count} tokens, cache-friendly`, classNameFor: () => fixed },
      {
        name: `${count} tokens, worst case (unique per item and update)`,
        classNameFor: (update: number, item: number) => `u${update}x${item} ${tail}`,
      },
    ];
  }),
  ...(() => {
    const fixed = letterTokens(30, 'util');
    const tail = letterTokens(29, 'tail');

    return [
      {
        name: '30 tokens, first letters shared with ids, cache-friendly',
        classNameFor: () => fixed,
        setup: registerLetterIds,
      },
      {
        name: '30 tokens, first letters shared with ids, worst case',
        classNameFor: (update: number, item: number) => `u${update}x${item} ${tail}`,
      },
    ];
  })(),
  ...[5, 30].map(count => {
    const tail = letterTokens(count - 1, 'tail');

    return {
      name: `${count} tokens, per-item string stable across updates (letters shared with ids)`,
      classNameFor: (_update: number, item: number) => `item-${item} ${tail}`,
    };
  }),
];

describe('className scan', () => {
  it('renders 1,000 items per update', () => {
    console.log(`\nclassName scan, ${ITEMS} items per update, ${RUNS} runs`);

    for (const { name, classNameFor, setup } of rows) {
      setup?.();

      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = createRoot(host);
      let update = 0;

      const List = ({ tick }: { tick: number }) => {
        const items: React.ReactNode[] = [];
        for (let item = 0; item < ITEMS; item++) {
          items.push(
            <Item
              key={item}
              data-tick={tick}
              className={classNameFor === undefined ? undefined : classNameFor(tick, item)}
            />
          );
        }
        return <>{items}</>;
      };
      const step = () => {
        const tick = update++;
        flushSync(() => root.render(<List tick={tick} />));
      };

      for (let warm = 0; warm < 10; warm++) step();

      const samples: number[] = [];
      for (let run = 0; run < RUNS; run++) {
        const start = performance.now();
        for (let i = 0; i < UPDATES; i++) step();
        samples.push((performance.now() - start) / UPDATES);
      }

      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(RUNS / 2)];
      const minimum = samples[0];
      console.log(
        `  ${name.padEnd(56)} min ${minimum.toFixed(2).padStart(6)}  median ${median.toFixed(2).padStart(6)} ms per 1,000 items  (min ${((minimum * 1e6) / ITEMS).toFixed(0).padStart(5)} ns per render)`
      );

      root.unmount();
      host.remove();
    }
  });
});
