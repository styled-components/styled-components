import React from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled from '../';
import { resetResponsiveCache } from '../responsive';
import { resetWarningsForTest } from '../transform/dev';

// Forward style verbatim to a host; models a Pressable-wrapping custom
// component so the pseudo-state tests below keep the state-callback
// style form. Plain styled.View / styled.Text resolve pseudo styles
// statically.
const StateView = (props: any) => <View {...props} />;

const flatOf = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, any>;

/** The first element below the styled component that received a `style`: the one the library styled. */
const hostOf = (element: React.ReactElement) =>
  TestRenderer.create(element).root.findAll(
    node =>
      node.props.style !== undefined &&
      !String((node.type as { displayName?: string }).displayName).startsWith('Styled(')
  )[0];

const styleOf = (element: React.ReactElement) => hostOf(element).props.style;

describe('modern CSS on React Native', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetResponsiveCache();
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('pseudo-state conditionals', () => {
    describe('warnings name what each element supports', () => {
      const messages = () => warnSpy.mock.calls.map(c => String(c[0]));

      // Message wording per element and pseudo-class is tabled in pseudoState.test.ts; these cases pin
      // that the render path passes the authored target and the live media environment through.
      const DISABLED_ON_VIEW =
        '[sc] `:disabled` styles on a styled View never apply on React Native: View cannot be disabled. Use `styled.Pressable`, `styled.Switch`, `styled.Text`, `styled.TouchableOpacity`, `styled.TouchableHighlight`, `styled.TextInput`, or a custom component given `disabled`.';

      it('names the elements that can be disabled for :disabled on a View', () => {
        const Comp = styled.View`
          &:disabled {
            opacity: 0.4;
          }
        `;
        TestRenderer.create(<Comp />);
        expect(messages()).toEqual([DISABLED_ON_VIEW]);
      });

      it('warns for :active only when a TouchableOpacity has :disabled and :active rules', () => {
        const Comp = styled(TouchableOpacity)`
          &:disabled {
            opacity: 0.4;
          }
          &:active {
            opacity: 0.5;
          }
        `;
        TestRenderer.create(<Comp />);
        expect(messages()).toEqual([
          '[sc] `:active` styles on a styled TouchableOpacity never apply on React Native: TouchableOpacity has no press, hover or focus state. Use `styled.Pressable` for press / hover / focus styling, or fence a web-only rule behind `@media (hover: hover)`.',
        ]);
      });

      it('stays silent for a rule fenced behind a non-matching media query', () => {
        const Comp = styled.View`
          @media (hover: hover) and (pointer: fine) {
            &:disabled {
              opacity: 0.4;
            }
          }
        `;
        TestRenderer.create(<Comp />);
        expect(messages()).toEqual([]);
      });
    });

    describe('pseudo-class compounds', () => {
      describe.each([
        ['no at-rule', ''],
        ['@media', '@media (min-width: 0px)'],
        ['@supports', '@supports (display: flex)'],
      ])('a compound under %s on a Pressable', (_name, gate) => {
        it.each([
          ['&:active:not(:disabled)', {}, { pressed: true }, true],
          ['&:active:not(:disabled)', {}, { pressed: false }, false],
          ['&:active:not(:disabled)', { disabled: true }, { pressed: true }, false],
          ['&:hover:enabled', {}, { hovered: true }, true],
          ['&:hover:enabled', {}, { hovered: false }, false],
          ['&:hover:enabled', { disabled: true }, { hovered: true }, false],
          ['&:not(:disabled):active', {}, { pressed: true }, true],
          ['&:not(:disabled):active', {}, { pressed: false }, false],
          ['&:not(:disabled):active', { disabled: true }, { pressed: true }, false],
          ['&:not(:active):hover', {}, { hovered: true }, true],
          ['&:not(:active):hover', {}, { hovered: true, pressed: true }, false],
          ['&:not(:active):hover', {}, { pressed: false }, false],
          ['&:not([data-x]):hover', {}, { hovered: true }, true],
          ['&:not([data-x]):hover', {}, { hovered: false }, false],
          ['&:not([data-x]):hover', { 'data-x': '1' }, { hovered: true }, false],
          ['&:hover:active:enabled', {}, { hovered: true, pressed: true }, true],
          ['&:hover:active:enabled', {}, { hovered: true }, false],
          ['&:hover:active:enabled', {}, { pressed: true }, false],
          ['&:hover:active:enabled', { disabled: true }, { hovered: true, pressed: true }, false],
          ['&:not(:active)', {}, { pressed: false }, true],
          ['&:not(:active)', {}, { pressed: true }, false],
          ['&:not(:disabled)', {}, {}, true],
          ['&:not(:disabled)', { disabled: true }, {}, false],
        ])('applies %s with props %j at press state %j: %s', (selector, props, state, applies) => {
          const rule = `${selector} { opacity: 0.5; }`;
          const Comp = styled(Pressable)`
            opacity: 1;
            ${gate === '' ? rule : `${gate} { ${rule} }`}
          `;
          const style = styleOf(<Comp {...props} />);
          const resolved = typeof style === 'function' ? style(state) : style;
          expect(flatOf(resolved).opacity).toBe(applies ? 0.5 : 1);
        });
      });

      it('applies a compound of two element states from the props, as a plain style', () => {
        const Forwarder = (props: any) => <View {...props} />;
        const Comp = styled(Forwarder)`
          opacity: 1;
          &:enabled:read-write {
            opacity: 0.5;
          }
        `;
        const writable = TestRenderer.create(<Comp readOnly={false} />).root.findByType(View).props
          .style;
        expect(typeof writable).not.toBe('function');
        expect(flatOf(writable).opacity).toBe(0.5);

        const readOnly = TestRenderer.create(<Comp />).root.findByType(View).props.style;
        expect(typeof readOnly).not.toBe('function');
        expect(flatOf(readOnly).opacity).toBe(1);

        const disabled = TestRenderer.create(<Comp readOnly={false} disabled />).root.findByType(
          View
        ).props.style;
        expect(flatOf(disabled).opacity).toBe(1);
      });

      it('keeps the function form for a compound that mixes an interaction and an element state', () => {
        const Forwarder = (props: any) => <View {...props} />;
        const Comp = styled(Forwarder)`
          &:hover:enabled {
            opacity: 0.5;
          }
        `;
        const style = TestRenderer.create(<Comp />).root.findByType(View).props.style;
        expect(typeof style).toBe('function');
        expect(style({ hovered: true })).toEqual([{}, { opacity: 0.5 }]);
      });

      it('gives a View a plain style and no effect for an interaction compound', () => {
        const Comp = styled.View`
          width: 10px;
          &:active:not(:disabled) {
            opacity: 0.5;
          }
        `;
        const style = TestRenderer.create(<Comp />).root.findByType(View).props.style;
        expect(typeof style).not.toBe('function');
        expect(flatOf(style)).toEqual({ width: 10 });
      });
    });

    it('produces a function style that resolves pressed state from &:active', () => {
      const Comp = styled(StateView)`
        background-color: white;
        &:active {
          opacity: 0.5;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const pressable = tree.root.findByType(View);
      expect(typeof pressable.props.style).toBe('function');

      expect(pressable.props.style({ pressed: false })).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
        ]
      `);
      expect(pressable.props.style({ pressed: true })).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
          {
            "opacity": 0.5,
          },
        ]
      `);
    });

    it('resolves hover state (&:hover)', () => {
      const Comp = styled(StateView)`
        color: black;
        &:hover {
          color: purple;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const pressable = tree.root.findByType(View);
      expect(pressable.props.style({ hovered: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "purple",
          },
        ]
      `);
      expect(pressable.props.style({ hovered: false })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
        ]
      `);
    });

    it('aliases :focus-visible to :focus on native (web parity for portable code)', () => {
      const Comp = styled(StateView)`
        color: black;
        &:focus-visible {
          color: orange;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const pressable = tree.root.findByType(View);
      expect(pressable.props.style({ focused: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "orange",
          },
        ]
      `);
      expect(pressable.props.style({ focused: false })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
        ]
      `);
    });

    // https://drafts.csswg.org/selectors-4/#the-is-pseudo
    // https://drafts.csswg.org/selectors-4/#the-where-pseudo
    describe('CSS Selectors 4 :is() / :where() on native (pseudo-state lists)', () => {
      // "The matches-any pseudo-class, :is(), ... is a functional pseudo-class taking
      // a selector list as its argument."
      // On RN we only expand lists of supported pseudo-classes (see nativePlan).
      it('&:is(:hover, :focus) applies when either pseudo state matches', () => {
        const Comp = styled(StateView)`
          opacity: 1;
          &:is(:hover, :focus) {
            opacity: 0.5;
          }
        `;
        const tree = TestRenderer.create(<Comp />);
        const style = tree.root.findByType(View).props.style as (s: any) => any[];
        expect(style({ hovered: true, focused: false })).toMatchInlineSnapshot(`
          [
            {
              "opacity": 1,
            },
            {
              "opacity": 0.5,
            },
          ]
        `);
        expect(style({ hovered: false, focused: true })).toMatchInlineSnapshot(`
          [
            {
              "opacity": 1,
            },
            {
              "opacity": 0.5,
            },
          ]
        `);
        expect(style({ hovered: false, focused: false })).toMatchInlineSnapshot(`
          [
            {
              "opacity": 1,
            },
          ]
        `);
      });

      it('&:where(:active, :disabled) fans out like separate pseudo rules', () => {
        const Comp = styled(StateView)`
          opacity: 1;
          &:where(:active, :disabled) {
            opacity: 0.4;
          }
        `;
        const tree = TestRenderer.create(<Comp />);
        const style = tree.root.findByType(View).props.style as (s: any) => any[];
        expect(style({ pressed: true })).toMatchInlineSnapshot(`
          [
            {
              "opacity": 1,
            },
            {
              "opacity": 0.4,
            },
          ]
        `);
        expect(style({ pressed: false })).toMatchInlineSnapshot(`
          [
            {
              "opacity": 1,
            },
          ]
        `);

        // `:disabled` reads the `disabled` prop the element receives, not the style function's argument.
        const disabledTree = TestRenderer.create(<Comp disabled />);
        const disabledStyle = disabledTree.root.findByType(View).props.style as (s: any) => any[];
        expect(disabledStyle({})).toMatchInlineSnapshot(`
          [
            {
              "opacity": 1,
            },
            {
              "opacity": 0.4,
            },
          ]
        `);
      });
    });

    it('merges user style function under pseudo state', () => {
      const Comp = styled(StateView)<{ style?: any }>`
        background-color: white;
        &:active {
          opacity: 0.5;
        }
      `;
      const userStyle = ({ pressed }: any) => ({ borderWidth: pressed ? 2 : 0 });
      const tree = TestRenderer.create(<Comp style={userStyle} />);
      const pressable = tree.root.findByType(View);

      expect(pressable.props.style({ pressed: true })).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
          {
            "opacity": 0.5,
          },
          {
            "borderWidth": 2,
          },
        ]
      `);
    });

    // https://drafts.csswg.org/selectors-4/#enableddisabled (12.1.1)
    // "The :enabled pseudo-class represents user interface elements that are in an enabled state; such elements must have a corresponding disabled state. Conversely, the :disabled pseudo-class represents user interface elements that are in a disabled state; such elements must have a corresponding enabled state."
    // "What constitutes an enabled state, a disabled state, and a user interface element is host-language-dependent. In a typical document most elements will be neither :enabled nor :disabled. For example, [HTML] defines non-disabled interactive elements to be :enabled, and any such elements that are explicitly disabled to be :disabled."
    // "Note: CSS properties that might affect a user’s ability to interact with a given user interface element do not affect whether it matches :enabled or :disabled; e.g., the display and visibility properties have no effect on the enabled/disabled state of an element."
    // Deviation: here every element that isn't disabled matches `:enabled`, on native and on the bridge,
    // so `:enabled` is the exact complement of `:disabled`.
    describe(':disabled and :enabled from the element props', () => {
      const realOS = Platform.OS;
      afterEach(() => {
        Platform.OS = realOS;
      });

      describe('on a Pressable', () => {
        const OnlyDisabled = styled(Pressable)`
          opacity: 1;
          &:disabled {
            opacity: 0.4;
          }
        `;

        it('hands the host a plain style when the rules read only element states', () => {
          expect(typeof styleOf(<OnlyDisabled disabled />)).not.toBe('function');
          expect(typeof styleOf(<OnlyDisabled />)).not.toBe('function');
        });

        it('applies the bucket when `disabled` is true', () => {
          expect(flatOf(styleOf(<OnlyDisabled disabled />)).opacity).toBe(0.4);
        });

        it('does not apply the bucket without `disabled`', () => {
          expect(flatOf(styleOf(<OnlyDisabled />)).opacity).toBe(1);
        });

        it('applies the bucket when `.attrs` supplies `disabled`', () => {
          const Attrs = styled(Pressable).attrs({ disabled: true })`
            opacity: 1;
            &:disabled {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Attrs />)).opacity).toBe(0.4);
        });

        it('does not apply the bucket when `shouldForwardProp` drops `disabled`', () => {
          const Dropped = styled(Pressable).withConfig({
            shouldForwardProp: prop => prop !== 'disabled',
          })`
            opacity: 1;
            &:disabled {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Dropped disabled />)).opacity).toBe(1);
        });

        it.each([
          [true, false],
          [false, true],
        ])('&:not(:disabled) with disabled=%s applies: %s', (disabled, applies) => {
          const Comp = styled(Pressable)`
            opacity: 1;
            &:not(:disabled) {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Comp disabled={disabled} />)).opacity).toBe(applies ? 0.4 : 1);
        });

        it('applies a bucket nested in a matching @media', () => {
          const Comp = styled(Pressable)`
            opacity: 1;
            @media (min-width: 100px) {
              &:disabled {
                opacity: 0.4;
              }
            }
          `;
          expect(flatOf(styleOf(<Comp disabled />)).opacity).toBe(0.4);
        });

        // https://drafts.csswg.org/selectors-4/#specificity-rules
        // "count the number of class selectors, attributes selectors, and pseudo-classes in the selector (= B)"
        // Deviation: `&[data-x]` and `&:disabled` tie at (0,1,0), so a browser applies the later rule;
        // native always layers the pseudo-class rule after the attribute rule, in either source order.
        const attributeRule = `&[data-x] { opacity: 0.2; }`;
        const pseudoRule = `&:disabled { opacity: 0.4; }`;

        it.each([
          ['attribute rule first', [attributeRule, pseudoRule]],
          ['pseudo rule first', [pseudoRule, attributeRule]],
        ])('layers :disabled after an attribute selector rule with the %s', (_name, rules) => {
          const Comp = styled(Pressable)`
            opacity: 1;
            ${rules.join('\n')}
          `;
          expect(flatOf(styleOf(<Comp data-x="1" disabled />)).opacity).toBe(0.4);
          expect(flatOf(styleOf(<Comp data-x="1" />)).opacity).toBe(0.2);
        });

        it('layers :disabled after a matched @media rule declared later', () => {
          const Comp = styled(Pressable)`
            opacity: 1;
            &:disabled {
              opacity: 0.4;
            }
            @media (min-width: 100px) {
              opacity: 0.2;
            }
          `;
          expect(flatOf(styleOf(<Comp disabled />)).opacity).toBe(0.4);
          expect(flatOf(styleOf(<Comp />)).opacity).toBe(0.2);
        });

        it('lets !important beat the caller style', () => {
          const Comp = styled(Pressable)`
            &:disabled {
              opacity: 0.4 !important;
            }
          `;
          expect(flatOf(styleOf(<Comp disabled style={{ opacity: 0.9 }} />)).opacity).toBe(0.4);
        });

        it('keeps the function style when an interaction rule exists, with `disabled` applying at every press state', () => {
          const Both = styled(Pressable)`
            opacity: 1;
            &:active {
              color: red;
            }
            &:disabled {
              opacity: 0.4;
            }
          `;
          const style = styleOf(<Both disabled />);
          expect(typeof style).toBe('function');
          expect(flatOf(style({ pressed: false }))).toEqual({ opacity: 0.4 });
          expect(flatOf(style({ pressed: true }))).toEqual({ color: 'red', opacity: 0.4 });
          expect(flatOf(styleOf(<Both />)({ pressed: false }))).toEqual({ opacity: 1 });
        });

        it('keeps a caller function style a function, which sees the press state', () => {
          const seen: unknown[] = [];
          const callerStyle = (state: unknown) => {
            seen.push(state);
            return { borderWidth: 1 };
          };
          const style = styleOf(<OnlyDisabled disabled style={callerStyle} />);
          expect(typeof style).toBe('function');
          expect(flatOf(style({ pressed: true }))).toEqual({ borderWidth: 1, opacity: 0.4 });
          // Pressable itself evaluates the style at rest too, so the call with `pressed` is among them.
          expect(seen).toContainEqual({ pressed: true });
        });

        it('lets `as={View}` never match :disabled, warn, and always match :enabled', () => {
          const Comp = styled(Pressable)`
            opacity: 1;
            &:disabled {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Comp as={View} disabled />)).opacity).toBe(1);
          expect(warnSpy.mock.calls.some(c => /:disabled/.test(c[0]))).toBe(true);

          const Enabled = styled(Pressable)`
            opacity: 1;
            &:enabled {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Enabled as={View} />)).opacity).toBe(0.4);
        });
      });

      describe('on a TouchableOpacity', () => {
        const Comp = styled(TouchableOpacity)`
          opacity: 1;
          &:disabled {
            opacity: 0.4;
          }
        `;

        it('matches :disabled from `disabled`, as a plain style', () => {
          const style = styleOf(<Comp disabled />);
          expect(typeof style).not.toBe('function');
          expect(flatOf(style).opacity).toBe(0.4);
        });
      });

      describe('on a TouchableHighlight', () => {
        const Comp = styled(TouchableHighlight)`
          opacity: 1;
          &:disabled {
            opacity: 0.4;
          }
        `;

        it('matches :disabled from `disabled`', () => {
          const style = styleOf(
            <Comp disabled>
              <View />
            </Comp>
          );
          expect(flatOf(style).opacity).toBe(0.4);
        });
      });

      describe('on a Switch', () => {
        const Comp = styled(Switch)`
          opacity: 1;
          &:disabled {
            opacity: 0.4;
          }
        `;

        it.each(['ios', 'android'] as const)('matches :disabled from `disabled` on %s', os => {
          Platform.OS = os;
          expect(flatOf(styleOf(<Comp disabled />)).opacity).toBe(0.4);
        });
      });

      describe('on a Text', () => {
        const Comp = styled.Text`
          opacity: 1;
          &:disabled {
            opacity: 0.4;
          }
        `;

        it.each([
          ['no props', false, {}],
          ['disabled', true, { disabled: true }],
          ['aria-disabled', true, { 'aria-disabled': true }],
          ['accessibilityState.disabled', true, { accessibilityState: { disabled: true } }],
          [
            'disabled={false} beside aria-disabled',
            false,
            { 'aria-disabled': true, disabled: false },
          ],
        ])('given %s, :disabled applies: %s', (_name, applies, props) => {
          const style = styleOf(<Comp {...props}>text</Comp>);
          expect(typeof style).not.toBe('function');
          expect(flatOf(style).opacity).toBe(applies ? 0.4 : 1);
          expect(warnSpy).not.toHaveBeenCalled();
        });

        it('reaches the Text under an Animated wrapper', () => {
          const Animating = styled(Animated.Text as any)`
            opacity: 1;
            &:disabled {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Animating aria-disabled>text</Animating>)).opacity).toBe(0.4);
          expect(warnSpy).not.toHaveBeenCalled();
        });
      });

      describe('on a Button', () => {
        it('warns that a Button applies no style, and keeps the base styles', () => {
          const Comp = styled.Button`
            opacity: 1;
            &:disabled {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Comp title="go" disabled />)).opacity).toBe(1);
          expect(warnSpy.mock.calls.map(c => String(c[0]))).toEqual([
            '[sc] `:disabled` styles on a styled Button never apply on React Native: it never applies the `style` it is given. Use `styled.Pressable` around a `Text` instead.',
          ]);
        });
      });

      // The names of React Native's own components mean nothing for a component that only shares one.
      describe.each(['Button', 'Text', 'Switch', 'TouchableOpacity', 'View', 'Pressable'])(
        'a custom component named %s',
        name => {
          const Named = Object.assign((props: any) => <View {...props} />, { displayName: name });

          it('matches :disabled from `disabled` alone, and warns nothing', () => {
            const Comp = styled(Named)`
              opacity: 1;
              &:disabled {
                opacity: 0.4;
              }
            `;
            expect(flatOf(styleOf(<Comp disabled />)).opacity).toBe(0.4);
            expect(flatOf(styleOf(<Comp aria-disabled />)).opacity).toBe(1);
            expect(warnSpy).not.toHaveBeenCalled();
          });

          it('keeps a function style for an :hover rule', () => {
            const Comp = styled(Named)`
              opacity: 1;
              &:hover {
                opacity: 0.4;
              }
            `;
            const style = styleOf(<Comp />);
            expect(typeof style).toBe('function');
            expect(flatOf(style({ hovered: true })).opacity).toBe(0.4);
            expect(warnSpy).not.toHaveBeenCalled();
          });
        }
      );

      it('counts a function named Button as custom', () => {
        const Button = (props: any) => <View {...props} />;
        const Comp = styled(Button)`
          &:disabled {
            opacity: 0.4;
          }
        `;
        expect(flatOf(styleOf(<Comp disabled />)).opacity).toBe(0.4);
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it('hands a custom component named TextInput its own props untranslated', () => {
        const NamedInput = Object.assign((props: any) => <View {...props} />, {
          displayName: 'TextInput',
        });
        const Comp = styled(NamedInput)`
          opacity: 1;
        `;
        const props = TestRenderer.create(<Comp disabled />).root.findByType(View).props;
        expect({
          disabled: props.disabled,
          editable: props.editable,
          readOnly: props.readOnly,
        }).toEqual({ disabled: true, editable: undefined, readOnly: undefined });
      });

      describe('on a View', () => {
        it('hands a plain style to a View with a caller function style and only :disabled', () => {
          const Comp = styled.View`
            opacity: 1;
            &:disabled {
              opacity: 0.4;
            }
          `;
          const style = styleOf(<Comp style={(() => ({ borderWidth: 1 })) as any} />);
          expect(typeof style).not.toBe('function');
          expect(flatOf(style)).toEqual({ borderWidth: 1, opacity: 1 });
        });
      });

      describe('on a custom component', () => {
        const Forwarder = (props: any) => <View {...props} />;

        it('keeps the base styles of a wrapper that spreads `style` onto a View', () => {
          const Comp = styled(Forwarder)`
            width: 10px;
            &:disabled {
              opacity: 0.4;
            }
          `;
          const style = styleOf(<Comp />);
          expect(typeof style).not.toBe('function');
          expect(flatOf(style)).toEqual({ width: 10 });
          expect(flatOf(styleOf(<Comp disabled />))).toEqual({ opacity: 0.4, width: 10 });
        });

        it('counts an unnamed forwardRef component as custom', () => {
          const Unnamed = React.forwardRef<unknown, any>((props, ref) => (
            <View {...props} ref={ref as any} />
          ));
          const Comp = styled(Unnamed)`
            &:disabled {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Comp disabled />)).opacity).toBe(0.4);
          expect(flatOf(styleOf(<Comp />)).opacity).toBeUndefined();
        });

        it('ignores a `disabled` handed to the style function', () => {
          const Comp = styled(Forwarder)`
            width: 10px;
            &:active {
              color: red;
            }
            &:disabled {
              opacity: 0.4;
            }
          `;
          expect(flatOf(styleOf(<Comp />)({ disabled: true }))).toEqual({ width: 10 });
        });
      });

      it('tests `shouldForwardProp` against the authored target, not the sticky Animated wrapper', () => {
        const seen = new Set<unknown>();
        const Scroller = styled.ScrollView`
          flex: 1;
        `;
        const Header = styled.View.withConfig({
          shouldForwardProp: (_prop, el) => {
            seen.add(el);
            return true;
          },
        })`
          position: sticky;
          height: 40px;
        `;
        const tree = TestRenderer.create(
          <Scroller testID="scroller">
            <Header testID="header" />
          </Scroller>
        );
        const scroller = tree.root.findAllByType(ScrollView).pop();
        const layout = (y: number, height: number) => ({
          nativeEvent: { layout: { x: 0, y, width: 300, height } },
        });
        TestRenderer.act(() => {
          scroller?.props.onLayout(layout(0, 500));
        });
        TestRenderer.act(() => {
          tree.root
            .findAllByProps({ testID: 'header' })
            .find(node => typeof node.props.onLayout === 'function')
            ?.props.onLayout(layout(100, 40));
        });
        expect([...seen]).toEqual([View]);
      });
    });

    describe('TextInput disabled state', () => {
      const inputProps = (element: React.ReactElement) =>
        TestRenderer.create(element).root.findByType(TextInput).props;

      const Plain = styled.TextInput`
        color: black;
      `;
      const WhenDisabled = styled.TextInput`
        opacity: 1;
        &:disabled {
          opacity: 0.4;
        }
      `;
      const WhenEnabled = styled.TextInput`
        opacity: 1;
        &:enabled {
          opacity: 0.4;
        }
      `;

      it('makes a disabled input read-only, uneditable, unfocusable and announced as disabled', () => {
        const host = inputProps(<Plain disabled tabIndex={0} />);
        expect({
          'aria-disabled': host['aria-disabled'],
          editable: host.editable,
          focusable: host.focusable,
          hasTabIndex: 'tabIndex' in host,
          readOnly: host.readOnly,
        }).toEqual({
          'aria-disabled': true,
          editable: false,
          focusable: false,
          hasTabIndex: false,
          readOnly: true,
        });
      });

      it('makes `aria-readonly` read-only', () => {
        expect(inputProps(<Plain aria-readonly />).readOnly).toBe(true);
      });

      it('matches :disabled and not :enabled for a disabled input', () => {
        expect(flatOf(inputProps(<WhenDisabled disabled />).style).opacity).toBe(0.4);
        expect(flatOf(inputProps(<WhenEnabled disabled />).style).opacity).toBe(1);
      });

      it('matches :enabled and not :disabled for a read-only input', () => {
        expect(flatOf(inputProps(<WhenDisabled readOnly />).style).opacity).toBe(1);
        expect(flatOf(inputProps(<WhenEnabled readOnly />).style).opacity).toBe(0.4);
      });

      it('matches neither :disabled nor :read-only under interactivity: inert', () => {
        const Locked = styled.TextInput`
          interactivity: inert;
          opacity: 1;
          &:disabled {
            opacity: 0.4;
          }
          &:read-only {
            color: red;
          }
        `;
        const host = inputProps(<Locked />);
        expect(host.editable).toBe(false);
        expect(flatOf(host.style)).toEqual({ opacity: 1 });
      });

      it('gives neither the translation nor the match when `shouldForwardProp` drops the disabled props', () => {
        const Dropped = styled.TextInput.withConfig({
          shouldForwardProp: prop => prop !== 'disabled' && prop !== 'aria-disabled',
        })`
          opacity: 1;
          &:disabled {
            opacity: 0.4;
          }
        `;
        const host = inputProps(<Dropped disabled aria-disabled />);
        expect(host.editable).toBeUndefined();
        expect(host.readOnly).toBeUndefined();
        expect(flatOf(host.style).opacity).toBe(1);
      });

      it('gives both the translation and the match when `.attrs` supplies `disabled`', () => {
        const Attrs = styled.TextInput.attrs({ disabled: true })`
          opacity: 1;
          &:disabled {
            opacity: 0.4;
          }
        `;
        const host = inputProps(<Attrs />);
        expect(host.readOnly).toBe(true);
        expect(flatOf(host.style).opacity).toBe(0.4);
      });

      it('translates a nested styled TextInput once, with the same result', () => {
        const Outer = styled(WhenDisabled)`
          color: blue;
        `;
        const host = inputProps(<Outer disabled />);
        expect({
          'aria-disabled': host['aria-disabled'],
          editable: host.editable,
          focusable: host.focusable,
          readOnly: host.readOnly,
        }).toEqual({ 'aria-disabled': true, editable: false, focusable: false, readOnly: true });
        expect(flatOf(host.style)).toEqual({ color: 'blue', opacity: 0.4 });
      });

      it('translates a TextInput reached through `as`', () => {
        const Box = styled.View`
          color: black;
        `;
        const host = inputProps(<Box as={TextInput} disabled />);
        expect(host.readOnly).toBe(true);
        expect(host.editable).toBe(false);
      });
    });

    // https://drafts.csswg.org/selectors-4/#rw-pseudos (12.1.2)
    // "An element matches :read-write if it is user-alterable, as defined by the document language. Otherwise, it is :read-only."
    // "For example, in [HTML] a non-disabled non-readonly <input> element is :read-write, as is any element with the contenteditable attribute set to the true state."
    describe(':read-only and :read-write', () => {
      /** Which of the two complementary buckets applied: `rw` sets opacity, `ro` sets color. */
      const modeOf = (element: React.ReactElement) => {
        const style = flatOf(hostOf(element).props.style);
        const readOnly = style.color === 'red';
        const readWrite = style.opacity === 0.4;
        if (readOnly && readWrite) return 'both';
        return readOnly ? 'ro' : readWrite ? 'rw' : 'neither';
      };

      const Rules = `
        opacity: 1;
        &:read-write {
          opacity: 0.4;
        }
        &:read-only {
          color: red;
        }
      `;

      it.each([
        ['no props', 'rw', {}],
        ['readOnly', 'ro', { readOnly: true }],
        ['disabled', 'ro', { disabled: true }],
      ])('matches a TextInput with %s as :%s', (_name, mode, props) => {
        const Input = styled.TextInput`
          ${Rules}
        `;
        expect(modeOf(<Input {...props} />)).toBe(mode);
      });

      it('keeps a TextInput read-write under interactivity: inert', () => {
        const Locked = styled.TextInput`
          interactivity: inert;
          ${Rules}
        `;
        const element = <Locked />;
        expect(modeOf(element)).toBe('rw');
        expect(TestRenderer.create(element).root.findByType(TextInput).props.editable).toBe(false);
      });

      it('matches a View as :read-only and never :read-write', () => {
        const Comp = styled.View`
          ${Rules}
        `;
        expect(modeOf(<Comp />)).toBe('ro');
      });

      it('warns for :read-write on a View and stays silent for it on a Pressable', () => {
        const OnView = styled.View`
          &:read-write {
            opacity: 0.4;
          }
        `;
        TestRenderer.create(<OnView />);
        expect(warnSpy.mock.calls.some(c => /:read-write/.test(c[0]))).toBe(true);

        warnSpy.mockClear();
        resetWarningsForTest();
        const OnPressable = styled.Pressable`
          &:read-write {
            opacity: 0.4;
          }
        `;
        TestRenderer.create(<OnPressable />);
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it('never applies &:not(:read-only) on a View', () => {
        const Comp = styled.View`
          opacity: 1;
          &:not(:read-only) {
            opacity: 0.4;
          }
        `;
        expect(flatOf(hostOf(<Comp />).props.style).opacity).toBe(1);
      });

      describe('on a custom component', () => {
        const Forwarder = (props: any) => <View {...props} />;
        const Comp = styled(Forwarder)`
          ${Rules}
        `;

        it.each([
          ['no props', 'ro', {}],
          ['readOnly={false}', 'rw', { readOnly: false }],
          ['editable={true}', 'rw', { editable: true }],
          ['editable={false}', 'ro', { editable: false }],
          ['readOnly beside editable={true}', 'ro', { editable: true, readOnly: true }],
          ['readOnly={false} beside editable={false}', 'rw', { editable: false, readOnly: false }],
        ])('matches %s as :%s', (_name, mode, props) => {
          expect(modeOf(<Comp {...props} />)).toBe(mode);
        });

        it('stays read-only when `shouldForwardProp` drops `editable`', () => {
          const Dropped = styled(Forwarder).withConfig({
            shouldForwardProp: prop => prop !== 'editable',
          })`
            ${Rules}
          `;
          expect(modeOf(<Dropped editable />)).toBe('ro');
        });
      });
    });
  });
});
