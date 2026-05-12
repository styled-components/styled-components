import React from 'react';
import { Appearance, Dimensions, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { NativeStyleContext } from '../';
import { DEFAULT_CASCADE } from '../NativeStyleContext';
import { resetResponsiveCache } from '../responsive';

describe('modern CSS on React Native', () => {
  beforeEach(() => {
    resetResponsiveCache();
  });

  describe('base styles (no conditionals)', () => {
    it('returns a flat style object when no conditionals present', () => {
      const Comp = styled.View`
        color: red;
        padding-top: 10px;
      `;
      const tree = TestRenderer.create(<Comp />);
      const view = tree.root.findByType(View);
      expect(view.props.style).toMatchInlineSnapshot(`
        {
          "color": "red",
          "paddingTop": 10,
        }
      `);
    });
  });

  describe('@media conditionals', () => {
    it('merges media query styles when matching on initial dimensions', () => {
      // RN jest mock reports window width/height via Dimensions.get, which
      // defaults to 750×1334 in the mock setup.
      const Comp = styled.View`
        color: red;
        @media (min-width: 500px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const view = tree.root.findByType(View);
      expect(view.props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('skips non-matching media query styles', () => {
      const Comp = styled.View`
        color: red;
        @media (min-width: 2000px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const view = tree.root.findByType(View);
      // Only base applies; no matched conditional entries.
      expect(view.props.style).toEqual({ color: 'red' });
    });

    it('evaluates max-width', () => {
      const Comp = styled.View`
        color: red;
        @media (max-width: 1000px) {
          color: blue;
        }
        @media (max-width: 100px) {
          color: green;
        }
      `;
      // Mock window width = 750, so max-width 1000px matches, 100px does not.
      const tree = TestRenderer.create(<Comp />);
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('evaluates orientation', () => {
      // Mock: width 750, height 1334;portrait (height >= width).
      const Comp = styled.View`
        color: red;
        @media (orientation: portrait) {
          padding-top: 10px;
        }
        @media (orientation: landscape) {
          padding-top: 99px;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "paddingTop": 10,
          },
        ]
      `);
    });

    it('evaluates prefers-color-scheme', () => {
      const getColorSchemeSpy = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
      try {
        const Comp = styled.View`
          color: black;
          @media (prefers-color-scheme: dark) {
            color: white;
          }
          @media (prefers-color-scheme: light) {
            color: red;
          }
        `;
        const tree = TestRenderer.create(<Comp />);
        expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
          [
            {
              "color": "black",
            },
            {
              "color": "white",
            },
          ]
        `);
      } finally {
        getColorSchemeSpy.mockRestore();
      }
    });

    it('evaluates min-height / max-height', () => {
      // Mock height = 1334.
      const Comp = styled.View`
        color: red;
        @media (min-height: 1000px) {
          padding-top: 20px;
        }
        @media (max-height: 500px) {
          padding-top: 99px;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "paddingTop": 20,
          },
        ]
      `);
    });

    it('evaluates compound `and` queries', () => {
      // Width 750, height 1334 → matches min-width 500 AND orientation portrait.
      const Comp = styled.View`
        color: red;
        @media (min-width: 500px) and (orientation: portrait) {
          color: blue;
        }
        @media (min-width: 500px) and (orientation: landscape) {
          color: green;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('evaluates `,` OR-clause queries', () => {
      const Comp = styled.View`
        color: red;
        @media (max-width: 100px), (min-width: 500px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('merges user-provided style prop after conditionals', () => {
      const Comp = styled.View`
        color: red;
        @media (min-width: 500px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(<Comp style={{ opacity: 0.5 }} />);
      const view = tree.root.findByType(View);
      expect(view.props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
          {
            "opacity": 0.5,
          },
        ]
      `);
    });

    it('evaluates Level 4 range-syntax queries', () => {
      // Mock window: width 750, height 1334.
      const Comp = styled.View`
        color: red;
        @media (width >= 500px) {
          padding-top: 10px;
        }
        @media (width < 500px) {
          padding-top: 99px;
        }
        @media (500px <= width <= 1000px) {
          opacity: 0.8;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "paddingTop": 10,
          },
          {
            "opacity": 0.8,
          },
        ]
      `);
    });

    it('applies multiple matching media queries in source order', () => {
      const Comp = styled.View`
        color: red;
        @media (min-width: 400px) {
          color: green;
        }
        @media (min-width: 700px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "green",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });
  });

  describe('reactivity', () => {
    it('re-renders when Dimensions.change fires', () => {
      // Capture the listener at subscribe time;must spy BEFORE mount, since
      // useMediaEnv's useEffect wires it up during the initial commit.
      const addEventListenerSpy = jest.spyOn(Dimensions, 'addEventListener');
      try {
        const Comp = styled.View`
          color: red;
          @media (min-width: 1000px) {
            color: blue;
          }
        `;
        // Starts at 750px → min-width 1000 does not match.
        const tree = TestRenderer.create(<Comp />);
        expect(tree.root.findByType(View).props.style).toEqual({ color: 'red' });

        const listener = addEventListenerSpy.mock.calls.find(c => c[0] === 'change')?.[1];
        expect(listener).toBeDefined();

        TestRenderer.act(() => {
          listener!({
            window: { width: 1200, height: 800, scale: 2, fontScale: 1 },
            screen: { width: 1200, height: 800, scale: 2, fontScale: 1 },
          } as any);
        });

        expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
          [
            {
              "color": "red",
            },
            {
              "color": "blue",
            },
          ]
        `);
      } finally {
        addEventListenerSpy.mockRestore();
      }
    });

    it('re-renders when Appearance.colorScheme changes', () => {
      const getSpy = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
      const addSpy = jest.spyOn(Appearance, 'addChangeListener');
      try {
        const Comp = styled.View`
          color: black;
          @media (prefers-color-scheme: dark) {
            color: white;
          }
        `;
        const tree = TestRenderer.create(<Comp />);
        expect(tree.root.findByType(View).props.style).toEqual({ color: 'black' });

        const listener = addSpy.mock.calls[addSpy.mock.calls.length - 1]?.[0];
        expect(listener).toBeDefined();

        TestRenderer.act(() => {
          listener!({ colorScheme: 'dark' });
        });

        expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
          [
            {
              "color": "black",
            },
            {
              "color": "white",
            },
          ]
        `);
      } finally {
        getSpy.mockRestore();
        addSpy.mockRestore();
      }
    });
  });

  describe('@container conditionals', () => {
    it('matches named container ancestor from ContainerContext', () => {
      const Comp = styled.View`
        color: red;
        @container card (min-width: 300px) {
          color: blue;
        }
      `;

      const containerValue = {
        nearest: { name: 'card', width: 400, height: 200 },
        named: { card: { name: 'card', width: 400, height: 200 } },
      };

      const tree = TestRenderer.create(
        <NativeStyleContext.Provider
          value={{ container: containerValue, cascade: DEFAULT_CASCADE }}
        >
          <Comp />
        </NativeStyleContext.Provider>
      );
      const view = tree.root.findByType(View);
      expect(view.props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('silently drops container queries when no matching container is registered', () => {
      const Comp = styled.View`
        color: red;
        @container card (min-width: 300px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const view = tree.root.findByType(View);
      expect(view.props.style).toEqual({ color: 'red' });
    });

    it('rejects container queries when ancestor does not satisfy the condition', () => {
      // Container width 200 < min-width 300 → should NOT match.
      const Comp = styled.View`
        color: red;
        @container card (min-width: 300px) {
          color: blue;
        }
      `;
      const containerValue = {
        nearest: { name: 'card', width: 200, height: 200 },
        named: { card: { name: 'card', width: 200, height: 200 } },
      };
      const tree = TestRenderer.create(
        <NativeStyleContext.Provider
          value={{ container: containerValue, cascade: DEFAULT_CASCADE }}
        >
          <Comp />
        </NativeStyleContext.Provider>
      );
      expect(tree.root.findByType(View).props.style).toEqual({ color: 'red' });
    });

    it('evaluates container height queries', () => {
      const Comp = styled.View`
        @container panel (min-height: 200px) {
          opacity: 0.5;
        }
      `;
      const containerValue = {
        nearest: { name: 'panel', width: 400, height: 300 },
        named: { panel: { name: 'panel', width: 400, height: 300 } },
      };
      const tree = TestRenderer.create(
        <NativeStyleContext.Provider
          value={{ container: containerValue, cascade: DEFAULT_CASCADE }}
        >
          <Comp />
        </NativeStyleContext.Provider>
      );
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {},
          {
            "opacity": 0.5,
          },
        ]
      `);
    });

    it('routes queries to the container matching their name', () => {
      const Comp = styled.View`
        @container card (min-width: 100px) {
          color: red;
        }
        @container panel (min-width: 100px) {
          opacity: 0.5;
        }
        @container missing (min-width: 100px) {
          padding: 4px;
        }
      `;
      const containerValue = {
        nearest: { name: 'card', width: 400, height: 200 },
        named: {
          card: { name: 'card', width: 400, height: 200 },
          panel: { name: 'panel', width: 400, height: 200 },
        },
      };
      const tree = TestRenderer.create(
        <NativeStyleContext.Provider
          value={{ container: containerValue, cascade: DEFAULT_CASCADE }}
        >
          <Comp />
        </NativeStyleContext.Provider>
      );
      const styles = tree.root.findByType(View).props.style as any[];
      // card + panel match; missing has no registered container so its bucket drops.
      expect(styles).toMatchInlineSnapshot(`
        [
          {},
          {
            "color": "red",
          },
          {
            "opacity": 0.5,
          },
        ]
      `);
    });

    it('re-renders descendants when the container layout changes', () => {
      const Card = styled.View`
        padding: 8px;
        container-type: size;
        container-name: card;
      `;
      const Child = styled.View`
        color: red;
        @container card (min-width: 300px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Child />
        </Card>
      );
      const [cardNode, childNode] = tree.root.findAllByType(View);
      // No layout yet → min-width 300 doesn't match (container width defaults to 0).
      expect(childNode.props.style).toEqual({ color: 'red' });

      // Simulate initial layout at 200 (still below threshold).
      TestRenderer.act(() => {
        cardNode.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 100 } },
        });
      });
      expect(tree.root.findAllByType(View)[1].props.style).toEqual({ color: 'red' });

      // Simulate resize above threshold.
      TestRenderer.act(() => {
        tree.root.findAllByType(View)[0].props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 100 } },
        });
      });
      expect(tree.root.findAllByType(View)[1].props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('supports nested container scopes with different names', () => {
      const Outer = styled.View`
        padding: 4px;
        container-type: size;
        container-name: outer;
      `;
      const Inner = styled.View`
        padding: 2px;
        container-type: size;
        container-name: inner;
      `;
      const Leaf = styled.View`
        color: black;
        @container outer (min-width: 100px) {
          color: red;
        }
        @container inner (min-width: 100px) {
          opacity: 0.5;
        }
      `;

      const tree = TestRenderer.create(
        <Outer>
          <Inner>
            <Leaf />
          </Inner>
        </Outer>
      );

      const [outerNode, innerNode] = tree.root.findAllByType(View);
      TestRenderer.act(() => {
        outerNode.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 500, height: 500 } },
        });
      });
      TestRenderer.act(() => {
        innerNode.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 200 } },
        });
      });

      const leafStyle = tree.root.findAllByType(View)[2].props.style as any[];
      expect(leafStyle).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "red",
          },
          {
            "opacity": 0.5,
          },
        ]
      `);
    });

    it('mixes @container and @media in the same component', () => {
      const Comp = styled.View`
        color: red;
        @media (min-width: 500px) {
          padding-top: 10px;
        }
        @container card (min-width: 100px) {
          opacity: 0.5;
        }
      `;
      const containerValue = {
        nearest: { name: 'card', width: 400, height: 200 },
        named: { card: { name: 'card', width: 400, height: 200 } },
      };
      const tree = TestRenderer.create(
        <NativeStyleContext.Provider
          value={{ container: containerValue, cascade: DEFAULT_CASCADE }}
        >
          <Comp />
        </NativeStyleContext.Provider>
      );
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "paddingTop": 10,
          },
          {
            "opacity": 0.5,
          },
        ]
      `);
    });
  });

  describe('pseudo-state conditionals', () => {
    it('produces a function style that resolves pressed state from &:active', () => {
      const Comp = styled.View`
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
      const Comp = styled.View`
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
      const Comp = styled.View`
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

    it('merges user style function under pseudo state', () => {
      const Comp = styled.View<{ style?: any }>`
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
  });

  describe('attribute selectors', () => {
    it('applies styles when [aria-pressed="true"] matches a string prop', () => {
      const Toggle = styled.View<{ 'aria-pressed'?: 'true' | 'false' | boolean }>`
        background-color: white;
        &[aria-pressed='true'] {
          background-color: yellow;
        }
      `;
      const onTree = TestRenderer.create(<Toggle aria-pressed="true" />);
      expect(onTree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
          {
            "backgroundColor": "yellow",
          },
        ]
      `);

      const offTree = TestRenderer.create(<Toggle aria-pressed="false" />);
      expect(offTree.root.findByType(View).props.style).toEqual({ backgroundColor: 'white' });
    });

    it('coerces boolean props so [aria-pressed="true"] matches aria-pressed={true}', () => {
      const Toggle = styled.View<{ 'aria-pressed'?: 'true' | 'false' | boolean }>`
        background-color: white;
        &[aria-pressed='true'] {
          background-color: yellow;
        }
      `;
      const tree = TestRenderer.create(<Toggle aria-pressed={true} />);
      expect(tree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
          {
            "backgroundColor": "yellow",
          },
        ]
      `);
    });

    it('bare `&[attr]` matches when the prop is defined regardless of value', () => {
      const Comp = styled.View<{ 'aria-busy'?: boolean }>`
        color: black;
        &[aria-busy] {
          color: gray;
        }
      `;
      const onTree = TestRenderer.create(<Comp aria-busy />);
      expect(onTree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "gray",
          },
        ]
      `);

      // Also matches when explicitly false;presence not truthiness.
      const falseTree = TestRenderer.create(<Comp aria-busy={false} />);
      expect(falseTree.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "gray",
          },
        ]
      `);

      // Doesn't match when prop is omitted entirely.
      const offTree = TestRenderer.create(<Comp />);
      expect(offTree.root.findByType(View).props.style).toEqual({ color: 'black' });
    });

    it('compound `&[a][b=v]` requires BOTH attributes to match', () => {
      const Btn = styled.View<{
        'data-variant'?: 'ghost';
        'aria-pressed'?: 'true' | 'false';
      }>`
        background-color: transparent;
        &[data-variant='ghost'][aria-pressed='true'] {
          background-color: black;
        }
      `;

      // Both attrs match → compound bucket applies.
      const both = TestRenderer.create(<Btn data-variant="ghost" aria-pressed="true" />);
      expect(both.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "transparent",
          },
          {
            "backgroundColor": "black",
          },
        ]
      `);

      // Only one attr matches → bucket does NOT apply.
      const onlyVariant = TestRenderer.create(<Btn data-variant="ghost" />);
      expect(onlyVariant.root.findByType(View).props.style).toEqual({
        backgroundColor: 'transparent',
      });
      const onlyPressed = TestRenderer.create(<Btn aria-pressed="true" />);
      expect(onlyPressed.root.findByType(View).props.style).toEqual({
        backgroundColor: 'transparent',
      });
    });

    it('comma-grouped `&[a], &[b]` fans out into one bucket per selector', () => {
      const Btn = styled.View<{
        'data-tone'?: 'pass' | 'fail';
        'aria-pressed'?: 'true' | 'false';
      }>`
        color: black;
        &[data-tone='pass'],
        &[aria-pressed='true'] {
          color: white;
        }
      `;
      // `data-tone='pass'` alone matches the first bucket.
      const tone = TestRenderer.create(<Btn data-tone="pass" />);
      expect(tone.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "white",
          },
        ]
      `);
      // `aria-pressed='true'` alone matches the second bucket.
      const pressed = TestRenderer.create(<Btn aria-pressed="true" />);
      expect(pressed.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "white",
          },
        ]
      `);
      // Both match → both buckets fire (idempotent here, same value).
      const both = TestRenderer.create(<Btn data-tone="pass" aria-pressed="true" />);
      expect(both.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "white",
          },
          {
            "color": "white",
          },
        ]
      `);
    });

    it('attr + pseudo `&[attr]:active` fires only when both gates pass', () => {
      const Btn = styled.View<{
        'data-tone'?: 'fail';
      }>`
        background-color: white;
        &[data-tone='fail']:active {
          background-color: black;
        }
      `;
      // attr matches but no pseudo state → bucket does NOT fire.
      const idle = TestRenderer.create(<Btn data-tone="fail" />);
      const idleStyle = idle.root.findByType(View).props.style;
      // Pseudo-bearing buckets render via a state callback; idle = no
      // pressed state passed → callback returns the static array.
      const idleResolved = typeof idleStyle === 'function' ? idleStyle({}) : idleStyle;
      expect(idleResolved).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
        ]
      `);

      // attr matches AND pressed → bucket fires.
      const pressed = TestRenderer.create(<Btn data-tone="fail" />);
      const pressedStyle = pressed.root.findByType(View).props.style;
      const pressedResolved =
        typeof pressedStyle === 'function' ? pressedStyle({ pressed: true }) : pressedStyle;
      expect(pressedResolved).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
          {
            "backgroundColor": "black",
          },
        ]
      `);

      // pressed but attr doesn't match → bucket does NOT fire.
      const pressedNoAttr = TestRenderer.create(<Btn />);
      const pressedNoAttrStyle = pressedNoAttr.root.findByType(View).props.style;
      const pressedNoAttrResolved =
        typeof pressedNoAttrStyle === 'function'
          ? pressedNoAttrStyle({ pressed: true })
          : pressedNoAttrStyle;
      expect(pressedNoAttrResolved).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
        ]
      `);
    });

    it('mixed comma + compound (`&[a][b], &[c]`) parses both forms in one rule', () => {
      const Btn = styled.View<{
        'data-variant'?: 'ghost';
        'aria-pressed'?: 'true' | 'false';
        'data-tone'?: 'fail';
      }>`
        color: black;
        &[data-variant='ghost'][aria-pressed='true'],
        &[data-tone='fail'] {
          color: red;
        }
      `;
      // Compound branch matches.
      const compound = TestRenderer.create(<Btn data-variant="ghost" aria-pressed="true" />);
      expect(compound.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "red",
          },
        ]
      `);
      // Single-attr branch matches.
      const tone = TestRenderer.create(<Btn data-tone="fail" />);
      expect(tone.root.findByType(View).props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "red",
          },
        ]
      `);
      // Compound half-match → no bucket fires.
      const halfCompound = TestRenderer.create(<Btn data-variant="ghost" />);
      expect(halfCompound.root.findByType(View).props.style).toEqual({ color: 'black' });
    });

    // https://drafts.csswg.org/selectors-4/#attribute-selectors
    describe('CSS Selectors 4 §6.2 operators', () => {
      it('~= matches a whitespace-separated word', () => {
        const Btn = styled.View<{ 'data-tags'?: string }>`
          color: black;
          &[data-tags~='one'] {
            color: white;
          }
        `;
        const matches = TestRenderer.create(<Btn data-tags="one two three" />);
        expect(matches.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const noMatch = TestRenderer.create(<Btn data-tags="onesie two" />);
        expect(noMatch.root.findByType(View).props.style).toEqual({ color: 'black' });
      });

      it('|= matches exact or `expected-` prefix', () => {
        const Btn = styled.View<{ lang?: string }>`
          color: black;
          &[lang|='en'] {
            color: white;
          }
        `;
        const exact = TestRenderer.create(<Btn lang="en" />);
        expect(exact.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const prefix = TestRenderer.create(<Btn lang="en-US" />);
        expect(prefix.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const noMatch = TestRenderer.create(<Btn lang="encrypted" />);
        expect(noMatch.root.findByType(View).props.style).toEqual({ color: 'black' });
      });

      it('^= matches prefix', () => {
        const Btn = styled.View<{ href?: string }>`
          color: black;
          &[href^='https'] {
            color: white;
          }
        `;
        const matches = TestRenderer.create(<Btn href="https://example.com" />);
        expect(matches.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const noMatch = TestRenderer.create(<Btn href="ftp://example.com" />);
        expect(noMatch.root.findByType(View).props.style).toEqual({ color: 'black' });
      });

      it('$= matches suffix', () => {
        const Btn = styled.View<{ href?: string }>`
          color: black;
          &[href$='.pdf'] {
            color: white;
          }
        `;
        const matches = TestRenderer.create(<Btn href="report.pdf" />);
        expect(matches.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const noMatch = TestRenderer.create(<Btn href="report.txt" />);
        expect(noMatch.root.findByType(View).props.style).toEqual({ color: 'black' });
      });

      it(':not([attr]) fires when the attribute is absent', () => {
        const Btn = styled.View<{ 'data-loading'?: string }>`
          color: black;
          &:not([data-loading]) {
            color: white;
          }
        `;
        const absent = TestRenderer.create(<Btn />);
        expect(absent.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const present = TestRenderer.create(<Btn data-loading="true" />);
        expect(present.root.findByType(View).props.style).toEqual({ color: 'black' });
      });

      it(':not([attr="value"]) fires when the attribute does not equal the value', () => {
        const Btn = styled.View<{ 'data-state'?: string }>`
          color: black;
          &:not([data-state='loading']) {
            color: white;
          }
        `;
        const otherValue = TestRenderer.create(<Btn data-state="ready" />);
        expect(otherValue.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const matching = TestRenderer.create(<Btn data-state="loading" />);
        expect(matching.root.findByType(View).props.style).toEqual({ color: 'black' });
      });

      it('*= matches substring', () => {
        const Btn = styled.View<{ 'data-id'?: string }>`
          color: black;
          &[data-id*='xy'] {
            color: white;
          }
        `;
        const matches = TestRenderer.create(<Btn data-id="abcxyzdef" />);
        expect(matches.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const noMatch = TestRenderer.create(<Btn data-id="abcdef" />);
        expect(noMatch.root.findByType(View).props.style).toEqual({ color: 'black' });
      });
    });

    // CSS Selectors 4 §6.3 — `i` flag forces ASCII case-insensitive
    // matching;`s` flag (default) is sensitive.
    describe('CSS Selectors 4 §6.3 case-sensitivity flag', () => {
      it('[attr=val i] matches case-insensitively', () => {
        const Btn = styled.View<{ 'data-status'?: string }>`
          color: black;
          &[data-status='active' i] {
            color: white;
          }
        `;
        const matches = TestRenderer.create(<Btn data-status="ACTIVE" />);
        expect(matches.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
        const mixed = TestRenderer.create(<Btn data-status="Active" />);
        expect(mixed.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
      });

      it('[attr=val] without flag is case-sensitive by default', () => {
        const Btn = styled.View<{ 'data-status'?: string }>`
          color: black;
          &[data-status='active'] {
            color: white;
          }
        `;
        const noMatch = TestRenderer.create(<Btn data-status="ACTIVE" />);
        expect(noMatch.root.findByType(View).props.style).toEqual({ color: 'black' });
      });

      it('[attr=val s] is case-sensitive (explicit form)', () => {
        const Btn = styled.View<{ 'data-status'?: string }>`
          color: black;
          &[data-status='active' s] {
            color: white;
          }
        `;
        const noMatch = TestRenderer.create(<Btn data-status="ACTIVE" />);
        expect(noMatch.root.findByType(View).props.style).toEqual({ color: 'black' });
      });

      it('[attr^=val i] applies the operator under case-insensitive compare', () => {
        const Link = styled.View<{ href?: string }>`
          color: black;
          &[href^='HTTPS' i] {
            color: white;
          }
        `;
        const matches = TestRenderer.create(<Link href="https://example.com" />);
        expect(matches.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
      });
    });
  });

  describe('container registration', () => {
    it('attaches an onLayout handler when container-type is set', () => {
      const Card = styled.View`
        padding: 8px;
        container-type: size;
        container-name: card;
      `;
      const tree = TestRenderer.create(<Card />);
      const view = tree.root.findByType(View);
      expect(typeof view.props.onLayout).toBe('function');
    });

    it('publishes container size to descendants through ContainerContext', () => {
      const Card = styled.View`
        padding: 8px;
        container-type: size;
        container-name: card;
      `;
      const Child = styled.View`
        @container card (min-width: 300px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Child />
        </Card>
      );
      // Simulate layout measurement
      const card = tree.root.findAllByType(View)[0];
      TestRenderer.act(() => {
        card.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } } });
      });
      const child = tree.root.findAllByType(View)[1];
      // Child now picks up the container-matched style
      expect(child.props.style).toMatchInlineSnapshot(`
        [
          {},
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('auto-names containers with the styledComponentId when no container-name is set', () => {
      // CSS spec: cq-units resolve against the nearest ancestor with
      // container-type, name optional. Auto-naming uses the SC hash so
      // the runtime publisher always has a stable identity for the
      // named map even when CSS doesn't provide one.
      const Card = styled.View`
        container-type: size;
      `;
      const tree = TestRenderer.create(<Card />);
      const view = tree.root.findByType(View);
      expect(typeof view.props.onLayout).toBe('function');
    });

    it('anonymous @container query matches against nearest auto-named container', () => {
      // Spec: `@container (min-width: 400px)` (no name) matches the
      // nearest containment ancestor. Combined with auto-naming,
      // the user only declares `container-type: size` on the parent
      // and `@container (...)` queries on the child;no string
      // coordination needed.
      const Card = styled.View`
        container-type: size;
      `;
      const Child = styled.View`
        color: red;
        @container (min-width: 300px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Child />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      TestRenderer.act(() => {
        card.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } } });
      });
      const child = tree.root.findAllByType(View)[1];
      expect(child.props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('does not chain a user-supplied onLayout across re-renders', () => {
      // Regression: the published-container path used to mutate the cached
      // element-props object in place, so on each subsequent render the
      // composed onLayout wrapped the previously-composed one. After N
      // renders, the user's onLayout was being invoked N times per layout
      // event.
      const userOnLayout = jest.fn();
      const Card = styled.View<{ onLayout?: any }>`
        padding: 8px;
        container-type: size;
        container-name: card;
      `;
      const tree = TestRenderer.create(<Card onLayout={userOnLayout} />);
      // Re-render a few times with stable props; the render cache will hit.
      TestRenderer.act(() => {
        tree.update(<Card onLayout={userOnLayout} />);
        tree.update(<Card onLayout={userOnLayout} />);
        tree.update(<Card onLayout={userOnLayout} />);
      });

      const view = tree.root.findByType(View);
      TestRenderer.act(() => {
        view.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 50 } } });
      });
      expect(userOnLayout).toHaveBeenCalledTimes(1);
    });

    it('publishes the content-box width (subtracts padding + border)', () => {
      // RN's `onLayout.width` is the border-box width. CSS `%` and
      // `cq*` units on descendants resolve against the container's
      // content-box per spec. The publisher must subtract horizontal
      // padding + border so calc(% - px) and cqw stay pixel-exact.
      // Card outer width = 400; padding 8 each side + 1px border each
      // side = 18 horizontal inset → content width = 382. Query at
      // min-width: 390 should NOT match; min-width: 380 should match.
      const Card = styled.View`
        padding: 8px;
        border: 1px solid black;
        container-type: size;
        container-name: card;
      `;
      const ChildAbove = styled.View`
        color: red;
        @container card (min-width: 390px) {
          color: blue;
        }
      `;
      const ChildBelow = styled.View`
        color: red;
        @container card (min-width: 380px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <ChildAbove />
          <ChildBelow />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      TestRenderer.act(() => {
        card.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } } });
      });
      // 382 < 390 → no match
      expect(tree.root.findAllByType(View)[1].props.style).toEqual({ color: 'red' });
      // 382 ≥ 380 → match
      expect(tree.root.findAllByType(View)[2].props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('${Component} resolves to the bare componentId in @container <name> position', () => {
      // Component-selector interpolation is dual-context: in regular
      // selector position it's `.sc-XYZ`; in `@container <name>` it's
      // the bare ident `sc-XYZ`. Auto-named containers register under
      // their styledComponentId, so cross-component queries via
      // `@container ${Card} (...)` match the runtime registration.
      const Card = styled.View`
        container-type: size;
      `;
      const Child = styled.View`
        color: red;
        @container ${Card} (min-width: 300px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Child />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      TestRenderer.act(() => {
        card.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } } });
      });
      const child = tree.root.findAllByType(View)[1];
      expect(child.props.style).toMatchInlineSnapshot(`
        [
          {
            "color": "red",
          },
          {
            "color": "blue",
          },
        ]
      `);
    });
  });

  describe('composite scenarios', () => {
    it('@media + attr-chain + pseudo (`@media { &[attr]:active }`) gates on all three', () => {
      // Default RN-jest viewport is 750×1334, so `(min-width: 500px)`
      // matches. We test the engine path that gates on all three:
      // media condition + attr chain + pseudo state.
      const Card = styled.View<{ 'data-variant'?: 'hot' }>`
        background-color: white;
        @media (min-width: 500px) {
          &[data-variant='hot']:active {
            background-color: black;
          }
        }
      `;
      const tree = TestRenderer.create(<Card data-variant="hot" />);
      const view = tree.root.findByType(View);

      // idle (not pressed) → bucket does NOT fire.
      const idleStyle = view.props.style;
      const idleResolved = typeof idleStyle === 'function' ? idleStyle({}) : idleStyle;
      expect(idleResolved).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
        ]
      `);

      // pressed AND attr matches AND viewport matches → bucket fires.
      const pressedResolved =
        typeof idleStyle === 'function' ? idleStyle({ pressed: true }) : idleStyle;
      expect(pressedResolved).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
          {
            "backgroundColor": "black",
          },
        ]
      `);

      // pressed but attr DOESN'T match → bucket does NOT fire.
      const noAttr = TestRenderer.create(<Card />);
      const noAttrStyle = noAttr.root.findByType(View).props.style;
      const noAttrResolved =
        typeof noAttrStyle === 'function' ? noAttrStyle({ pressed: true }) : noAttrStyle;
      expect(noAttrResolved).toMatchInlineSnapshot(`
        [
          {
            "backgroundColor": "white",
          },
        ]
      `);
    });

    it('base + media + pseudo in one component', () => {
      const Comp = styled.View`
        color: black;
        @media (min-width: 500px) {
          padding-top: 20px;
        }
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
            "color": "black",
          },
          {
            "paddingTop": 20,
          },
        ]
      `);
      expect(pressable.props.style({ pressed: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "paddingTop": 20,
          },
          {
            "opacity": 0.5,
          },
        ]
      `);
    });

    it('resolves multiple pseudo-states active simultaneously', () => {
      const Comp = styled.View`
        color: black;
        &:hover {
          color: blue;
        }
        &:focus {
          border-color: red;
        }
        &:active {
          opacity: 0.5;
        }
        &:disabled {
          opacity: 0.3;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const style = tree.root.findByType(View).props.style as (state: any) => any[];

      expect(style({ hovered: true, focused: true, pressed: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "color": "blue",
          },
          {
            "borderColor": "red",
          },
          {
            "opacity": 0.5,
          },
        ]
      `);

      expect(style({ disabled: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "opacity": 0.3,
          },
        ]
      `);
      expect(style({})).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
        ]
      `);
    });

    it('pseudo inside @media gates on BOTH conditions', () => {
      // Width 750 → min-width 500 matches. Nested pseudo bucket activates only
      // when both the media query AND the hover state hold.
      const Comp = styled.View`
        color: black;
        @media (min-width: 500px) {
          padding-top: 8px;
          &:hover {
            color: blue;
          }
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const style = tree.root.findByType(View).props.style as (state: any) => any[];
      expect(typeof style).toBe('function');

      // media matches, hover false → base + media padding only.
      expect(style({ hovered: false })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "paddingTop": 8,
          },
        ]
      `);
      // media matches, hover true → base + media padding + composite pseudo.
      expect(style({ hovered: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "paddingTop": 8,
          },
          {
            "color": "blue",
          },
        ]
      `);
    });

    it('pseudo inside @media does NOT activate when media condition fails', () => {
      // min-width 2000 → doesn't match, so nested pseudo can't activate either.
      const Comp = styled.View`
        color: black;
        @media (min-width: 2000px) {
          &:hover {
            color: blue;
          }
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const style = tree.root.findByType(View).props.style as (state: any) => any[];

      expect(style({ hovered: false })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
        ]
      `);
      expect(style({ hovered: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
        ]
      `);
    });

    it('pseudo inside @container gates on container + state', () => {
      const Comp = styled.View`
        color: black;
        @container card (min-width: 100px) {
          padding-top: 4px;
          &:active {
            opacity: 0.5;
          }
        }
      `;
      const containerValue = {
        nearest: { name: 'card', width: 400, height: 200 },
        named: { card: { name: 'card', width: 400, height: 200 } },
      };
      const tree = TestRenderer.create(
        <NativeStyleContext.Provider
          value={{ container: containerValue, cascade: DEFAULT_CASCADE }}
        >
          <Comp />
        </NativeStyleContext.Provider>
      );
      const style = tree.root.findByType(View).props.style as (state: any) => any[];

      // Container matches + pressed false → padding only.
      expect(style({ pressed: false })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "paddingTop": 4,
          },
        ]
      `);
      // Container matches + pressed true → padding + opacity.
      expect(style({ pressed: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
          {
            "paddingTop": 4,
          },
          {
            "opacity": 0.5,
          },
        ]
      `);
    });

    it('pseudo inside @container without a matching container stays inactive', () => {
      // No ContainerContext;container bucket can't match, composite pseudo can't fire.
      const Comp = styled.View`
        color: black;
        @container card (min-width: 100px) {
          &:active {
            opacity: 0.5;
          }
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      const style = tree.root.findByType(View).props.style as (state: any) => any[];
      expect(style({ pressed: true })).toMatchInlineSnapshot(`
        [
          {
            "color": "black",
          },
        ]
      `);
    });
  });

  // https://drafts.csswg.org/selectors-4/#combinators
  // Descendant + child combinators against an interpolated
  // styled-component reference. Each test gives every styled-component
  // an explicit displayName so the generated styledComponentId differs
  // (in real apps the babel plugin distinguishes via file position;
  // tests have no babel pass).
  describe('combinator selectors spec compliance (CSS Selectors 4 — combinators)', () => {
    it('descendant combinator: `${Foo} &` matches when Foo is an ancestor', () => {
      const Foo = styled.View.withConfig({ displayName: 'CombDescFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'CombDescBar' })`
        color: green;
        ${Foo} & {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Foo>
          <Bar />
        </Foo>
      );
      const inner = tree.root.findAllByType(View)[1];
      expect(inner.props.style).toEqual([{ color: 'green' }, { color: 'red' }]);
    });

    it('descendant combinator does not match when Foo is not an ancestor', () => {
      const Foo = styled.View.withConfig({ displayName: 'CombDescOutFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'CombDescOutBar' })`
        color: green;
        ${Foo} & {
          color: red;
        }
      `;
      const tree = TestRenderer.create(<Bar />);
      const inner = tree.root.findByType(View);
      expect(inner.props.style).toEqual({ color: 'green' });
    });

    it('child combinator: `${Foo} > &` matches the immediate-parent case', () => {
      const Foo = styled.View.withConfig({ displayName: 'CombChildFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'CombChildBar' })`
        color: green;
        ${Foo} > & {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Foo>
          <Bar />
        </Foo>
      );
      const inner = tree.root.findAllByType(View)[1];
      expect(inner.props.style).toEqual([{ color: 'green' }, { color: 'red' }]);
    });

    it('child combinator does not match through an intermediate styled component', () => {
      const Foo = styled.View.withConfig({ displayName: 'CombChildOutFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'CombChildOutBar' })`
        color: green;
        ${Foo} > & {
          color: red;
        }
      `;
      const Mid = styled.View.withConfig({ displayName: 'CombChildOutMid' })`
        padding: 1px;
      `;
      const tree = TestRenderer.create(
        <Foo>
          <Mid>
            <Bar />
          </Mid>
        </Foo>
      );
      const inner = tree.root.findAllByType(View)[2];
      expect(inner.props.style).toEqual({ color: 'green' });
    });

    it('descendant combinator matches through styled-component intermediaries', () => {
      const Foo = styled.View.withConfig({ displayName: 'CombDescThruFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'CombDescThruBar' })`
        color: green;
        ${Foo} & {
          color: red;
        }
      `;
      const Mid = styled.View.withConfig({ displayName: 'CombDescThruMid' })`
        padding: 1px;
      `;
      const tree = TestRenderer.create(
        <Foo>
          <Mid>
            <Bar />
          </Mid>
        </Foo>
      );
      const inner = tree.root.findAllByType(View)[2];
      expect(inner.props.style).toEqual([{ color: 'green' }, { color: 'red' }]);
    });

    it('both combinators match through a plain host intermediary (transparent)', () => {
      // A plain View / Text between Foo and Bar does not republish the
      // ParentContext, so React Context propagation hands Foo's parent
      // value through unchanged. Bar still sees Foo as the immediate
      // styled parent; both descendant and child match.
      const Foo = styled.View.withConfig({ displayName: 'CombPlainFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'CombPlainBar' })`
        color: green;
        ${Foo} & {
          color: red;
        }
        ${Foo} > & {
          padding: 7px;
        }
      `;
      const tree = TestRenderer.create(
        <Foo>
          <View>
            <Bar />
          </View>
        </Foo>
      );
      const inner = tree.root.findAllByType(View)[2];
      expect(inner.props.style).toEqual([{ color: 'green' }, { color: 'red' }, { padding: 7 }]);
    });
  });

  // https://drafts.csswg.org/selectors-4/#combinators
  describe('sibling combinators spec compliance (CSS Selectors 4 — combinators)', () => {
    it('adjacent sibling `${Foo} + &` fires when the previous sibling is Foo', () => {
      const Parent = styled.View.withConfig({ displayName: 'AdjParent' })`
        flex: 1;
      `;
      const Foo = styled.View.withConfig({ displayName: 'AdjFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'AdjBar' })`
        color: black;
        ${Foo} + & {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Foo />
          <Bar />
        </Parent>
      );
      const allViews = tree.root.findAllByType(View);
      // Parent, Foo, Bar
      expect(allViews[2].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
    });

    it('adjacent sibling does NOT fire when the previous sibling is not Foo', () => {
      const Parent = styled.View.withConfig({ displayName: 'AdjNoParent' })`
        flex: 1;
      `;
      const Foo = styled.View.withConfig({ displayName: 'AdjNoFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'AdjNoBar' })`
        color: black;
        ${Foo} + & {
          color: red;
        }
      `;
      const Other = styled.View.withConfig({ displayName: 'AdjNoOther' })`
        background: green;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Other />
          <Bar />
        </Parent>
      );
      const allViews = tree.root.findAllByType(View);
      expect(allViews[2].props.style).toEqual({ color: 'black' });
    });

    it('general sibling `${Foo} ~ &` fires when ANY prior sibling is Foo', () => {
      const Parent = styled.View.withConfig({ displayName: 'GenParent' })`
        flex: 1;
      `;
      const Foo = styled.View.withConfig({ displayName: 'GenFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'GenBar' })`
        color: black;
        ${Foo} ~ & {
          color: red;
        }
      `;
      const Other = styled.View.withConfig({ displayName: 'GenOther' })`
        background: green;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Foo />
          <Other />
          <Bar />
        </Parent>
      );
      const allViews = tree.root.findAllByType(View);
      expect(allViews[3].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
    });

    it('general sibling does not fire when no prior sibling matches', () => {
      const Parent = styled.View.withConfig({ displayName: 'GenNoParent' })`
        flex: 1;
      `;
      const Foo = styled.View.withConfig({ displayName: 'GenNoFoo' })`
        background: blue;
      `;
      const Bar = styled.View.withConfig({ displayName: 'GenNoBar' })`
        color: black;
        ${Foo} ~ & {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Bar />
          <Foo />
        </Parent>
      );
      const allViews = tree.root.findAllByType(View);
      expect(allViews[1].props.style).toEqual({ color: 'black' });
    });
  });

  // https://drafts.csswg.org/selectors-4/#nth-child-pseudo
  describe(':nth-child family spec compliance (CSS Selectors 4 — :nth-child / :nth-of-type)', () => {
    it(':first-child matches index 0', () => {
      const Parent = styled.View.withConfig({ displayName: 'FirstParent' })`
        flex: 1;
      `;
      const Item = styled.View.withConfig({ displayName: 'FirstItem' })`
        color: black;
        &:first-child {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Item />
          <Item />
          <Item />
        </Parent>
      );
      const items = tree.root.findAllByType(View);
      expect(items[1].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
      expect(items[2].props.style).toEqual({ color: 'black' });
      expect(items[3].props.style).toEqual({ color: 'black' });
    });

    it(':last-child matches the final index', () => {
      const Parent = styled.View.withConfig({ displayName: 'LastParent' })`
        flex: 1;
      `;
      const Item = styled.View.withConfig({ displayName: 'LastItem' })`
        color: black;
        &:last-child {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Item />
          <Item />
          <Item />
        </Parent>
      );
      const items = tree.root.findAllByType(View);
      expect(items[1].props.style).toEqual({ color: 'black' });
      expect(items[2].props.style).toEqual({ color: 'black' });
      expect(items[3].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
    });

    it(':only-child matches when totalSiblings === 1', () => {
      const Parent = styled.View.withConfig({ displayName: 'OnlyParent' })`
        flex: 1;
      `;
      const Item = styled.View.withConfig({ displayName: 'OnlyItem' })`
        color: black;
        &:only-child {
          color: red;
        }
      `;
      const solo = TestRenderer.create(
        <Parent>
          <Item />
        </Parent>
      );
      const pair = TestRenderer.create(
        <Parent>
          <Item />
          <Item />
        </Parent>
      );
      expect(solo.root.findAllByType(View)[1].props.style).toEqual([
        { color: 'black' },
        { color: 'red' },
      ]);
      const pairItems = pair.root.findAllByType(View);
      expect(pairItems[1].props.style).toEqual({ color: 'black' });
      expect(pairItems[2].props.style).toEqual({ color: 'black' });
    });

    it(':nth-child(2) matches the second child', () => {
      const Parent = styled.View.withConfig({ displayName: 'NthLitParent' })`
        flex: 1;
      `;
      const Item = styled.View.withConfig({ displayName: 'NthLitItem' })`
        color: black;
        &:nth-child(2) {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Item />
          <Item />
          <Item />
        </Parent>
      );
      const items = tree.root.findAllByType(View);
      expect(items[1].props.style).toEqual({ color: 'black' });
      expect(items[2].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
      expect(items[3].props.style).toEqual({ color: 'black' });
    });

    it(':nth-child(odd) matches positions 1, 3, 5 (1-based)', () => {
      const Parent = styled.View.withConfig({ displayName: 'OddParent' })`
        flex: 1;
      `;
      const Item = styled.View.withConfig({ displayName: 'OddItem' })`
        color: black;
        &:nth-child(odd) {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Item />
          <Item />
          <Item />
          <Item />
        </Parent>
      );
      const items = tree.root.findAllByType(View);
      const matched = [{ color: 'black' }, { color: 'red' }];
      expect(items[1].props.style).toEqual(matched); // 1
      expect(items[2].props.style).toEqual({ color: 'black' }); // 2
      expect(items[3].props.style).toEqual(matched); // 3
      expect(items[4].props.style).toEqual({ color: 'black' }); // 4
    });

    it(':nth-child(2n+1) matches the odd positions via formula', () => {
      const Parent = styled.View.withConfig({ displayName: 'FormulaParent' })`
        flex: 1;
      `;
      const Item = styled.View.withConfig({ displayName: 'FormulaItem' })`
        color: black;
        &:nth-child(2n + 1) {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Item />
          <Item />
          <Item />
        </Parent>
      );
      const items = tree.root.findAllByType(View);
      const matched = [{ color: 'black' }, { color: 'red' }];
      expect(items[1].props.style).toEqual(matched);
      expect(items[2].props.style).toEqual({ color: 'black' });
      expect(items[3].props.style).toEqual(matched);
    });

    it(':nth-last-child(1) matches the last child', () => {
      const Parent = styled.View.withConfig({ displayName: 'LastNthParent' })`
        flex: 1;
      `;
      const Item = styled.View.withConfig({ displayName: 'LastNthItem' })`
        color: black;
        &:nth-last-child(1) {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Item />
          <Item />
          <Item />
        </Parent>
      );
      const items = tree.root.findAllByType(View);
      expect(items[1].props.style).toEqual({ color: 'black' });
      expect(items[2].props.style).toEqual({ color: 'black' });
      expect(items[3].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
    });

    it(':nth-of-type(2) indexes among same-target siblings only', () => {
      const Parent = styled.View.withConfig({ displayName: 'OfTypeParent' })`
        flex: 1;
      `;
      const Box = styled.View.withConfig({ displayName: 'OfTypeBox' })`
        color: black;
        &:nth-of-type(2) {
          color: red;
        }
      `;
      const Label = styled.Text.withConfig({ displayName: 'OfTypeLabel' })`
        color: black;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Box />
          <Label>L</Label>
          <Box />
        </Parent>
      );
      // Layout: Parent (View), Box1 (View), Label (Text), Box2 (View).
      const allViews = tree.root.findAllByType(View);
      expect(allViews[1].props.style).toEqual({ color: 'black' }); // 1st Box
      expect(allViews[2].props.style).toEqual([{ color: 'black' }, { color: 'red' }]); // 2nd Box
    });

    // CSS Selectors 4 — :nth-of-type: "represents an element that has
    // an+b−1 siblings with the same expanded element name before it."
    // Two different `styled.View` factories share the React Native
    // target `'View'` and thus the SAME type for :nth-of-type purposes
    // (the type is the host element name, not the styled-component
    // identity). Locks the behavior so a future refactor doesn't
    // silently make distinct styled wrappers count as different types.
    it(':nth-of-type treats two different styled.View factories as the same type', () => {
      const Parent = styled.View.withConfig({ displayName: 'NthOfTypeIdentityParent' })`
        flex: 1;
      `;
      const Alpha = styled.View.withConfig({ displayName: 'NthOfTypeIdentityAlpha' })`
        color: black;
        &:nth-of-type(2) {
          color: red;
        }
      `;
      const Beta = styled.View.withConfig({ displayName: 'NthOfTypeIdentityBeta' })`
        color: black;
        &:nth-of-type(2) {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Alpha />
          <Beta />
        </Parent>
      );
      const allViews = tree.root.findAllByType(View);
      // Parent, Alpha, Beta — Beta is the 2nd View-typed sibling so
      // :nth-of-type(2) fires on it even though it's a DIFFERENT
      // styled-component than Alpha.
      expect(allViews[1].props.style).toEqual({ color: 'black' });
      expect(allViews[2].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
    });

    it(':only-of-type matches when there is only one same-target sibling', () => {
      const Parent = styled.View.withConfig({ displayName: 'OnlyOfTypeParent' })`
        flex: 1;
      `;
      const Box = styled.View.withConfig({ displayName: 'OnlyOfTypeBox' })`
        color: black;
        &:only-of-type {
          color: red;
        }
      `;
      const Label = styled.Text.withConfig({ displayName: 'OnlyOfTypeLabel' })`
        color: black;
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Box />
          <Label>L</Label>
        </Parent>
      );
      const allViews = tree.root.findAllByType(View);
      expect(allViews[1].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
    });

    // Regression: `:nth-child(N):pseudo` is a structural AND-gate on top
    // of the state callback. Before pseudoStylesForState learned the
    // nthChild bucket, the compound silently dropped.
    it(':nth-child(N) compounds with a pseudo state', () => {
      const Parent = styled.View.withConfig({ displayName: 'NthHoverParent' })``;
      const Child = styled.View.withConfig({ displayName: 'NthHoverChild' })`
        color: black;
        &:nth-child(2):hover {
          color: green;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child />
          <Child />
          <Child />
        </Parent>
      );
      const children = tree.root.findAllByType(View).slice(1);
      // First child: position 1, hovered → no match.
      expect(children[0].props.style({ hovered: true })).toEqual([{ color: 'black' }]);
      // Second child: position 2, hovered → match.
      expect(children[1].props.style({ hovered: true })).toEqual([
        { color: 'black' },
        { color: 'green' },
      ]);
      // Second child: position 2, not hovered → no match.
      expect(children[1].props.style({ hovered: false })).toEqual([{ color: 'black' }]);
    });

    // Regression: cascade-publishing parent (font-size / line-height /
    // direction) wraps its host in a NativeStyleContext.Provider before
    // the ParentContext.Provider. The per-child sibling indexing must
    // attach to the user's JSX children, not the cascade-wrap's only
    // child. Same constraint holds for container-type and 3D isolation.
    it(':nth-child fires under a cascade-publishing parent', () => {
      const Parent = styled.View.withConfig({ displayName: 'CascadeNthParent' })`
        font-size: 18px;
      `;
      const Child = styled.View.withConfig({ displayName: 'CascadeNthChild' })`
        color: black;
        &:nth-child(2) {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <Child />
          <Child />
          <Child />
        </Parent>
      );
      const childViews = tree.root.findAllByType(View).slice(1);
      expect(childViews[0].props.style).toEqual({ color: 'black' });
      expect(childViews[1].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
      expect(childViews[2].props.style).toEqual({ color: 'black' });
    });

    it('+ sibling combinator fires under a cascade-publishing parent', () => {
      const Parent = styled.View.withConfig({ displayName: 'CascadeSibParent' })`
        line-height: 24px;
      `;
      const First = styled.View.withConfig({ displayName: 'CascadeSibFirst' })``;
      const Next = styled.View.withConfig({ displayName: 'CascadeSibNext' })`
        color: black;
        ${First} + & {
          color: red;
        }
      `;
      const tree = TestRenderer.create(
        <Parent>
          <First />
          <Next />
          <Next />
        </Parent>
      );
      const allViews = tree.root.findAllByType(View);
      const nextViews = allViews.slice(2);
      expect(nextViews[0].props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
      expect(nextViews[1].props.style).toEqual({ color: 'black' });
    });
  });

  // https://drafts.csswg.org/selectors-4/#has-pseudo
  describe(':has spec compliance (CSS Selectors 4 — :has)', () => {
    it(':has(${Component}) fires when the component is among descendants', () => {
      const Icon = styled.View.withConfig({ displayName: 'HasIcon1' })`
        background: blue;
      `;
      const Card = styled.View.withConfig({ displayName: 'HasCard1' })`
        background: white;
        &:has(${Icon}) {
          background: red;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Icon />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      expect(card.props.style).toEqual([{ backgroundColor: 'white' }, { backgroundColor: 'red' }]);
    });

    it(':has(${Component}) does not fire when the component is absent', () => {
      const Icon = styled.View.withConfig({ displayName: 'HasIcon2' })`
        background: blue;
      `;
      const Other = styled.View.withConfig({ displayName: 'HasOther2' })`
        background: green;
      `;
      const Card = styled.View.withConfig({ displayName: 'HasCard2' })`
        background: white;
        &:has(${Icon}) {
          background: red;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Other />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      expect(card.props.style).toEqual({ backgroundColor: 'white' });
    });

    it(':has(${Component}) walks recursively into grandchildren', () => {
      const Icon = styled.View.withConfig({ displayName: 'HasIcon3' })`
        background: blue;
      `;
      const Inner = styled.View.withConfig({ displayName: 'HasInner3' })`
        padding: 1px;
      `;
      const Card = styled.View.withConfig({ displayName: 'HasCard3' })`
        background: white;
        &:has(${Icon}) {
          background: red;
        }
      `;
      const tree = TestRenderer.create(
        <Card>
          <Inner>
            <Icon />
          </Inner>
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      expect(card.props.style).toEqual([{ backgroundColor: 'white' }, { backgroundColor: 'red' }]);
    });

    it(':has([attr]) fires when any descendant carries the prop', () => {
      const Card = styled.View.withConfig({ displayName: 'HasAttrCard1' })`
        background: white;
        &:has([data-state='active']) {
          background: red;
        }
      `;
      const Item = styled.View.withConfig({ displayName: 'HasAttrItem1' })`
        background: gray;
      `;
      const tree = TestRenderer.create(
        <Card>
          <Item data-state="active" />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      expect(card.props.style).toEqual([{ backgroundColor: 'white' }, { backgroundColor: 'red' }]);
    });

    it(':has([attr]) does not fire on a non-matching value', () => {
      const Card = styled.View.withConfig({ displayName: 'HasAttrCard2' })`
        background: white;
        &:has([data-state='active']) {
          background: red;
        }
      `;
      const Item = styled.View.withConfig({ displayName: 'HasAttrItem2' })`
        background: gray;
      `;
      const tree = TestRenderer.create(
        <Card>
          <Item data-state="idle" />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      expect(card.props.style).toEqual({ backgroundColor: 'white' });
    });

    // Spec §6.2: `[attr^=val]`, etc. inside :has() must dispatch
    // the same operator-aware matcher as a top-level attribute
    // selector. Regression lock — earlier code treated every inner
    // attribute as an exact-equals.
    it(':has([attr^=val]) fires on a prefix-matching descendant prop', () => {
      const Card = styled.View.withConfig({ displayName: 'HasOpAttrCard1' })`
        background: white;
        &:has([href^='https']) {
          background: red;
        }
      `;
      const Link = styled.View.withConfig({ displayName: 'HasOpAttrLink1' })`
        background: gray;
      `;
      const tree = TestRenderer.create(
        <Card>
          <Link href="https://example.com" />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      expect(card.props.style).toEqual([{ backgroundColor: 'white' }, { backgroundColor: 'red' }]);
    });

    it(':has([attr^=val]) does not fire when the prefix does not match', () => {
      const Card = styled.View.withConfig({ displayName: 'HasOpAttrCard2' })`
        background: white;
        &:has([href^='https']) {
          background: red;
        }
      `;
      const Link = styled.View.withConfig({ displayName: 'HasOpAttrLink2' })`
        background: gray;
      `;
      const tree = TestRenderer.create(
        <Card>
          <Link href="mailto:hi@example.com" />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      expect(card.props.style).toEqual({ backgroundColor: 'white' });
    });

    it(':has([attr]) presence form fires on any value', () => {
      const Card = styled.View.withConfig({ displayName: 'HasPresenceCard' })`
        background: white;
        &:has([disabled]) {
          background: red;
        }
      `;
      const Item = styled.View.withConfig({ displayName: 'HasPresenceItem' })`
        background: gray;
      `;
      const tree = TestRenderer.create(
        <Card>
          <Item disabled />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      expect(card.props.style).toEqual([{ backgroundColor: 'white' }, { backgroundColor: 'red' }]);
    });

    // Documented limitation: the `:has(<simple>)` walk reads
    // `props.children` synchronously at the host's render time. When
    // the matching descendant is produced INSIDE a wrapper component's
    // own render (e.g. returned from `useMemo` or any non-children
    // computed JSX), the wrapper's `props.children` doesn't carry the
    // descendant — only the wrapper element itself appears in the
    // host's children list. The recursive walk reads each child's
    // `props.children`, so it never reaches into the wrapper's render
    // output and the match silently fails. Match works again the
    // moment the descendant is passed through `props.children`.
    it.skip(':has does not see descendants produced inside a wrapper render (useMemo)', () => {
      const Icon = styled.View.withConfig({ displayName: 'HasMemoIcon' })`
        background: blue;
      `;
      const Card = styled.View.withConfig({ displayName: 'HasMemoCard' })`
        background: white;
        &:has(${Icon}) {
          background: red;
        }
      `;
      const MemoWrapper: React.FC = () => {
        const inner = React.useMemo(() => <Icon />, []);
        return inner;
      };
      const tree = TestRenderer.create(
        <Card>
          <MemoWrapper />
        </Card>
      );
      const card = tree.root.findAllByType(View)[0];
      // Expected per spec: :has(Icon) matches because Icon is in the
      // rendered subtree. Actual (current polyfill): walk doesn't
      // reach Icon because it lives inside MemoWrapper's render
      // output, not its `props.children` — match fails. Skipped
      // until React Children traversal can introspect rendered output.
      expect(card.props.style).toEqual([{ backgroundColor: 'white' }, { backgroundColor: 'red' }]);
    });
  });

  describe('&:not() spec compliance (CSS Selectors 4 §4.3)', () => {
    // "The negation pseudo-class, :not(), is a functional pseudo-class
    // taking a selector list as an argument. It represents an element
    // that is not represented by its argument."
    it('&:not(:hover) inverts the pseudo-state', () => {
      const Btn = styled.View`
        color: black;
        &:not(:hover) {
          color: red;
        }
      `;
      const tree = TestRenderer.create(<Btn />);
      const style = tree.root.findByType(View).props.style;
      expect(typeof style).toBe('function');
      // Not hovered → :not(:hover) fires.
      expect(style({ hovered: false })).toEqual([{ color: 'black' }, { color: 'red' }]);
      // Hovered → :not(:hover) does NOT fire.
      expect(style({ hovered: true })).toEqual([{ color: 'black' }]);
    });

    // Same §4.3 rule — inverting :focus.
    it('&:not(:focus) inverts the focus pseudo-state', () => {
      const Btn = styled.View`
        color: black;
        &:not(:focus) {
          color: red;
        }
      `;
      const tree = TestRenderer.create(<Btn />);
      const style = tree.root.findByType(View).props.style;
      expect(typeof style).toBe('function');
      expect(style({ focused: false })).toEqual([{ color: 'black' }, { color: 'red' }]);
      expect(style({ focused: true })).toEqual([{ color: 'black' }]);
    });

    // §4.3 negation applied to an attribute presence — the element is
    // represented by :not([attr]) when the attribute is absent.
    it('&:not([data-active]) inverts attribute presence', () => {
      const Btn = styled.View<{ 'data-active'?: boolean }>`
        color: black;
        &:not([data-active]) {
          color: red;
        }
      `;
      // Attribute absent → :not([data-active]) fires.
      const absent = TestRenderer.create(<Btn />);
      expect(absent.root.findByType(View).props.style).toEqual([
        { color: 'black' },
        { color: 'red' },
      ]);
      // Attribute present → :not([data-active]) does NOT fire.
      const present = TestRenderer.create(<Btn data-active />);
      expect(present.root.findByType(View).props.style).toEqual({ color: 'black' });
    });

    // §4.3 negation applied to an attribute value selector.
    it("&:not([data-status='ok']) inverts attribute-value match", () => {
      const Btn = styled.View<{ 'data-status'?: string }>`
        color: black;
        &:not([data-status='ok']) {
          color: red;
        }
      `;
      // Value differs → :not fires.
      const bad = TestRenderer.create(<Btn data-status="bad" />);
      expect(bad.root.findByType(View).props.style).toEqual([{ color: 'black' }, { color: 'red' }]);
      // Value matches → :not does NOT fire.
      const ok = TestRenderer.create(<Btn data-status="ok" />);
      expect(ok.root.findByType(View).props.style).toEqual({ color: 'black' });
    });

    // §4.3 composed with a trailing pseudo-state — the bucket should
    // fire only when the element is NOT represented by the inner
    // selector AND the trailing pseudo-state holds.
    it('&:not([data-active]):hover fires only when NOT active AND hovered', () => {
      const Btn = styled.View<{ 'data-active'?: boolean }>`
        color: black;
        &:not([data-active]):hover {
          color: red;
        }
      `;
      const noAttr = TestRenderer.create(<Btn />);
      const noAttrStyle = noAttr.root.findByType(View).props.style;
      const withAttr = TestRenderer.create(<Btn data-active />);
      const withAttrStyle = withAttr.root.findByType(View).props.style;
      expect(typeof noAttrStyle).toBe('function');
      expect(typeof withAttrStyle).toBe('function');
      // 1. NOT active + hovered → fires.
      expect(noAttrStyle({ hovered: true })).toEqual([{ color: 'black' }, { color: 'red' }]);
      // 2. NOT active + not hovered → does not fire.
      expect(noAttrStyle({ hovered: false })).toEqual([{ color: 'black' }]);
      // 3. active + hovered → does not fire (attr negation fails).
      expect(withAttrStyle({ hovered: true })).toEqual([{ color: 'black' }]);
      // 4. active + not hovered → does not fire.
      expect(withAttrStyle({ hovered: false })).toEqual([{ color: 'black' }]);
    });

    // §4.3: "However, unlike other pseudo-classes, the negation
    // pseudo-class is not allowed to be nested" — and within our
    // polyfill the inner is restricted to simple selectors. A class
    // selector inside :not() is not supported on native; the rule
    // falls through to the generic complex-selector warn.
    it('&:not(.foo) inner falls through to the unsupported warn', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        styled.View`
          color: black;
          &:not(.foo) {
            color: red;
          }
        `;
        TestRenderer.create(
          React.createElement(styled.View`
            color: black;
            &:not(.foo) {
              color: red;
            }
          `)
        );
        const messages = warnSpy.mock.calls.map(call => String(call[0]));
        expect(messages.some(m => m.includes('complex selectors are not supported'))).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });

    // Characterization for the :nth-child(<formula> of <selector>)
    // syntax (Selectors 4 §9.2). The polyfill emits a dedicated warn
    // because the trailing selector requires React tree introspection
    // we don't perform.
    it(':nth-child(2n of .foo) fires the dedicated of-selector warn', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        TestRenderer.create(
          React.createElement(styled.View`
            color: black;
            &:nth-child(2n of .foo) {
              color: red;
            }
          `)
        );
        const messages = warnSpy.mock.calls.map(call => String(call[0]));
        expect(
          messages.some(
            m =>
              m.includes('CSS Selectors 4') &&
              m.includes(':nth-child(<formula> of <selector>)') &&
              m.includes("isn't supported on native")
          )
        ).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
