/**
 * @jest-environment node
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SPLITTER } from '../../constants';
import StyleSheet from '../../sheet';
import { idForGroup, resetGroupIds } from '../../sheet/GroupIDAllocator';
import { resetWarnOnce } from '../../utils/warnOnce';
import {
  ScGlobalStyle,
  ScStyle,
  type ScGlobalStyleProps,
  type ScStyleLevel,
  type ScStyleProps,
} from '../ScStyle';
import { StyleSheetManager } from '../StyleSheetManager';

/** The text a server sheet writes for one group: its rules, then its marker. */
const block = (rules: string[], marker: string) =>
  rules.map(rule => rule + SPLITTER).join('') + marker + SPLITTER;

const level = (id: string, name: string, color: string, seq: number): ScStyleLevel => [
  id,
  name,
  [`.${name}{color:${color};}`],
  seq,
];

const styleProps = (props: Partial<ScStyleProps> & Pick<ScStyleProps, 'chain'>): ScStyleProps => ({
  keyframes: [],
  outers: [],
  ...props,
});

let sheet: StyleSheet;

/** Renders each element into a request sheet (the test's own by default), the way the registry's tree does. */
const renderInto = (...elements: React.ReactElement[]) => renderIntoSheet(sheet, elements);

const renderIntoSheet = (target: StyleSheet, elements: React.ReactElement[]) =>
  renderToStaticMarkup(
    <StyleSheetManager sheet={target}>
      {elements.map((element, index) => React.cloneElement(element, { key: index }))}
    </StyleSheetManager>
  );

const NO_STYLE = styleProps({ chain: [] });

/** What `useId` gives the last element's position once `before` elements precede it: the part of a global's instance name that React chooses. */
function instanceAt(before: number): string {
  let instance = '';
  const Probe = () => {
    instance = React.useId();

    return null;
  };

  renderIntoSheet(new StyleSheet({ isServer: true }), [
    ...Array.from({ length: before }, (_, index) => <ScStyle key={index} {...NO_STYLE} />),
    <Probe key="probe" />,
  ]);

  return instance;
}

beforeEach(() => {
  resetGroupIds();
  resetWarnOnce();
  sheet = new StyleSheet({ isServer: true });
});

describe('ScStyle on a server sheet', () => {
  it('renders nothing', () => {
    expect(renderInto(<ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />)).toBe(
      ''
    );
  });

  it('writes a chain base first even when the extension was defined first', () => {
    // Keys alone would put the extension (seq 2) before its base (seq 5); the chain is a pin.
    renderInto(
      <ScStyle
        {...styleProps({
          chain: [level('base-id', 'b1', 'blue', 5), level('ext-id', 'e1', 'red', 2)],
        })}
      />
    );

    expect(sheet.toString()).toBe(
      block(['.b1{color:blue;}'], 'data-styled.g1[id="base-id"].s5{content:"b1,"}') +
        block(['.e1{color:red;}'], 'data-styled.g2[id="ext-id"].s2{content:"e1,"}')
    );
  });

  it('orders unrelated components by definition order, not render order', () => {
    renderInto(
      <ScStyle {...styleProps({ chain: [level('late', 'l1', 'blue', 7)] })} />,
      <ScStyle {...styleProps({ chain: [level('early', 'e1', 'red', 3)] })} />
    );

    expect(sheet.toString()).toBe(
      block(['.e1{color:red;}'], 'data-styled.g2[id="early"].s3{content:"e1,"}') +
        block(['.l1{color:blue;}'], 'data-styled.g1[id="late"].s7{content:"l1,"}')
    );
  });

  it('writes a name once however many instances render it', () => {
    const props = styleProps({ chain: [level('a', 'x', 'red', 1)] });

    renderInto(<ScStyle {...props} />, <ScStyle {...props} />);

    expect(sheet.toString()).toBe(
      block(['.x{color:red;}'], 'data-styled.g1[id="a"].s1{content:"x,"}')
    );
  });

  it('writes each new name of one component beside its earlier names', () => {
    renderInto(
      <ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />,
      <ScStyle {...styleProps({ chain: [level('a', 'y', 'blue', 1)] })} />
    );

    expect(sheet.toString()).toBe(
      block(['.x{color:red;}', '.y{color:blue;}'], 'data-styled.g1[id="a"].s1{content:"x,y,"}')
    );
  });

  it('puts an outer after the component it wraps, though the outer was defined first', () => {
    renderInto(
      <ScStyle {...styleProps({ chain: [level('outer', 'o1', 'blue', 1)] })} />,
      <ScStyle {...styleProps({ chain: [level('inner', 'i1', 'red', 9)], outers: ['outer'] })} />
    );

    expect(sheet.toString()).toBe(
      block(['.i1{color:red;}'], 'data-styled.g2[id="inner"].s9{content:"i1,"}') +
        block(['.o1{color:blue;}'], 'data-styled.g1[id="outer"].s1{content:"o1,"}')
    );
  });

  it('puts an outer the sheet has no rules for after the inner, so its later rules land there', () => {
    renderInto(
      <ScStyle {...styleProps({ chain: [level('inner', 'i1', 'red', 9)], outers: ['outer'] })} />,
      <ScStyle {...styleProps({ chain: [level('other', 'z1', 'green', 4)] })} />,
      <ScStyle {...styleProps({ chain: [level('outer', 'o1', 'blue', 1)] })} />
    );

    expect(sheet.toString()).toBe(
      block(['.z1{color:green;}'], 'data-styled.g3[id="other"].s4{content:"z1,"}') +
        block(['.i1{color:red;}'], 'data-styled.g1[id="inner"].s9{content:"i1,"}') +
        block(['.o1{color:blue;}'], 'data-styled.g2[id="outer"].s1{content:"o1,"}')
    );
  });

  it('sorts keyframes before every component, whichever rendered first', () => {
    renderInto(
      <ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />,
      <ScStyle
        {...styleProps({
          chain: [],
          keyframes: [['sc-keyframes-spin', 'spin', ['@keyframes spin{to{opacity:0;}}']]],
        })}
      />
    );

    expect(sheet.toString()).toBe(
      block(
        ['@keyframes spin{to{opacity:0;}}'],
        'data-styled.g2[id="sc-keyframes-spin"].s2{content:"spin,"}'
      ) + block(['.x{color:red;}'], 'data-styled.g1[id="a"].s1{content:"x,"}')
    );
  });

  describe('without a registry', () => {
    let warn: jest.SpyInstance;
    const props = styleProps({ chain: [level('a', 'x', 'red', 1)] });
    const render = () => renderToStaticMarkup(<ScStyle {...props} />);

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('writes nothing and warns once, naming the registry and a second copy of the library', () => {
      render();
      render();

      expect(warn.mock.calls).toEqual([
        [
          '[sc] Server component styles were not collected, so this page has no styles for them until it hydrates. Render the page inside a style registry (see the Next.js recipe at https://styled-components.com/docs/faqs), and check that only one copy of styled-components is installed.',
        ],
      ]);
    });

    it('stays quiet in production', () => {
      (global as { __DEV__: boolean }).__DEV__ = false;

      try {
        render();
      } finally {
        (global as { __DEV__: boolean }).__DEV__ = true;
      }

      expect(warn).not.toHaveBeenCalled();
    });
  });
});

const globalProps = (props: Partial<ScGlobalStyleProps> = {}): ScGlobalStyleProps => ({
  id: 'sc-global-g',
  keyframes: [],
  rules: ['body{margin:0;}'],
  seq: 1,
  ...props,
});

describe('ScGlobalStyle on a server sheet', () => {
  it('renders nothing', () => {
    expect(renderInto(<ScGlobalStyle {...globalProps()} />)).toBe('');
  });

  it('sorts before every component, whichever rendered first', () => {
    renderInto(
      <ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />,
      <ScGlobalStyle {...globalProps({ seq: 9 })} />
    );

    expect(sheet.toString()).toBe(
      block(
        ['body{margin:0;}'],
        `data-styled.g2[id="sc-global-g"].s9{content:"sc-global-g${instanceAt(1)},"}`
      ) + block(['.x{color:red;}'], 'data-styled.g1[id="a"].s1{content:"x,"}')
    );
  });

  it('writes its keyframes in the global tier, before every component', () => {
    renderInto(
      <ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />,
      <ScGlobalStyle
        {...globalProps({
          keyframes: [['sc-keyframes-spin', 'spin', ['@keyframes spin{to{opacity:0;}}']]],
        })}
      />
    );

    // Both sit in the server global tier, ordered by seq: the global's is 1, the keyframes' is
    // their group number (3, the third id registered). The component's tier sorts after both.
    expect(sheet.order.positions.map(idForGroup)).toEqual([
      'sc-global-g',
      'sc-keyframes-spin',
      'a',
    ]);
  });
});
