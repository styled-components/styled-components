/**
 * @jest-environment node
 */

// React 19's client `cache` is a pass-through, so tests mock a request-scoped one.
const mockCacheStore = new Map<Function, unknown>();

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

// Mock IS_RSC before importing the module
jest.mock('../../utils/isRsc', () => ({ IS_RSC: true }));

import React, { Suspense } from 'react';
import ReactDOMServer from 'react-dom/server';
import { RSC_REDUNDANT_EMIT_WARN_THRESHOLD } from '../../constants';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../../utils/createWarnTooManyClasses';
import {
  classesOf,
  countStyleTags,
  extractStyleContents,
  fakeClientReference,
  firstRuleClass,
  generatedClass,
  isGeneratedClass,
  itWarnsOnRedundantEmits,
  renderInProbe,
  renderStreamed,
  styleTags,
  tick,
} from '../../test/rscStream';
import { resetIdentifiers } from '../../models/StyledComponent';
import { mainCompiler, mainSheet, useStyleSheetContext } from '../../models/StyleSheetManager';
import { resetGroupIds } from '../../sheet/GroupIDAllocator';
import styled, { css, keyframes } from '../../index';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import rscPlugin from '../../plugins/rsc';
import { extensionScenarios, passThrough, wrapperScenarios } from '../../test/rscScenarios';

describe('styled RSC mode', () => {
  beforeEach(() => {
    mockCacheStore.clear();
    resetGroupIds();
    resetIdentifiers();
  });

  describe('RSC style tag emission (#5672)', () => {
    it('should emit inline style tags without precedence', () => {
      const Button = styled.button`
        padding: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Button />);

      // Inline <style> tag emitted (no precedence;server component output
      // isn't hydrated, so no mismatch; inline body styles come after
      // registry <head> styles for correct cascade ordering)
      expect(html).toMatchInlineSnapshot(`
        <style data-styled>
          .dkAAnv{padding:8px;}
        </style>
        <button class="sc-kqxcKS dkAAnv">
        </button>
      `);
      expect(html).not.toContain('precedence');
      expect(html).not.toContain('data-styled-rsc');
    });

    it('should emit base and extension CSS in one tag on the extension class (#5672)', () => {
      const Base = styled.div`
        display: flex;
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const chain = generatedClass(html);

      expect(extractStyleContents(html)).toBe(`.${chain}{display:flex;}.${chain}{color:red;}`);
    });

    // A url token ends at its first `)`: https://drafts.csswg.org/css-syntax/#consume-url-token
    // A `(` written into one would end it there and turn the text after into real rules, so
    // retargeting a level to the chain class swaps the class name and writes nothing else.
    it('retargets a base component class inside a url token without adding a parenthesis', () => {
      const Base = styled.div`
        ${() => 'url(&{}html{display:none})'} {
          top: 0;
        }
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const chain = generatedClass(html);

      expect(extractStyleContents(html)).toBe(
        `url(.${chain}{}html{display:none}){top:0;}.${chain}{color:red;}`
      );
    });
  });

  describe('order-proof extensions', () => {
    const Base = styled.div`
      color: blue;
    `;
    const Ext = styled(Base)`
      color: red;
    `;

    it('puts one class on an extension for its whole chain, after its component ids', () => {
      const html = ReactDOMServer.renderToString(<Ext id="ext" />);

      const classes = classesOf(html, 'ext');

      expect(classes).toHaveLength(3);
      expect(classes.slice(0, 2)).toEqual([Base.styledComponentId, Ext.styledComponentId]);
    });

    it('keeps an extension on its own rules when a plain base renders after it', () => {
      const html = ReactDOMServer.renderToString(
        <main>
          <Ext id="ext" />
          <Base id="base" />
        </main>
      );
      const chain = generatedClass(html, 'ext');
      const plain = generatedClass(html, 'base');

      expect(chain).not.toBe(plain);
      expect(classesOf(html, 'ext')).not.toContain(plain);
      expect(styleTags(html)).toEqual([
        `.${chain}{color:blue;}.${chain}{color:red;}`,
        `.${plain}{color:blue;}`,
      ]);
    });

    it('keeps an extension on its own rules when a plain base renders before it', () => {
      const html = ReactDOMServer.renderToString(
        <main>
          <Base id="base" />
          <Ext id="ext" />
        </main>
      );
      const chain = generatedClass(html, 'ext');
      const plain = generatedClass(html, 'base');

      expect(chain).not.toBe(plain);
      expect(styleTags(html)).toEqual([
        `.${plain}{color:blue;}`,
        `.${chain}{color:blue;}.${chain}{color:red;}`,
      ]);
    });

    it('gives each level of a three-level chain a class holding its whole chain, in any order', () => {
      const A = styled.div`
        color: blue;
      `;
      const B = styled(A)`
        color: green;
      `;
      const C = styled(B)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <main>
          <C id="c" />
          <B id="b" />
          <A id="a" />
        </main>
      );
      const [c, b, a] = ['c', 'b', 'a'].map(id => generatedClass(html, id));

      expect(new Set([a, b, c]).size).toBe(3);
      expect(styleTags(html)).toEqual([
        `.${c}{color:blue;}.${c}{color:green;}.${c}{color:red;}`,
        `.${b}{color:blue;}.${b}{color:green;}`,
        `.${a}{color:blue;}`,
      ]);
    });

    it('gives two extensions of one base their own classes', () => {
      const First = styled(Base)`
        color: red;
      `;
      const Second = styled(Base)`
        color: green;
      `;

      const html = ReactDOMServer.renderToString(
        <main>
          <First id="first" />
          <Second id="second" />
          <Base id="base" />
        </main>
      );
      const [first, second, plain] = ['first', 'second', 'base'].map(id =>
        generatedClass(html, id)
      );

      expect(new Set([first, second, plain]).size).toBe(3);
      expect(styleTags(html)).toEqual([
        `.${first}{color:blue;}.${first}{color:red;}`,
        `.${second}{color:blue;}.${second}{color:green;}`,
        `.${plain}{color:blue;}`,
      ]);
    });

    it('treats an empty extension as its base and still chains its own extension', () => {
      const Empty = styled(Base)``;
      const Over = styled(Empty)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <main>
          <Over id="over" />
          <Empty id="empty" />
          <Base id="base" />
        </main>
      );
      const chain = generatedClass(html, 'over');
      const plain = generatedClass(html, 'base');

      expect(generatedClass(html, 'empty')).toBe(plain);
      expect(styleTags(html)).toEqual([
        `.${chain}{color:blue;}.${chain}{color:red;}`,
        `.${plain}{color:blue;}`,
        `.${plain}{color:blue;}`,
      ]);
    });

    it('keeps a doubled base selector doubled on the chain class', () => {
      const Doubled = styled.div`
        && {
          color: blue;
        }
      `;
      const Over = styled(Doubled)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Over />);
      const chain = generatedClass(html);

      expect(extractStyleContents(html)).toBe(
        `.${chain}.${chain}{color:blue;}.${chain}{color:red;}`
      );
    });

    it('keeps descendant and media rules of the base on the chain class', () => {
      const Rich = styled.div`
        color: blue;
        & > span {
          color: green;
        }
        @media (min-width: 1px) {
          color: orange;
        }
      `;
      const Over = styled(Rich)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Over />);
      const chain = generatedClass(html);

      expect(extractStyleContents(html)).toBe(
        `.${chain}{color:blue;}.${chain}>span{color:green;}@media (min-width: 1px){.${chain}{color:orange;}}.${chain}{color:red;}`
      );
    });

    it('chains the variant of a dynamic base each instance renders', () => {
      const Tinted = styled.div<{ $tint: string }>`
        background: ${p => p.$tint};
      `;
      const Over = styled(Tinted)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <main>
          <Over id="warm" $tint="orange" />
          <Over id="cool" $tint="teal" />
          <Tinted id="plain" $tint="orange" />
        </main>
      );
      const [warm, cool, plain] = ['warm', 'cool', 'plain'].map(id => generatedClass(html, id));

      expect(new Set([warm, cool, plain]).size).toBe(3);
      expect(styleTags(html)).toEqual([
        `.${warm}{background:orange;}.${warm}{color:red;}`,
        `.${cool}{background:teal;}.${cool}{color:red;}`,
        `.${plain}{background:orange;}`,
      ]);
    });

    it('keeps the attrs className and the swapped tag on an extension', () => {
      const Labeled = styled(Base).attrs({ className: 'x' })`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Labeled as="span" id="labeled" />);
      const classes = classesOf(html, 'labeled');

      expect(html).toContain('<span');
      expect(classes).toHaveLength(4);
      expect(classes[3]).toBe('x');
      expect(styleTags(html)).toEqual([`.${classes[2]}{color:blue;}.${classes[2]}{color:red;}`]);
    });

    it('keeps a base component selector matching its extension through the component id', () => {
      const Parent = styled.section`
        ${Base} {
          color: purple;
        }
      `;

      const html = ReactDOMServer.renderToString(
        <Parent>
          <Ext id="ext" />
        </Parent>
      );
      const parent = classesOf(html)[1];

      expect(styleTags(html)[0]).toBe(`.${parent} .${Base.styledComponentId}{color:purple;}`);
      expect(classesOf(html, 'ext')).toContain(Base.styledComponentId);
    });
  });

  describe('wrappers', () => {
    /** The classes of the element with `id` that are not component ids. */
    const generatedClasses = (html: string, id: string): string[] =>
      classesOf(html, id).filter(isGeneratedClass);

    it('folds a wrapper into the tag of the styled element it wraps and keeps the wrapper tag', () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <main>
          <Red id="ext" />
          <Btn id="base" />
        </main>
      );
      const wrapper = firstRuleClass(styleTags(html)[0]);
      const [folded] = generatedClasses(html, 'ext');
      const [plain] = generatedClasses(html, 'base');

      expect(generatedClasses(html, 'ext')).toEqual([folded]);
      expect(new Set([wrapper, folded, plain]).size).toBe(3);
      expect(styleTags(html)).toEqual([
        `.${wrapper}{color:red;}`,
        `.${folded}{color:blue;}.${folded}{color:red;}`,
        `.${plain}{color:blue;}`,
      ]);
      expect(classesOf(html, 'ext')).toEqual([
        Btn.styledComponentId,
        folded,
        Red.styledComponentId,
      ]);
    });

    it('folds the same rules when the plain element renders first', () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <main>
          <Btn id="base" />
          <Red id="ext" />
        </main>
      );
      const wrapper = firstRuleClass(styleTags(html)[1]);
      const [folded] = generatedClasses(html, 'ext');
      const [plain] = generatedClasses(html, 'base');

      expect(styleTags(html)).toEqual([
        `.${plain}{color:blue;}`,
        `.${wrapper}{color:red;}`,
        `.${folded}{color:blue;}.${folded}{color:red;}`,
      ]);
    });

    it('orders folded levels by definition, so an inner defined after its wrapper wins ties', () => {
      const Wrap = (props: object) => <Late {...props} />;
      const Red = styled(Wrap)`
        color: red;
      `;
      const Late = styled.div`
        color: blue;
      `;

      const html = ReactDOMServer.renderToString(<Red id="ext" />);
      const [folded] = generatedClasses(html, 'ext');

      expect(styleTags(html)[1]).toBe(`.${folded}{color:red;}.${folded}{color:blue;}`);
    });

    it('folds every wrapper in a stack of wrappers into the one element', () => {
      const Btn = styled.div`
        color: blue;
        padding-top: 1px;
      `;
      const O1 = styled(passThrough(Btn))`
        color: red;
      `;
      const O2 = styled(passThrough(O1))`
        color: green;
      `;

      const html = ReactDOMServer.renderToString(<O2 id="o2" />);
      const [folded] = generatedClasses(html, 'o2');

      expect(generatedClasses(html, 'o2')).toEqual([folded]);
      expect(styleTags(html)).toHaveLength(3);
      expect(styleTags(html)[2]).toBe(
        `.${folded}{color:blue;padding-top:1px;}.${folded}{color:red;}.${folded}{color:green;}`
      );
    });

    it('folds every level of an extended wrapper', () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;
      const Green = styled(Red)`
        color: green;
      `;

      const html = ReactDOMServer.renderToString(<Green id="g" />);
      const [folded] = generatedClasses(html, 'g');
      const [wrapperCss, innerCss] = styleTags(html);
      const wrapper = firstRuleClass(wrapperCss);

      expect(wrapperCss).toBe(`.${wrapper}{color:red;}.${wrapper}{color:green;}`);
      expect(innerCss).toBe(
        `.${folded}{color:blue;}.${folded}{color:red;}.${folded}{color:green;}`
      );
    });

    it('folds the levels of an element rendered through as={StyledComponent}', () => {
      const Base = styled.div`
        color: blue;
      `;
      const Ext = styled(Base)`
        color: red;
      `;
      const Other = styled.span`
        color: green;
      `;

      const html = ReactDOMServer.renderToString(<Ext as={Other} id="ext" />);
      const [folded] = generatedClasses(html, 'ext');

      expect(styleTags(html)[1]).toBe(
        `.${folded}{color:blue;}.${folded}{color:red;}.${folded}{color:green;}`
      );
    });

    it('keeps the wrapper class on a plain element, whose rules only the wrapper tag holds', () => {
      const Plain = (props: object) => <div {...props} />;
      const Red = styled(Plain)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Red id="ext" />);
      const [wrapper] = generatedClasses(html, 'ext');

      expect(styleTags(html)).toEqual([`.${wrapper}{color:red;}`]);
    });

    it('keeps the classes a user passes to a wrapper on the element', () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Red className="card" id="ext" />);
      const [folded] = generatedClasses(html, 'ext');

      expect(generatedClasses(html, 'ext')).toEqual([folded, 'card']);
      expect(styleTags(html)[1]).toBe(`.${folded}{color:blue;}.${folded}{color:red;}`);
    });

    it('keeps keyframes of the wrapper in the wrapper tag and the inner keyframes in the inner tag', () => {
      const spin = keyframes`
        to {
          opacity: 0;
        }
      `;
      const fade = keyframes`
        to {
          opacity: 1;
        }
      `;
      const Btn = styled.div`
        animation: ${fade} 1s;
      `;
      const Red = styled(passThrough(Btn))`
        animation: ${spin} 1s;
      `;

      const html = ReactDOMServer.renderToString(<Red id="ext" />);
      const [wrapperCss, innerCss] = styleTags(html);
      const keyframeNames = (cssText: string) =>
        [...cssText.matchAll(/@keyframes (\w+)/g)].map(match => match[1]);
      const [spinName] = keyframeNames(wrapperCss);
      const [fadeName] = keyframeNames(innerCss);

      const [folded] = generatedClasses(html, 'ext');
      const wrapper = /\.(\w+)\{animation/.exec(wrapperCss)?.[1];

      expect(spinName).not.toBe(fadeName);
      expect(wrapperCss).toBe(
        `@keyframes ${spinName}{to{opacity:0;}}.${wrapper}{animation:${spinName} 1s;}`
      );
      expect(innerCss).toBe(
        `@keyframes ${fadeName}{to{opacity:1;}}` +
          `.${folded}{animation:${fadeName} 1s;}.${folded}{animation:${spinName} 1s;}`
      );
    });

    it('records nothing for a wrapper whose element is a client reference', () => {
      const ClientRef = fakeClientReference((props: object) => <div {...props} />);
      const FromClientRef = styled(ClientRef)`
        color: red;
      `;
      const Btn = styled.div`
        color: blue;
      `;
      const wrapper = firstRuleClass(
        styleTags(ReactDOMServer.renderToString(<FromClientRef />))[0]
      );

      const html = ReactDOMServer.renderToString(
        <>
          <FromClientRef />
          <Btn className={wrapper} id="base" />
        </>
      );
      const [plain] = generatedClasses(html, 'base').filter(name => name !== wrapper);

      expect(generatedClasses(html, 'base')).toEqual([plain, wrapper]);
      expect(styleTags(html)[1]).toBe(`.${plain}{color:blue;}`);
    });

    it('lists each variant of one component once, in the order the variants rendered', () => {
      // The element's own variant (red) and two wrappers, one holding red and one green:
      // red renders first (outermost wrapper), green second, so green wins, as in the sheet.
      const Base = styled.div<{ $v?: string | undefined }>`
        color: ${p => p.$v || 'blue'};
      `;
      const Ext = styled(Base)`
        padding-top: 1px;
      `;
      const Inner = (props: { className?: string | undefined }) => (
        <Ext $v="red" className={props.className} id="inner" />
      );
      const Middle = (props: { className?: string | undefined }) => (
        <Ext $v="green" as={Inner} className={props.className} />
      );

      const html = ReactDOMServer.renderToString(<Ext $v="red" as={Middle} />);
      const [folded] = generatedClasses(html, 'inner');

      expect(styleTags(html)[2]).toBe(
        `.${folded}{color:red;}.${folded}{color:green;}.${folded}{padding-top:1px;}`
      );
    });

    it('emits nothing extra when no styled element follows a wrapper', () => {
      const Btn = styled.div`
        color: blue;
      `;

      expect(styleTags(ReactDOMServer.renderToString(<Btn className="x" />))).toHaveLength(1);
    });
  });

  describe('cascade invariant', () => {
    /** The top-level rules of CSS text; an at-rule with its nested rules is one rule. */
    function topLevelRules(css: string): string[] {
      const rules: string[] = [];
      let depth = 0;
      let from = 0;

      for (let at = 0; at < css.length; at++) {
        if (css[at] === '{') depth++;
        else if (css[at] === '}' && --depth === 0) {
          rules.push(css.slice(from, at + 1));
          from = at + 1;
        }
      }

      return rules;
    }

    /** Every rule on the page, and for each `data-probe` element its classes and the rules of the last tag before it in the document. */
    function readPage(html: string) {
      const allRules: string[] = [];
      const probes = new Map<string, { classes: string[]; ownRules: string[] }>();
      let ownRules: string[] = [];

      for (const match of html.matchAll(
        /<style[^>]*>([\s\S]*?)<\/style>|<[a-z]+[^>]* data-probe="([^"]*)"[^>]*>/g
      )) {
        if (match[1] !== undefined) {
          ownRules = topLevelRules(match[1]);
          allRules.push(...ownRules);
        } else {
          const classes = /class="([^"]*)"/.exec(match[0])?.[1].split(' ') ?? [];
          probes.set(match[2], { classes, ownRules });
        }
      }

      return { allRules, probes };
    }

    // The cascade cannot depend on tag order when every rule that can match an element
    // sits in that element's own tag: any later tag matching it repeats the same bytes.
    it.each(
      [...extensionScenarios, ...wrapperScenarios].map(
        scenario => [scenario.name, scenario] as const
      )
    )(
      'keeps every rule that can match an element in its own tag in the %s scenario',
      (_name, scenario) => {
        const { allRules, probes } = readPage(ReactDOMServer.renderToString(scenario.tree()));

        expect(probes.size).toBeGreaterThan(0);
        for (const { classes, ownRules } of probes.values()) {
          const generated = classes.filter(isGeneratedClass);
          const mentionedBy = (token: string) => new RegExp(`\\.${token}(?![A-Za-z0-9_-])`);

          // Without this, an element whose tag is missing or empty passes every check below. A class
          // a user passes owns no rule, so one class matching a rule of its own is what an element needs.
          if (classes.length > 0) {
            expect(
              classes.some(token => ownRules.some(rule => mentionedBy(token).test(rule)))
            ).toBe(true);
          }

          for (const token of generated) {
            for (const rule of allRules.filter(rule => mentionedBy(token).test(rule))) {
              expect(ownRules).toContain(rule);
            }
          }
        }
      }
    );
  });

  describe('extending a ruleless component (#5727)', () => {
    // The reporter flagged this as "might be only in RSC context"; pair
    // the basic-suite check (`src/test/basic.test.tsx`) with a server-
    // rendered round trip so the fix stays locked across both paths.
    it('applies the new rules when wrapping an empty styled component', () => {
      const Inner = styled(({ className }: { className?: string }) => (
        <span data-testid="inner" className={className}>
          inner
        </span>
      ))``;
      const Outer = styled(Inner)`
        color: red;
        width: 100px;
      `;

      const html = ReactDOMServer.renderToString(<Outer />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('color:red');
      expect(allCSS).toContain('width:100px');
    });
  });

  describe('base component CSS in RSC output (#5663)', () => {
    it('includes base component CSS when only the extended component renders', () => {
      // IconWrapper's width/height were lost when only the extended component rendered.
      const IconWrapper = styled.svg`
        width: 24px;
        height: 24px;
        display: inline-block;
        vertical-align: middle;
      `;
      const BrandIcon = styled(IconWrapper)`
        fill: currentColor;
        color: #007bff;
      `;

      const html = ReactDOMServer.renderToString(
        <BrandIcon viewBox="0 0 24 24">
          <path d="M12 2L2 22h20z" />
        </BrandIcon>
      );
      const allCSS = extractStyleContents(html);
      const chain = generatedClass(html);

      // All CSS from both base and extended must be present in the RSC output,
      // on the one class the element carries.
      expect(allCSS).toBe(
        `.${chain}{width:24px;height:24px;display:inline-block;vertical-align:middle;}.${chain}{fill:currentColor;color:#007bff;}`
      );
    });

    it('keeps base CSS with dynamic interpolations in the extended component', () => {
      const Card = styled.div`
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      `;
      const StatusCard = styled(Card)<{ $status: 'success' | 'error' }>`
        border-left: 4px solid ${p => (p.$status === 'success' ? '#28a745' : '#dc3545')};
        padding: 16px;
      `;

      const html = ReactDOMServer.renderToString(<StatusCard $status="error" />);
      const allCSS = extractStyleContents(html);
      const chain = generatedClass(html);

      // Base Card styles must be present even though only StatusCard renders
      expect(allCSS).toBe(
        `.${chain}{border-radius:8px;box-shadow:0 2px 4px rgba(0, 0, 0, 0.1);overflow:hidden;}.${chain}{border-left:4px solid #dc3545;padding:16px;}`
      );
    });

    it('includes base CSS that comes from the css helper used in interpolation', () => {
      const truncate = css`
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      const BaseLabel = styled.span`
        font-size: 14px;
        ${truncate}
      `;
      const BadgeLabel = styled(BaseLabel)`
        background: #e9ecef;
        border-radius: 12px;
        padding: 2px 8px;
      `;

      const html = ReactDOMServer.renderToString(<BadgeLabel>Status</BadgeLabel>);
      const allCSS = extractStyleContents(html);
      const chain = generatedClass(html);

      // Base CSS (including interpolated css`` helper) and extended styles
      expect(allCSS).toBe(
        `.${chain}{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.${chain}{background:#e9ecef;border-radius:12px;padding:2px 8px;}`
      );
    });
  });

  describe('chain class retargeting', () => {
    it('keeps a standalone component on its own class', () => {
      const Solo = styled.div`
        color: purple;
      `;

      const html = ReactDOMServer.renderToString(<Solo />);

      expect(classesOf(html)).toEqual([Solo.styledComponentId, generatedClass(html)]);
      expect(extractStyleContents(html)).toBe(`.${generatedClass(html)}{color:purple;}`);
    });
  });

  describe('cross-boundary extension (#5672)', () => {
    // Simulates the RSC boundary: styled(ClientComponent) where the target
    // is a non-styled React component (like an RSC client reference proxy).
    // isStyledComponent(target) returns false, baseStyle is undefined,
    // but the extension should still produce correct CSS.

    it('should generate CSS when extending a non-styled component', () => {
      const ClientButton = (props: React.JSX.IntrinsicElements['button']) => <button {...props} />;

      const DangerButton = styled(ClientButton)`
        background: #dc2626;
        color: white;
      `;

      const html = ReactDOMServer.renderToString(<DangerButton>Delete</DangerButton>);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toMatchInlineSnapshot(`".yAbnp{background:#dc2626;color:white;}"`);
    });

    it('should pass className through to the wrapped component', () => {
      const ClientButton = (props: React.JSX.IntrinsicElements['button']) => <button {...props} />;

      const ExtButton = styled(ClientButton)`
        padding: 12px;
      `;

      const html = ReactDOMServer.renderToString(<ExtButton>Click</ExtButton>);

      expect(html).toMatchInlineSnapshot(`
        <style data-styled>
          .bzGVaY{padding:12px;}
        </style>
        <button class="sc-kqxcKS bzGVaY">
          Click
        </button>
      `);
    });

    it('should not use precedence on cross-boundary style tags', () => {
      const ClientComp = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;
      const Extended = styled(ClientComp)`
        margin: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);

      // No precedence;inline style tags avoid Float merging/stripping
      expect(html).toMatchInlineSnapshot(`
        <style data-styled>
          .wgyXc{margin:8px;}
        </style>
        <div class="sc-kqxcKS wgyXc">
        </div>
      `);
      expect(html).not.toContain('precedence');
    });

    it('should handle multiple cross-boundary extensions of different components', () => {
      const ClientCard = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;
      const ClientButton = (props: React.JSX.IntrinsicElements['button']) => <button {...props} />;

      const DangerCard = styled(ClientCard)`
        border: 2px solid red;
      `;
      const PrimaryButton = styled(ClientButton)`
        background: blue;
      `;

      const html = ReactDOMServer.renderToString(
        <DangerCard>
          <PrimaryButton>Click</PrimaryButton>
        </DangerCard>
      );
      const allCSS = extractStyleContents(html);

      expect(allCSS).toMatchInlineSnapshot(
        `".fIlHpe{border:2px solid red;}.cavwPd{background:blue;}"`
      );
    });

    // hoistNonReactStatics must not copy React's internal type discriminators ($$typeof,
    // $$id, $$async, $$bound) from a client- or server-reference target onto the wrapping
    // styled component. React would see the wrapper itself as a reference and skip calling
    // its body, so every styled(ClientComponent) extension would produce no CSS. See
    // hoist.ts KNOWN_STATICS for the protection list.
    it('does not inherit React reference discriminators from a client-reference target', () => {
      const ClientButton = fakeClientReference(
        (props: React.JSX.IntrinsicElements['button']) => <button {...props} />,
        { $$async: false, $$id: 'app/components/client-button#default' }
      );

      const DangerButton = styled(ClientButton)`
        background: #dc2626;
      `;

      // The wrapper must not have inherited the client-reference markers,
      // otherwise React serializes it as a reference and skips our render.
      expect(Reflect.get(DangerButton, '$$typeof')).not.toBe(Symbol.for('react.client.reference'));
      expect(Reflect.get(DangerButton, '$$id')).toBeUndefined();
      expect(Reflect.get(DangerButton, '$$async')).toBeUndefined();

      const html = ReactDOMServer.renderToString(<DangerButton>Delete</DangerButton>);
      const allCSS = extractStyleContents(html);
      // Extension CSS must be emitted;proving the wrapper actually rendered.
      expect(allCSS).toContain('background:#dc2626;');
      // The element class must include the extension's generated class.
      expect(html).toMatch(/class="sc-[\w-]+ \w+"/);
    });

    it('does not inherit React reference discriminators from a server-reference target', () => {
      const ServerAction = Object.assign(
        (props: React.JSX.IntrinsicElements['form']) => <form {...props} />,
        {
          $$typeof: Symbol.for('react.server.reference'),
          $$id: 'app/actions/save#default',
          $$bound: null,
        }
      );

      const StyledForm = styled(ServerAction)`
        padding: 16px;
      `;

      expect(Reflect.get(StyledForm, '$$typeof')).not.toBe(Symbol.for('react.server.reference'));
      expect(Reflect.get(StyledForm, '$$id')).toBeUndefined();
      expect(Reflect.get(StyledForm, '$$bound')).toBeUndefined();

      const html = ReactDOMServer.renderToString(<StyledForm />);
      expect(extractStyleContents(html)).toContain('padding:16px;');
    });

    it('should forward props through cross-boundary extensions', () => {
      const ClientInput = (props: React.JSX.IntrinsicElements['input']) => <input {...props} />;

      const StyledInput = styled(ClientInput)`
        border: 1px solid gray;
      `;

      const html = ReactDOMServer.renderToString(
        <StyledInput type="email" placeholder="test@example.com" />
      );

      expect(html).toMatchInlineSnapshot(`
        <style data-styled>
          .TlAtb{border:1px solid gray;}
        </style>
        <input type="email"
               placeholder="test@example.com"
               class="sc-kqxcKS TlAtb"
        >
      `);
    });

    it('should support dynamic interpolations in cross-boundary extensions', () => {
      const ClientBox = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;

      const ColorBox = styled(ClientBox)<{ $bg: string }>`
        background: ${p => p.$bg};
        padding: 16px;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <ColorBox $bg="red">Red</ColorBox>
          <ColorBox $bg="blue">Blue</ColorBox>
        </div>
      );
      const allCSS = extractStyleContents(html);

      // Both dynamic variants should have their CSS emitted
      expect(allCSS).toMatchInlineSnapshot(
        `".UggJu{background:red;padding:16px;}.ezOOCn{background:blue;padding:16px;}"`
      );
    });

    it('should support attrs on cross-boundary extensions', () => {
      const ClientButton = (props: React.JSX.IntrinsicElements['button']) => <button {...props} />;

      const SubmitButton = styled(ClientButton).attrs({ type: 'submit' })`
        font-weight: bold;
      `;

      const html = ReactDOMServer.renderToString(<SubmitButton>Submit</SubmitButton>);

      expect(html).toMatchInlineSnapshot(`
        <style data-styled>
          .hKzoNx{font-weight:bold;}
        </style>
        <button type="submit"
                class="sc-kqxcKS hKzoNx"
        >
          Submit
        </button>
      `);
    });

    it('should produce each style tag before its component element for correct source ordering', () => {
      const ClientBase = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;

      const Extended = styled(ClientBase)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);

      // The <style> tag should appear before the element in the HTML
      // (Fragment renders style first, then element) so it's available
      // before the element that references it
      const styleIdx = html.indexOf('<style');
      const divIdx = html.indexOf('<div');
      expect(styleIdx).toBeGreaterThan(-1);
      expect(divIdx).toBeGreaterThan(-1);
      expect(styleIdx).toBeLessThan(divIdx);
    });
  });

  describe('adversarial CSS fuzzing', () => {
    const createDiv = () => styled.div``;
    type StyledDiv = ReturnType<typeof createDiv>;

    /**
     * Retargeting must swap class names and write nothing else, so the chain tag
     * of an extension equals its base's own tag with the class renamed, then the
     * extension's rule.
     */
    function expectPureRename(Base: StyledDiv) {
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <>
          <Base id="plain" />
          <Extended id="extended" />
        </>
      );
      const [plain, chain] = ['plain', 'extended'].map(id => generatedClass(html, id));
      const [baseTag, chainTag] = styleTags(html);

      // A base and an extension sharing a component id is a shape no app has, and the chain would match it by id.
      expect(Extended.styledComponentId).not.toBe(Base.styledComponentId);
      expect(chainTag).toBe(`${baseTag.split('.' + plain).join('.' + chain)}.${chain}{color:red;}`);
    }

    /** Each base is built when its row runs, after the id counter reset, so no two components share an id. */
    it.each([
      [
        'a content string that looks like a class name',
        () => styled.div`
          &::before {
            content: '.sc-something';
          }
          padding: 8px;
        `,
      ],
      [
        'a url value with dots',
        () => styled.div`
          background: url(./../image.png);
          display: block;
        `,
      ],
      [
        'an attribute selector with a dot-prefixed value',
        () => styled.div`
          &[data-value='.foo'] {
            background: yellow;
          }
          margin: 4px;
        `,
      ],
      [
        'a rule that starts with :where()',
        () => styled.div`
          :where(.other) {
            color: red;
          }
          padding: 12px;
        `,
      ],
      [
        'an @supports selector() at-rule',
        () => styled.div`
          display: flex;
          @supports selector(.test) {
            display: grid;
          }
        `,
      ],
      [
        'a custom property with a class-name-like value',
        () => styled.div`
          --my-var: .something;
          color: var(--my-var);
        `,
      ],
      [
        'an animation name that looks like a class prefix',
        () => styled.div`
          animation-name: sc-keyframes-abc;
          animation-duration: 1s;
        `,
      ],
      [
        'a unicode escape in a content string',
        () => styled.div`
          &::before {
            content: '\\2022';
          }
          margin: 0;
        `,
      ],
      [
        'many comma-separated selectors with functional pseudo-classes',
        () => styled.div`
          &:hover,
          &:focus,
          &:nth-child(2),
          &:not(:disabled) {
            outline: none;
          }
        `,
      ],
      [
        'an !important declaration',
        () => styled.div`
          color: blue !important;
          display: flex;
        `,
      ],
      [
        'a component selector interpolation',
        () => styled.div`
          ${styled.span`
            color: purple;
          `} {
            font-weight: bold;
          }
          padding: 8px;
        `,
      ],
      [
        'pseudo-classes, one of them compound',
        () => styled.div`
          color: blue;
          &:hover {
            color: darkblue;
          }
          &:focus:not(:disabled) {
            outline: 2px solid blue;
          }
        `,
      ],
      [
        'pseudo-elements',
        () => styled.div`
          &::before {
            content: '';
            display: block;
          }
          &::after {
            content: '';
            clear: both;
          }
        `,
      ],
      [
        'a function selector and an escaped parenthesis',
        () => styled.div`
          &:not(.b) { top: 0; }
          &.c\\(d { left: 0; }
          background: url(x.png);
        `,
      ],
      [
        'an @container query holding a nested selector',
        () => styled.div`
          container-type: inline-size;
          @container (min-width: 300px) {
            & {
              font-size: 18px;
            }
          }
        `,
      ],
      [
        'at-rules nested in at-rules',
        () => styled.div`
          color: black;
          @media (min-width: 768px) {
            color: gray;
            @supports (display: grid) {
              display: grid;
            }
          }
        `,
      ],
    ])('renames the base class and writes nothing else around %s', (_label, createBase) => {
      expectPureRename(createBase());
    });

    it('emits only the extension rule when its base has no CSS', () => {
      const Base = styled.div``;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);

      expect(extractStyleContents(html)).toBe(`.${generatedClass(html)}{color:red;}`);
    });
  });

  describe('RSC per-instance style emission', () => {
    // Each server-rendered instance emits its own inline <style> so a rule is
    // never left recorded-but-absent when React discards a Suspense fallback
    // that emitted it (#5808). Byte-identical duplicates compress away under
    // gzip; they are not merged in the DOM.
    it('should emit a style tag for each instance of the same static component', () => {
      const Button = styled.button`
        padding: 8px;
        color: blue;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Button>A</Button>
          <Button>B</Button>
          <Button>C</Button>
          <Button>D</Button>
          <Button>E</Button>
        </div>
      );

      expect(countStyleTags(html)).toBe(5);
      expect(extractStyleContents(html)).toBe('.iIYYsP{padding:8px;color:blue;}'.repeat(5));
    });

    it('should emit a style tag per instance for dynamic components with identical props', () => {
      const Box = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Box $color="red" />
          <Box $color="red" />
          <Box $color="red" />
        </div>
      );

      expect(countStyleTags(html)).toBe(3);
      expect(extractStyleContents(html)).toBe('.YKVKw{color:red;}'.repeat(3));
    });

    it('should emit separate style tags for dynamic components with different props', () => {
      const Box = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Box $color="red" />
          <Box $color="blue" />
          <Box $color="green" />
        </div>
      );

      expect(countStyleTags(html)).toBe(3);
      const allCSS = extractStyleContents(html);
      expect(allCSS).toMatchInlineSnapshot(
        `".YKVKw{color:red;}.jDUPMZ{color:blue;}.jygOGE{color:green;}"`
      );
    });

    it('should emit a tag per instance of an extended component, base chain included each time', () => {
      const Base = styled.div`
        display: flex;
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Extended />
          <Extended />
          <Extended />
        </div>
      );
      const chain = generatedClass(html);

      // Each instance emits its own base plus extension pair on the chain class.
      expect(countStyleTags(html)).toBe(3);
      expect(extractStyleContents(html)).toBe(
        `.${chain}{display:flex;}.${chain}{color:red;}`.repeat(3)
      );
    });

    it('should emit only this render’s base variant, never a sibling variant', () => {
      const DynamicBase = styled.div<{ $v: string }>`
        color: ${p => p.$v};
      `;
      const Extended = styled(DynamicBase)`
        font-weight: bold;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <DynamicBase $v="red" />
          <DynamicBase $v="blue" />
          <Extended id="extended" $v="red" />
        </div>
      );
      const chain = generatedClass(html, 'extended');

      const styles = styleTags(html);
      expect(styles[styles.length - 1]).toBe(`.${chain}{color:red;}.${chain}{font-weight:bold;}`);
    });

    describe('across concurrent requests', () => {
      /** Run one render inside its own request: a separate `React.cache` store over the shared module-level sheet. */
      const inRequest = (store: Map<Function, unknown>, render: () => string): string => {
        mockCacheStore.clear();
        store.forEach((value, key) => mockCacheStore.set(key, value));
        const html = render();
        store.clear();
        mockCacheStore.forEach((value, key) => store.set(key, value));

        return html;
      };

      it('emits the full rule when another request registered the name first', async () => {
        const Box = styled.div`
          color: red;
        `;
        const Other = styled.span`
          color: blue;
        `;
        const requestA = new Map<Function, unknown>();
        const requestB = new Map<Function, unknown>();

        // A starts (and resets the shared sheet), B registers Box, then A reaches Box.
        inRequest(requestA, () => ReactDOMServer.renderToString(<Other />));
        const htmlB = inRequest(requestB, () => ReactDOMServer.renderToString(<Box />));
        await tick();
        const htmlA = inRequest(requestA, () => ReactDOMServer.renderToString(<Box />));

        expect(extractStyleContents(htmlB)).toBe('.jnDZvI{color:red;}');
        expect(extractStyleContents(htmlA)).toBe('.jnDZvI{color:red;}');
      });

      it('compiles a name once for every request that renders it', async () => {
        const Box = styled.div`
          color: red;
        `;
        const emit = jest.spyOn(mainCompiler, 'emit');
        const requestA = new Map<Function, unknown>();
        const requestB = new Map<Function, unknown>();

        try {
          const htmlA = inRequest(requestA, () => ReactDOMServer.renderToString(<Box />));
          await tick();
          const htmlB = inRequest(requestB, () => ReactDOMServer.renderToString(<Box />));

          expect(emit).toHaveBeenCalledTimes(1);
          expect(extractStyleContents(htmlB)).toBe(extractStyleContents(htmlA));
          expect(extractStyleContents(htmlB)).not.toBe('');
        } finally {
          emit.mockRestore();
        }
      });

      it('emits the full rule for a name another request registered and the cache has since evicted', async () => {
        const Dynamic = styled.div<{ $level: number }>`
          z-index: ${p => p.$level};
        `;
        const Other = styled.span`
          color: blue;
        `;
        const requestA = new Map<Function, unknown>();
        const requestB = new Map<Function, unknown>();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

        try {
          // A starts (and resets the shared sheet). B then renders the name
          // under test followed by enough other names to evict it.
          inRequest(requestA, () => ReactDOMServer.renderToString(<Other />));
          const htmlB = inRequest(requestB, () =>
            ReactDOMServer.renderToString(
              <>
                {Array.from({ length: TOO_MANY_CLASSES_LIMIT + 5 }, (_, i) => (
                  <Dynamic key={i} $level={i} />
                ))}
              </>
            )
          );
          await tick();
          const htmlA = inRequest(requestA, () =>
            ReactDOMServer.renderToString(<Dynamic $level={0} />)
          );

          const expected = extractStyleContents(htmlB).match(/\.\w+\{z-index:0;\}/)?.[0];
          expect(expected).toBeDefined();
          expect(extractStyleContents(htmlA)).toBe(expected);
        } finally {
          warn.mockRestore();
        }
      });

      it('emits the base chain of an extension when another request registered it first', async () => {
        const Base = styled.div`
          display: flex;
        `;
        const Extended = styled(Base)`
          color: red;
        `;
        const Other = styled.span`
          color: blue;
        `;
        const requestA = new Map<Function, unknown>();
        const requestB = new Map<Function, unknown>();

        inRequest(requestA, () => ReactDOMServer.renderToString(<Other />));
        inRequest(requestB, () => ReactDOMServer.renderToString(<Extended />));
        await tick();
        const htmlA = inRequest(requestA, () => ReactDOMServer.renderToString(<Extended />));
        const chain = generatedClass(htmlA);

        expect(extractStyleContents(htmlA)).toBe(`.${chain}{display:flex;}.${chain}{color:red;}`);
      });
    });

    describe('across a Suspense boundary (#5808)', () => {
      it('keeps the resolved instance styled after React discards the fallback', async () => {
        const Panel = styled.div`
          color: crimson;
        `;
        const Resolved = async () => {
          await tick();
          return <Panel>loaded</Panel>;
        };

        const { revealed, streamed } = await renderStreamed(
          <div>
            <Suspense fallback={<Panel>skeleton</Panel>}>
              <Resolved />
            </Suspense>
          </div>
        );

        // The fallback and the resolved content each stream their own full rule.
        expect(extractStyleContents(streamed)).toBe('.bMsfmI{color:crimson;}'.repeat(2));
        // The reveal discards the fallback's tag; the resolved tag stays.
        expect(countStyleTags(revealed)).toBe(1);
        expect(extractStyleContents(revealed)).toBe('.bMsfmI{color:crimson;}');
        expect(revealed).toContain('loaded');
        expect(revealed).not.toContain('skeleton');
      });

      it('keeps a referenced keyframe with the resolved instance', async () => {
        const spin = keyframes`
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        `;
        const Spinner = styled.div`
          animation: ${spin} 1s linear infinite;
        `;
        const Resolved = async () => {
          await tick();
          return <Spinner>loaded</Spinner>;
        };

        const { revealed } = await renderStreamed(
          <div>
            <Suspense fallback={<Spinner>skeleton</Spinner>}>
              <Resolved />
            </Suspense>
          </div>
        );

        expect(countStyleTags(revealed)).toBe(1);
        expect(extractStyleContents(revealed)).toBe(
          '@keyframes feWufh{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}' +
            '.hQnbLm{animation:feWufh 1s linear infinite;}'
        );
      });

      it('keeps the full base chain on the resolved instance of an extended component', async () => {
        const Base = styled.div`
          display: flex;
        `;
        const Extended = styled(Base)`
          color: red;
        `;
        const Resolved = async () => {
          await tick();
          return <Extended>loaded</Extended>;
        };

        const { revealed } = await renderStreamed(
          <div>
            <Suspense fallback={<Extended>skeleton</Extended>}>
              <Resolved />
            </Suspense>
          </div>
        );

        const chain = generatedClass(revealed);

        expect(extractStyleContents(revealed)).toBe(
          `.${chain}{display:flex;}.${chain}{color:red;}`
        );
      });
    });
  });

  describe('RSC keyframe emission', () => {
    it('should emit keyframes merged with component CSS in a single style tag', () => {
      const pulse = keyframes`
        0% { opacity: 1; }
        100% { opacity: 0; }
      `;

      const Dot = styled.div`
        animation: ${pulse} 2s infinite;
      `;

      const html = ReactDOMServer.renderToString(<Dot />);

      expect(extractStyleContents(html)).toMatchInlineSnapshot(
        `"@keyframes gZZrBJ{0%{opacity:1;}100%{opacity:0;}}.dRFKIK{animation:gZZrBJ 2s infinite;}"`
      );
      expect(countStyleTags(html)).toBe(1);
    });

    it('should emit the referenced keyframes alongside each component that uses them', () => {
      const fade = keyframes`
        0% { opacity: 1; }
        100% { opacity: 0; }
      `;

      const A = styled.div`
        animation: ${fade} 1s;
      `;
      const B = styled.span`
        animation: ${fade} 2s;
      `;

      const html = ReactDOMServer.renderToString(
        <>
          <A />
          <B />
        </>
      );

      // Each component carries the @keyframes it references in its own tag.
      expect(extractStyleContents(html)).toBe(
        '@keyframes gZZrBJ{0%{opacity:1;}100%{opacity:0;}}.eGskDT{animation:gZZrBJ 1s;}' +
          '@keyframes gZZrBJ{0%{opacity:1;}100%{opacity:0;}}.ctTFiD{animation:gZZrBJ 2s;}'
      );
      expect(countStyleTags(html)).toBe(2);
    });

    it('should emit a keyframe once per tag when a base and its extension both reference it', () => {
      const fade = keyframes`
        0% { opacity: 1; }
        100% { opacity: 0; }
      `;

      const Base = styled.div`
        animation: ${fade} 1s;
      `;
      const Extended = styled(Base)`
        animation: ${fade} 2s;
      `;

      const css = extractStyleContents(ReactDOMServer.renderToString(<Extended />));

      expect(css.split('@keyframes').length - 1).toBe(1);
    });

    it('should emit the keyframes for every instance so none is lost to a discarded fallback', () => {
      const spin = keyframes`
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      `;

      const Spinner = styled.div`
        animation: ${spin} 1s linear infinite;
      `;

      const html = ReactDOMServer.renderToString(
        <>
          <Spinner />
          <Spinner />
        </>
      );

      // Both instances carry their own keyframe and rule, so a Suspense reveal
      // that discards one instance never strips the other's animation (#5808).
      expect(extractStyleContents(html)).toBe(
        (
          '@keyframes dnfVul{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}' +
          '.gjRflG{animation:dnfVul 1s linear infinite;}'
        ).repeat(2)
      );
      expect(countStyleTags(html)).toBe(2);
    });
  });

  describe('redundant-emit warning', () => {
    itWarnsOnRedundantEmits({
      marker: 'instances of the styled component',
      renderMany: count => {
        const Cell = styled.span`
          color: red;
        `;

        ReactDOMServer.renderToString(
          <div>
            {Array.from({ length: count }, (_, i) => (
              <Cell key={i} />
            ))}
          </div>
        );

        return `${RSC_REDUNDANT_EMIT_WARN_THRESHOLD} instances of the styled component styled.span were rendered on one server-rendered page, so its styles repeat that many times in the HTML. This is fine at normal sizes. To trim a very large list, style the items from one styled parent element (for example a \`& > li\` selector) and render plain children, so the whole list emits a single tag.`;
      },
    });
  });

  describe('RSC shared style elements', () => {
    // Every instance still renders its own <style> tag; what is shared is the
    // element object behind it, so the server-component payload carries each
    // distinct style once and refers back to it for every repeat.
    it('returns the same element object for identical CSS from one component', () => {
      const Box = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;
      const seen: React.ReactElement[] = [];

      ReactDOMServer.renderToString(
        <>
          {renderInProbe(Box, { $color: 'red' }, seen)}
          {renderInProbe(Box, { $color: 'red' }, seen)}
          {renderInProbe(Box, { $color: 'red' }, seen)}
        </>
      );

      expect(seen).toHaveLength(3);
      expect(seen[1]).toBe(seen[0]);
      expect(seen[2]).toBe(seen[0]);
    });

    it('keeps one fixed React key per component', () => {
      const Box = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;
      const seen: React.ReactElement[] = [];

      ReactDOMServer.renderToString(
        <>
          {renderInProbe(Box, { $color: 'red' }, seen)}
          {renderInProbe(Box, { $color: 'blue' }, seen)}
        </>
      );

      expect(seen[0].key).toBe(`sc-${Box.styledComponentId}`);
      expect(seen[1].key).toBe(seen[0].key);
    });

    it('returns distinct elements for different CSS from one component', () => {
      const Box = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;
      const seen: React.ReactElement[] = [];

      ReactDOMServer.renderToString(
        <>
          {renderInProbe(Box, { $color: 'red' }, seen)}
          {renderInProbe(Box, { $color: 'blue' }, seen)}
        </>
      );

      expect(seen[1]).not.toBe(seen[0]);
    });

    it('never shares an element between two components with identical rules', () => {
      const First = styled.div`
        color: red;
      `;
      const Second = styled.div`
        color: red;
      `;
      const seen: React.ReactElement[] = [];

      ReactDOMServer.renderToString(
        <>
          {renderInProbe(First, {}, seen)}
          {renderInProbe(Second, {}, seen)}
        </>
      );

      expect(seen[1]).not.toBe(seen[0]);
    });

    it('never shares an element between a base and an extension with no rules of its own', () => {
      // An extension with an empty template returns its base's exact class
      // string, so only the component ID tells the two apart.
      const Base = styled.div`
        display: flex;
      `;
      const Ext = styled(Base).attrs({})``;

      const renderFresh = (tree: React.ReactElement) => {
        mockCacheStore.clear();
        return extractStyleContents(ReactDOMServer.renderToString(tree));
      };
      const baseAlone = renderFresh(<Base />);
      const extAlone = renderFresh(<Ext />);

      expect(baseAlone).toBe('.jYQgFj{display:flex;}');
      expect(extAlone).not.toBe('');
      expect(
        renderFresh(
          <>
            <Base />
            <Ext />
          </>
        )
      ).toBe(baseAlone + extAlone);
      expect(
        renderFresh(
          <>
            <Ext />
            <Base />
          </>
        )
      ).toBe(extAlone + baseAlone);

      const seen: React.ReactElement[] = [];
      mockCacheStore.clear();
      ReactDOMServer.renderToString(
        <>
          {renderInProbe(Base, {}, seen)}
          {renderInProbe(Ext, {}, seen)}
        </>
      );
      expect(seen).toHaveLength(2);
      expect(seen[1]).not.toBe(seen[0]);
    });

    it('never shares an element across StyleSheetManager settings that change the CSS', () => {
      const Box = styled.div`
        color: red;
      `;
      const seen: React.ReactElement[] = [];

      const html = ReactDOMServer.renderToString(
        <>
          <StyleSheetManager namespace="first">{renderInProbe(Box, {}, seen)}</StyleSheetManager>
          <StyleSheetManager namespace="second">{renderInProbe(Box, {}, seen)}</StyleSheetManager>
        </>
      );

      expect(seen[1]).not.toBe(seen[0]);
      expect(extractStyleContents(html)).toBe(
        'first .dBBIlU{color:red;}second .bDqllf{color:red;}'
      );
    });
  });

  describe('StyleSheetManager in RSC', () => {
    it('useStyleSheetContext returns a valid default context', () => {
      const seen: Array<ReturnType<typeof useStyleSheetContext>> = [];

      function Probe() {
        seen.push(useStyleSheetContext());
        return React.createElement('div', null, 'probe');
      }

      ReactDOMServer.renderToString(React.createElement(Probe));

      expect(seen).toHaveLength(1);

      const [ctx] = seen;

      expect(ctx.styleSheet).toBe(mainSheet);
      expect(ctx.compiler).toBeDefined();
      expect(typeof ctx.compiler.compile).toBe('function');
      expect(typeof ctx.compiler.emit).toBe('function');
      expect(ctx.shouldForwardProp).toBeUndefined();
    });

    it('should apply plugins to RSC output', () => {
      const Item = styled.li`
        &:first-child {
          color: red;
        }
        &:last-child {
          color: blue;
        }
        &:nth-child(2) {
          color: green;
        }
      `;

      const html = ReactDOMServer.renderToString(
        React.createElement(
          StyleSheetManager,
          { plugins: [rscPlugin] },
          React.createElement(
            'ul',
            null,
            React.createElement(Item, null, 'First'),
            React.createElement(Item, null, 'Second'),
            React.createElement(Item, null, 'Third')
          )
        )
      );

      const allCSS = extractStyleContents(html);
      expect(allCSS).toMatchInlineSnapshot(
        `".hvGsXB:nth-child(1 of :not(style[data-styled])){color:red;}.hvGsXB:nth-last-child(1 of :not(style[data-styled])){color:blue;}.hvGsXB:nth-child(2 of :not(style[data-styled])){color:green;}.hvGsXB:nth-child(1 of :not(style[data-styled])){color:red;}.hvGsXB:nth-last-child(1 of :not(style[data-styled])){color:blue;}.hvGsXB:nth-child(2 of :not(style[data-styled])){color:green;}.hvGsXB:nth-child(1 of :not(style[data-styled])){color:red;}.hvGsXB:nth-last-child(1 of :not(style[data-styled])){color:blue;}.hvGsXB:nth-child(2 of :not(style[data-styled])){color:green;}"`
      );
      expect(allCSS).not.toContain(':first-child');
      expect(allCSS).not.toContain(':last-child');
    });

    it('should omit RSC child-index rewrite when no plugins are provided', () => {
      const Item = styled.li`
        &:first-child {
          color: red;
        }
      `;

      const html = ReactDOMServer.renderToString(
        React.createElement('ul', null, React.createElement(Item, null, 'First'))
      );

      const allCSS = extractStyleContents(html);
      expect(allCSS).toMatchInlineSnapshot(`".dnGtrT:first-child{color:red;}"`);
      expect(allCSS).not.toContain(':not(style');
    });
  });

  describe('client reference proxy interpolation', () => {
    /** Simulate a named-export client reference (typeof 'function', throws on call) */
    function createNamedExportProxy(exportName: string) {
      return fakeClientReference(
        () => {
          throw new Error(
            `Attempted to call ${exportName}() from the server but it's on the client.`
          );
        },
        { $$async: false, $$id: `app/components/client-button.tsx#${exportName}` }
      );
    }

    /** Simulate a module-level client reference (typeof 'object', no $$id export suffix) */
    function createModuleLevelProxy(modulePath: string) {
      return fakeClientReference({}, { $$async: false, $$id: modulePath });
    }

    it.each([
      ['a named-export', createNamedExportProxy('ClientButton')],
      ['a module-level', createModuleLevelProxy('app/components/client-button.tsx')],
    ])(
      'skips %s client reference interpolation and renders the remaining CSS',
      (_label, reference) => {
        const Parent = styled.div`
        ${reference} {
          font-weight: bold;
        }
        padding: 8px;
      `;

        const html = ReactDOMServer.renderToString(<Parent />);

        expect(extractStyleContents(html)).toContain('padding:8px');
      }
    );

    it.each([
      [
        'the export name from $$id for a named-export proxy',
        createNamedExportProxy('ClientButton'),
        'ClientButton',
      ],
      [
        'the module path for a module-level proxy without an export name',
        createModuleLevelProxy('app/components/client-button.tsx'),
        'app/components/client-button.tsx',
      ],
    ])('warns with %s', (_label, reference, name) => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const Parent = styled.div`
          ${reference} {
            font-weight: bold;
          }
        `;

        ReactDOMServer.renderToString(<Parent />);

        expect(warnSpy.mock.calls).toEqual([
          [
            `[sc] interpolating a client component (${name}) as a selector is not supported in server components. Use a plain CSS class selector instead.`,
          ],
        ]);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
