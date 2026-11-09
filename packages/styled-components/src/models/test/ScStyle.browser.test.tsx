import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SPLITTER } from '../../constants';
import createGlobalStyle from '../../constructors/createGlobalStyle';
import StyleSheet from '../../sheet';
import { idForGroup, resetGroupIds } from '../../sheet/GroupIDAllocator';
import { ScGlobalStyle, ScStyle, type ScStyleLevel, type ScStyleProps } from '../ScStyle';
import { StyleSheetManager } from '../StyleSheetManager';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
let host: HTMLElement;
let root: ReturnType<typeof createRoot>;

/** Each group of the sheet in output order, with the rules it holds as the browser serializes them. */
const groups = () =>
  sheet.order.positions.map(group => [
    idForGroup(group),
    sheet
      .getTag()
      .getGroup(group)
      .split(SPLITTER)
      .filter(rule => rule !== ''),
  ]);

const within = (...elements: React.ReactElement[]) => (
  <StyleSheetManager sheet={sheet}>
    {elements.map((element, index) => React.cloneElement(element, { key: element.key ?? index }))}
  </StyleSheetManager>
);

const mount = (...elements: React.ReactElement[]) => act(() => root.render(within(...elements)));

beforeEach(() => {
  resetGroupIds();
  sheet = new StyleSheet();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('ScStyle in the browser', () => {
  it('writes nothing while rendering, only when the render commits', () => {
    const element = <ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />;

    renderToStaticMarkup(within(element));
    expect(groups()).toEqual([]);

    mount(element);
    expect(groups()).toEqual([['a', ['.x {color: red;}']]]);
  });

  it('writes a chain base first even when the extension was defined first', () => {
    mount(
      <ScStyle
        {...styleProps({
          chain: [level('base-id', 'b1', 'blue', 5), level('ext-id', 'e1', 'red', 2)],
        })}
      />
    );

    expect(groups()).toEqual([
      ['base-id', ['.b1 {color: blue;}']],
      ['ext-id', ['.e1 {color: red;}']],
    ]);
  });

  it('puts an outer after the component it wraps, though the outer was defined first', () => {
    mount(
      <ScStyle {...styleProps({ chain: [level('outer', 'o1', 'blue', 1)] })} />,
      <ScStyle {...styleProps({ chain: [level('inner', 'i1', 'red', 9)], outers: ['outer'] })} />
    );

    expect(groups()).toEqual([
      ['inner', ['.i1 {color: red;}']],
      ['outer', ['.o1 {color: blue;}']],
    ]);
  });

  it('writes a new name when its props change and never repeats a name', () => {
    mount(<ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />);
    mount(<ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />);
    mount(<ScStyle {...styleProps({ chain: [level('a', 'y', 'blue', 1)] })} />);

    expect(groups()).toEqual([['a', ['.x {color: red;}', '.y {color: blue;}']]]);
  });

  it('leaves its rules in the sheet when it unmounts', () => {
    mount(<ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />);
    mount();

    expect(groups()).toEqual([['a', ['.x {color: red;}']]]);
  });
});

describe('ScGlobalStyle in the browser', () => {
  const global = (id: string, rule: string) => (
    <ScGlobalStyle id={id} keyframes={[]} rules={[rule]} seq={1} />
  );

  it('writes its rules before every component when it mounts', () => {
    mount(
      <ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />,
      global('sc-global-g', 'body{margin:0;}')
    );

    expect(groups()).toEqual([
      ['sc-global-g', ['body {margin: 0;}']],
      ['a', ['.x {color: red;}']],
    ]);
  });

  it('sits before a client global defined earlier when no server tag placed it (a client navigation)', () => {
    // The client global's group is allocated when it is defined; the server global's when it first
    // renders, as on a page reached by client navigation. Tier, not group number, puts it first.
    const ClientGlobal = createGlobalStyle`
      .tie { color: red; }
    `;

    mount(global('sc-global-server', '.tie{color:green;}'), <ClientGlobal />);

    expect(groups()).toEqual([
      ['sc-global-server', ['.tie {color: green;}']],
      [ClientGlobal.styledComponentId, ['.tie {color: red;}']],
    ]);
  });

  it('keeps its place before a client global when an unmount rebuilds its group after the sheet was cleared', () => {
    const ClientGlobal = createGlobalStyle`
      .tie { color: red; }
    `;
    const first = (
      <ScGlobalStyle
        id="sc-global-server"
        key="first"
        keyframes={[]}
        rules={['.tie{color:green;}']}
        seq={1}
      />
    );
    const second = (
      <ScGlobalStyle
        id="sc-global-server"
        key="second"
        keyframes={[]}
        rules={['.tie{color:blue;}']}
        seq={1}
      />
    );

    mount(first, second);
    sheet.clearTag();
    mount(second);
    mount(second, <ClientGlobal />);

    expect(groups()).toEqual([
      ['sc-global-server', ['.tie {color: blue;}']],
      [ClientGlobal.styledComponentId, ['.tie {color: red;}']],
    ]);
  });

  it('takes its rules out when it unmounts and leaves every component alone', () => {
    mount(
      <ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />,
      global('sc-global-g', 'body{margin:0;}')
    );
    mount(<ScStyle {...styleProps({ chain: [level('a', 'x', 'red', 1)] })} />);

    expect(groups()).toEqual([
      ['sc-global-g', []],
      ['a', ['.x {color: red;}']],
    ]);
  });

  it('keeps the rules of a second instance of one id until that instance unmounts too', () => {
    // Keyed, so the second mount drops the first instance rather than handing its slot to the
    // second instance's props, which would rewrite the surviving rules and hide a lost copy.
    const margin = (
      <ScGlobalStyle
        id="sc-global-g"
        key="margin"
        keyframes={[]}
        rules={['body{margin:0;}']}
        seq={1}
      />
    );
    const padding = (
      <ScGlobalStyle
        id="sc-global-g"
        key="padding"
        keyframes={[]}
        rules={['body{padding:0;}']}
        seq={1}
      />
    );

    mount(margin, padding);
    expect(groups()).toEqual([['sc-global-g', ['body {margin: 0;}', 'body {padding: 0;}']]]);

    mount(padding);
    expect(groups()).toEqual([['sc-global-g', ['body {padding: 0;}']]]);

    mount();
    expect(groups()).toEqual([['sc-global-g', []]]);
  });
});
