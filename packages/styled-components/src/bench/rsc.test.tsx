/**
 * RSC rendering benchmarks for styled-components.
 *
 * Run: pnpm --filter styled-components bench:rsc
 *
 * Measures server-side renderToString performance with IS_RSC=true,
 * including per-instance inline style tag emission, extension chains,
 * wrapped components, and keyframe handling.
 */

// Mock React.cache ; scoped per render via manual clear
const mockCacheStore = new Map<Function, any>();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    cache: (fn: Function) => () => {
      if (!mockCacheStore.has(fn)) mockCacheStore.set(fn, fn());
      return mockCacheStore.get(fn);
    },
  };
});

jest.mock('../utils/isRsc', () => ({ IS_RSC: true }));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import styled, {
  keyframes,
  createGlobalStyle,
  StyleSheetManager,
  configureServerStyles,
} from '../index';
import rscPlugin from '../plugins/rsc';

import { bench as _bench } from './bench-utils';

const rscOpts = { warmupMax: 200, beforeIteration: () => mockCacheStore.clear() };
const bench = (name: string, iterations: number, fn: (i: number) => void) =>
  _bench(name, iterations, fn, rscOpts);

describe('RSC benchmarks', () => {
  it('React baseline (renderToString without SC)', () => {
    console.log('\n--- React renderToString baseline (1K iterations, median of 5) ---');

    bench('plain div', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement('div', null, 'hello'));
    });

    bench('div with className + style', 1_000, () => {
      ReactDOMServer.renderToString(
        React.createElement('div', { className: 'sc-a b', style: undefined }, 'hello')
      );
    });

    // forwardRef wrapper (same component shape as SC without style logic)
    const Wrapper = React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>((props, ref) =>
      React.createElement('div', { ref, className: 'sc-a b', ...props })
    );

    bench('forwardRef wrapper', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Wrapper, null, 'hello'));
    });

    bench('10 plain divs', 1_000, () => {
      const children = [];
      for (let j = 0; j < 10; j++) {
        children.push(React.createElement('div', { key: j }, 'item'));
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });

    bench('50 plain divs', 1_000, () => {
      const children = [];
      for (let j = 0; j < 50; j++) {
        children.push(React.createElement('div', { key: j }, 'item'));
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });
  });

  it('single component renderToString', () => {
    console.log('\n--- Single component renderToString (1K iterations, median of 5) ---');

    const Static = styled.div`
      color: red;
      padding: 16px;
      border: 1px solid blue;
    `;

    bench('static component', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Static, null, 'hello'));
    });

    const Dynamic = styled.div<{ $color: string }>`
      color: ${p => p.$color};
      padding: 16px;
      border: 1px solid blue;
    `;

    const colors = ['red', 'blue', 'green', 'orange', 'purple'];
    bench('dynamic component (5 color variants)', 1_000, i => {
      ReactDOMServer.renderToString(
        React.createElement(Dynamic, { $color: colors[i % colors.length] }, 'hello')
      );
    });

    const WithAttrs = styled.div.attrs({ role: 'button', tabIndex: 0 })`
      color: red;
      cursor: pointer;
    `;

    bench('component with attrs', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(WithAttrs, null, 'click'));
    });
  });

  it('inheritance chains', () => {
    console.log('\n--- Inheritance chains (1K iterations, median of 5) ---');

    const Base = styled.div`
      padding: 16px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
    `;

    const Extended = styled(Base)`
      background: blue;
      color: white;
    `;

    bench('1-level extension', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Extended, null, 'hello'));
    });

    const Deep = styled(Extended)`
      font-size: 20px;
      font-weight: bold;
    `;

    bench('2-level extension', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Deep, null, 'hello'));
    });

    bench('3 sibling extensions of same base', 1_000, () => {
      const A = styled(Base)`
        color: red;
      `;
      const B = styled(Base)`
        color: blue;
      `;
      const C = styled(Base)`
        color: green;
      `;
      ReactDOMServer.renderToString(
        React.createElement(
          'div',
          null,
          React.createElement(A, null, '1'),
          React.createElement(B, null, '2'),
          React.createElement(C, null, '3')
        )
      );
    });
  });

  it('pages of 4000 elements (chains, user classes, wrappers)', () => {
    console.log('\n--- Pages of 4000 elements (20 iterations, median of 5) ---');

    // 2000 instances per component trips the redundant-emit warning once per component.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const A = styled.div<{ $i: number }>`
      color: blue;
      padding: ${p => p.$i % 50}px;
      &:hover {
        background: url(x.png);
      }
    `;
    const B = styled(A)`
      color: green;
      @media (min-width: 10px) {
        margin: 1px;
      }
    `;
    const C = styled(B)`
      color: red;
    `;
    const Root = styled.span<{ $i: number }>`
      width: ${p => p.$i % 50}px;
    `;
    const Wrap = (props: object) => <A $i={0} {...props} />;
    const Wrapper = styled(Wrap)<{ $i: number }>`
      margin: ${p => p.$i % 50}px;
    `;
    const ClientRef = Object.assign((props: object) => <div {...props} />, {
      $$typeof: Symbol.for('react.client.reference'),
    });
    const FromClientRef = styled(ClientRef)`
      color: teal;
    `;

    const page = (pair: (i: number) => React.ReactNode[], lead?: React.ReactNode) => () =>
      ReactDOMServer.renderToString(
        <main>
          {lead}
          {Array.from({ length: 2000 }, (_, i) => pair(i)).flat()}
        </main>
      );
    const withClassName = (i: number) => [
      <C key={'c' + i} $i={i} className="card x" />,
      <Root key={'r' + i} $i={i} className="row" />,
    ];

    bench(
      'chain: 2000 three-level extensions + 2000 roots',
      20,
      page(i => [<C key={'c' + i} $i={i} />, <Root key={'r' + i} $i={i} />])
    );

    bench(
      'classname: the same with a user className, one wrapper on the page',
      20,
      page(withClassName, <Wrapper key="wrapper" $i={1} />)
    );

    bench(
      'wrapped: 2000 wrappers of a styled element + 2000 roots with a className',
      20,
      page(i => [<Wrapper key={'o' + i} $i={i} />, <Root key={'r' + i} $i={i} className="row" />])
    );

    bench(
      'client reference: one styled client reference + 4000 elements with a className',
      20,
      page(withClassName, <FromClientRef key="client" />)
    );

    warn.mockRestore();
  });

  it('repeated instances (per-instance emission)', () => {
    console.log('\n--- Repeated instances, one tag each (1K iterations, median of 5) ---');

    const Item = styled.div`
      color: red;
      padding: 8px;
    `;

    bench('10 identical static components', 1_000, () => {
      const children = [];
      for (let j = 0; j < 10; j++) {
        children.push(React.createElement(Item, { key: j }, 'item'));
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });

    bench('50 identical static components', 1_000, () => {
      const children = [];
      for (let j = 0; j < 50; j++) {
        children.push(React.createElement(Item, { key: j }, 'item'));
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });

    const DynItem = styled.div<{ $color: string }>`
      color: ${p => p.$color};
      padding: 8px;
    `;

    const dynColors = [
      'red',
      'blue',
      'green',
      'orange',
      'purple',
      'cyan',
      'magenta',
      'yellow',
      'pink',
      'teal',
    ];

    bench('50 dynamic components cycling 10 colors', 1_000, () => {
      const children = [];
      for (let j = 0; j < 50; j++) {
        children.push(
          React.createElement(DynItem, { key: j, $color: dynColors[j % dynColors.length] }, 'item')
        );
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });
  });

  it('keyframes', () => {
    console.log('\n--- Keyframes (1K iterations, median of 5) ---');

    const spin = keyframes`
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    `;

    const Spinner = styled.div`
      animation: ${spin} 1s linear infinite;
      width: 24px;
      height: 24px;
    `;

    bench('component with keyframes', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Spinner));
    });

    const fade = keyframes`
      0% { opacity: 1; }
      100% { opacity: 0; }
    `;

    const FadeA = styled.div`
      animation: ${fade} 1s;
    `;
    const FadeB = styled.span`
      animation: ${fade} 2s;
    `;

    bench('2 components sharing 1 keyframe', 1_000, () => {
      ReactDOMServer.renderToString(
        React.createElement(
          'div',
          null,
          React.createElement(FadeA, null, 'a'),
          React.createElement(FadeB, null, 'b')
        )
      );
    });
  });

  it('global styles', () => {
    console.log('\n--- GlobalStyle (1K iterations, median of 5) ---');

    const GlobalStatic = createGlobalStyle`
      body { margin: 0; font-family: system-ui; }
      *, *::before, *::after { box-sizing: border-box; }
    `;

    bench('static global style', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(GlobalStatic));
    });

    bench('3 instances of same static global (one tag each)', 1_000, () => {
      ReactDOMServer.renderToString(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(GlobalStatic),
          React.createElement(GlobalStatic),
          React.createElement(GlobalStatic)
        )
      );
    });

    const GlobalDynamic = createGlobalStyle<{ $bg: string }>`
      body { background: ${p => p.$bg}; }
    `;

    bench('dynamic global style', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(GlobalDynamic, { $bg: 'red' }));
    });
  });

  it('realistic page', () => {
    console.log('\n--- Realistic page (500 iterations, median of 5) ---');

    const Container = styled.div`
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px;
    `;
    const Title = styled.h1`
      font-size: 32px;
      color: #111;
      margin-bottom: 16px;
    `;
    const Card = styled.div`
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
    `;
    const CardTitle = styled.h3`
      font-size: 16px;
      margin-bottom: 8px;
    `;
    const CardText = styled.p`
      font-size: 14px;
      color: #6b7280;
    `;
    const Badge = styled.span<{ $variant: 'ok' | 'warn' | 'error' }>`
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 13px;
      background: ${p =>
        p.$variant === 'ok' ? '#dcfce7' : p.$variant === 'warn' ? '#fef3c7' : '#fee2e2'};
      color: ${p =>
        p.$variant === 'ok' ? '#166534' : p.$variant === 'warn' ? '#92400e' : '#991b1b'};
    `;
    const pulse = keyframes`
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    `;
    const Dot = styled.div`
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #16a34a;
      animation: ${pulse} 2s infinite;
    `;
    const Global = createGlobalStyle`
      body { margin: 0; font-family: system-ui; }
    `;

    const variants: Array<'ok' | 'warn' | 'error'> = ['ok', 'warn', 'error'];

    bench('20 cards + badges + keyframes + global', 500, () => {
      const cards = [];
      for (let j = 0; j < 20; j++) {
        cards.push(
          React.createElement(
            Card,
            { key: j },
            React.createElement(CardTitle, null, 'Card ' + j),
            React.createElement(CardText, null, 'Description text'),
            React.createElement(Badge, { $variant: variants[j % 3] }, variants[j % 3]),
            j === 0 ? React.createElement(Dot) : null
          )
        );
      }
      ReactDOMServer.renderToString(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Global),
          React.createElement(
            Container,
            null,
            React.createElement(Title, null, 'Dashboard'),
            ...cards
          )
        )
      );
    });
  });

  it('realistic page under a StyleSheetManager and configured server plugins', () => {
    console.log('\n--- Realistic page (200 iterations, median of 5) ---');

    const Page = styled.main`
      max-width: 960px;
      margin: 0 auto;
      font-family: system-ui, sans-serif;
    `;
    const NavLink = styled.a<{ $active: boolean }>`
      color: ${p => (p.$active ? '#111827' : '#6b7280')};
      font-weight: ${p => (p.$active ? 700 : 400)};
      padding: 8px 12px;
      &:hover {
        color: #111827;
      }
    `;
    const Card = styled.section`
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      & + & {
        margin-top: 16px;
      }
    `;
    const CardTitle = styled.h2`
      font-size: 18px;
      margin: 0 0 8px;
    `;
    const Badge = styled.span<{ $variant: string }>`
      background: ${p => p.$variant};
      border-radius: 4px;
      padding: 2px 8px;
    `;
    const Button = styled.button<{ $primary?: boolean }>`
      background: ${p => (p.$primary ? '#2563eb' : 'transparent')};
      color: ${p => (p.$primary ? 'white' : '#2563eb')};
      border: 1px solid #2563eb;
      padding: 8px 16px;
    `;
    const Item = styled.li`
      padding: 4px 0;
      &:first-child {
        font-weight: 600;
      }
      &:nth-child(2) {
        color: #374151;
      }
    `;

    const variants = ['#dcfce7', '#fef9c3', '#fee2e2', '#dbeafe'];
    const Section = ({ index }: { index: number }) => (
      <Card>
        <CardTitle>Card {index}</CardTitle>
        <Badge $variant={variants[index % variants.length]}>tag {index % 4}</Badge>
        <ul>
          <Item>first</Item>
          <Item>second</Item>
          <Item>third</Item>
        </ul>
        <Button $primary={index % 2 === 0}>Open</Button>
      </Card>
    );
    const page = (
      <Page>
        <nav>
          {Array.from({ length: 12 }, (_, i) => (
            <NavLink key={i} href={'/' + i} $active={i === 3}>
              Link {i}
            </NavLink>
          ))}
        </nav>
        {Array.from({ length: 40 }, (_, i) => (
          <Section key={i} index={i} />
        ))}
      </Page>
    );

    bench('no manager', 200, () => {
      ReactDOMServer.renderToString(page);
    });

    bench('root StyleSheetManager with a plugin', 200, () => {
      ReactDOMServer.renderToString(
        <StyleSheetManager plugins={[rscPlugin]}>{page}</StyleSheetManager>
      );
    });

    configureServerStyles({ plugins: [rscPlugin] });
    try {
      bench('configured server plugins, no manager', 200, () => {
        ReactDOMServer.renderToString(page);
      });
    } finally {
      configureServerStyles({ plugins: [] });
    }
  });

  it('output size', () => {
    console.log('\n--- Output size ---');

    const Card = styled.div`
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
    `;
    const Badge = styled.span<{ $variant: string }>`
      color: ${p => p.$variant};
      padding: 4px 8px;
    `;

    const colors = ['red', 'blue', 'green', 'orange', 'purple'];

    mockCacheStore.clear();
    const children = [];
    for (let j = 0; j < 50; j++) {
      children.push(
        React.createElement(
          Card,
          { key: j },
          React.createElement(Badge, { $variant: colors[j % colors.length] }, 'tag')
        )
      );
    }
    const html = ReactDOMServer.renderToString(React.createElement('div', null, ...children));

    const styleTags = (html.match(/<style[^>]*>/g) || []).length;
    const styleBytes = (html.match(/<style[^>]*>.*?<\/style>/gs) || []).reduce(
      (sum, tag) => sum + tag.length,
      0
    );
    const totalBytes = html.length;

    console.log(`  50 cards with 5 badge variants:`);
    console.log(`    Style tags: ${styleTags}`);
    console.log(`    Style bytes: ${styleBytes}`);
    console.log(`    Total HTML: ${totalBytes}`);
    console.log(`    Style overhead: ${((styleBytes / totalBytes) * 100).toFixed(1)}%`);
  });
});
