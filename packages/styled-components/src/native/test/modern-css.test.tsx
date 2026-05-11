import React from 'react';
import { Appearance, Dimensions, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { ContainerContext } from '../';
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
        <ContainerContext.Provider value={containerValue}>
          <Comp />
        </ContainerContext.Provider>
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
        <ContainerContext.Provider value={containerValue}>
          <Comp />
        </ContainerContext.Provider>
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
        <ContainerContext.Provider value={containerValue}>
          <Comp />
        </ContainerContext.Provider>
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
        <ContainerContext.Provider value={containerValue}>
          <Comp />
        </ContainerContext.Provider>
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
        <ContainerContext.Provider value={containerValue}>
          <Comp />
        </ContainerContext.Provider>
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
        <ContainerContext.Provider value={containerValue}>
          <Comp />
        </ContainerContext.Provider>
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
});
