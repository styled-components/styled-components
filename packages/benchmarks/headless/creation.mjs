/**
 * Component-creation benches across libraries.
 *
 * Measures only the cost of `styled.div\`...\``: how much work each
 * library does at construction time. styled-components v7 pre-parses
 * templates eagerly so the user pays it here, not at first render;
 * emotion defers the work, so this row over-states emotion's headroom on
 * its own. The lifecycle picture lives in `ssr.mjs`.
 *
 * Every bench bakes a per-iteration counter into a custom property so
 * each call produces a unique CSS hash and the libraries' internal
 * deduplication caches can't dilute the measurement.
 */

process.env.NODE_ENV = 'production';

import { bench, group, run, summary, do_not_optimize } from 'mitata';
import v6Mod from 'styled-components-v6';
import v7Mod from 'styled-components';
import emotionMod from '@emotion/styled';
import { printTable } from './lib/print-table.mjs';

const v6 = v6Mod.default ?? v6Mod;
const v7 = v7Mod.default ?? v7Mod;
const emotion = emotionMod.default ?? emotionMod;

summary(() => {
  group('creation: styled.div static', () => {
    let i = 0;
    bench('styled-components 6.4.1', () => {
      do_not_optimize(v6.div`color:red; font-size:14px; --uid:${++i};`);
    });
    bench('styled-components v7', () => {
      do_not_optimize(v7.div`color:red; font-size:14px; --uid:${++i};`);
    });
    bench('@emotion/styled', () => {
      do_not_optimize(emotion.div`color:red; font-size:14px; --uid:${++i};`);
    });
  });

  group('creation: styled.div with interpolation', () => {
    let i = 0;
    bench('styled-components 6.4.1', () => {
      do_not_optimize(v6.div`color:${++i % 2 ? 'red' : 'blue'}; --uid:${i};`);
    });
    bench('styled-components v7', () => {
      do_not_optimize(v7.div`color:${++i % 2 ? 'red' : 'blue'}; --uid:${i};`);
    });
    bench('@emotion/styled', () => {
      do_not_optimize(emotion.div`color:${++i % 2 ? 'red' : 'blue'}; --uid:${i};`);
    });
  });

  group('creation: styled(Base) extension', () => {
    let i = 0;
    bench('styled-components 6.4.1', () => {
      const B = v6.div`color:red; --base:${++i};`;
      do_not_optimize(v6(B)`font-weight:bold; --ext:${i};`);
    });
    bench('styled-components v7', () => {
      const B = v7.div`color:red; --base:${++i};`;
      do_not_optimize(v7(B)`font-weight:bold; --ext:${i};`);
    });
    bench('@emotion/styled', () => {
      const B = emotion.div`color:red; --base:${++i};`;
      do_not_optimize(emotion(B)`font-weight:bold; --ext:${i};`);
    });
  });
});

// Use `quiet` so mitata records stats without printing its auto-scaled
// table; our `printTable` post-formats with a single µs unit across rows.
const result = await run({ format: 'quiet' });
printTable(result, { unit: 'µs' });
