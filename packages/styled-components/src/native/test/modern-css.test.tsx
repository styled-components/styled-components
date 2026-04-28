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
      expect(view.props.style).toEqual({ color: 'red', paddingTop: 10 });
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
      expect(view.props.style).toEqual([{ color: 'red' }, { color: 'blue' }]);
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
      expect(tree.root.findByType(View).props.style).toEqual([{ color: 'red' }, { color: 'blue' }]);
    });

    it('evaluates orientation', () => {
      // Mock: width 750, height 1334 — portrait (height >= width).
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
      expect(tree.root.findByType(View).props.style).toEqual([
        { color: 'red' },
        { paddingTop: 10 },
      ]);
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
        expect(tree.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
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
      expect(tree.root.findByType(View).props.style).toEqual([
        { color: 'red' },
        { paddingTop: 20 },
      ]);
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
      expect(tree.root.findByType(View).props.style).toEqual([{ color: 'red' }, { color: 'blue' }]);
    });

    it('evaluates `,` OR-clause queries', () => {
      const Comp = styled.View`
        color: red;
        @media (max-width: 100px), (min-width: 500px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(<Comp />);
      expect(tree.root.findByType(View).props.style).toEqual([{ color: 'red' }, { color: 'blue' }]);
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
      expect(view.props.style).toEqual([{ color: 'red' }, { color: 'blue' }, { opacity: 0.5 }]);
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
      expect(tree.root.findByType(View).props.style).toEqual([
        { color: 'red' },
        { paddingTop: 10 },
        { opacity: 0.8 },
      ]);
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
      expect(tree.root.findByType(View).props.style).toEqual([
        { color: 'red' },
        { color: 'green' },
        { color: 'blue' },
      ]);
    });
  });

  describe('reactivity', () => {
    it('re-renders when Dimensions.change fires', () => {
      // Capture the listener at subscribe time — must spy BEFORE mount, since
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

        expect(tree.root.findByType(View).props.style).toEqual([
          { color: 'red' },
          { color: 'blue' },
        ]);
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

        expect(tree.root.findByType(View).props.style).toEqual([
          { color: 'black' },
          { color: 'white' },
        ]);
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
      expect(view.props.style).toEqual([{ color: 'red' }, { color: 'blue' }]);
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
      expect(tree.root.findByType(View).props.style).toEqual([{}, { opacity: 0.5 }]);
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
      expect(styles).toEqual([{}, { color: 'red' }, { opacity: 0.5 }]);
    });

    it('re-renders descendants when the container layout changes', () => {
      const Card = styled.View<{ $containerName?: string }>`
        padding: 8px;
      `;
      const Child = styled.View`
        color: red;
        @container card (min-width: 300px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(
        <Card $containerName="card">
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
      expect(tree.root.findAllByType(View)[1].props.style).toEqual([
        { color: 'red' },
        { color: 'blue' },
      ]);
    });

    it('supports nested container scopes with different names', () => {
      const Outer = styled.View<{ $containerName?: string }>`
        padding: 4px;
      `;
      const Inner = styled.View<{ $containerName?: string }>`
        padding: 2px;
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
        <Outer $containerName="outer">
          <Inner $containerName="inner">
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
      expect(leafStyle).toEqual([{ color: 'black' }, { color: 'red' }, { opacity: 0.5 }]);
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
      expect(tree.root.findByType(View).props.style).toEqual([
        { color: 'red' },
        { paddingTop: 10 },
        { opacity: 0.5 },
      ]);
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

      expect(pressable.props.style({ pressed: false })).toEqual([{ backgroundColor: 'white' }]);
      expect(pressable.props.style({ pressed: true })).toEqual([
        { backgroundColor: 'white' },
        { opacity: 0.5 },
      ]);
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
      expect(pressable.props.style({ hovered: true })).toEqual([
        { color: 'black' },
        { color: 'purple' },
      ]);
      expect(pressable.props.style({ hovered: false })).toEqual([{ color: 'black' }]);
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
      expect(pressable.props.style({ focused: true })).toEqual([
        { color: 'black' },
        { color: 'orange' },
      ]);
      expect(pressable.props.style({ focused: false })).toEqual([{ color: 'black' }]);
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

      expect(pressable.props.style({ pressed: true })).toEqual([
        { backgroundColor: 'white' },
        { opacity: 0.5 },
        { borderWidth: 2 },
      ]);
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
      expect(onTree.root.findByType(View).props.style).toEqual([
        { backgroundColor: 'white' },
        { backgroundColor: 'yellow' },
      ]);

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
      expect(tree.root.findByType(View).props.style).toEqual([
        { backgroundColor: 'white' },
        { backgroundColor: 'yellow' },
      ]);
    });

    it('bare `&[attr]` matches when the prop is defined regardless of value', () => {
      const Comp = styled.View<{ 'aria-busy'?: boolean }>`
        color: black;
        &[aria-busy] {
          color: gray;
        }
      `;
      const onTree = TestRenderer.create(<Comp aria-busy />);
      expect(onTree.root.findByType(View).props.style).toEqual([
        { color: 'black' },
        { color: 'gray' },
      ]);

      // Also matches when explicitly false — presence not truthiness.
      const falseTree = TestRenderer.create(<Comp aria-busy={false} />);
      expect(falseTree.root.findByType(View).props.style).toEqual([
        { color: 'black' },
        { color: 'gray' },
      ]);

      // Doesn't match when prop is omitted entirely.
      const offTree = TestRenderer.create(<Comp />);
      expect(offTree.root.findByType(View).props.style).toEqual({ color: 'black' });
    });
  });

  describe('$containerName registration', () => {
    it('attaches an onLayout handler when $containerName is set', () => {
      const Card = styled.View<{ $containerName?: string }>`
        padding: 8px;
      `;
      const tree = TestRenderer.create(<Card $containerName="card" />);
      const view = tree.root.findByType(View);
      expect(typeof view.props.onLayout).toBe('function');
    });

    it('publishes container size to descendants through ContainerContext', () => {
      const Card = styled.View<{ $containerName?: string }>`
        padding: 8px;
      `;
      const Child = styled.View`
        @container card (min-width: 300px) {
          color: blue;
        }
      `;
      const tree = TestRenderer.create(
        <Card $containerName="card">
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
      expect(child.props.style).toEqual([{}, { color: 'blue' }]);
    });

    it('strips $containerName from forwarded element props', () => {
      const Card = styled.View<{ $containerName?: string }>`
        padding: 8px;
      `;
      const tree = TestRenderer.create(<Card $containerName="card" />);
      const view = tree.root.findByType(View);
      expect(view.props.$containerName).toBeUndefined();
    });
  });

  describe('composite scenarios', () => {
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

      expect(pressable.props.style({ pressed: false })).toEqual([
        { color: 'black' },
        { paddingTop: 20 },
      ]);
      expect(pressable.props.style({ pressed: true })).toEqual([
        { color: 'black' },
        { paddingTop: 20 },
        { opacity: 0.5 },
      ]);
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

      expect(style({ hovered: true, focused: true, pressed: true })).toEqual([
        { color: 'black' },
        { color: 'blue' },
        { borderColor: 'red' },
        { opacity: 0.5 },
      ]);

      expect(style({ disabled: true })).toEqual([{ color: 'black' }, { opacity: 0.3 }]);
      expect(style({})).toEqual([{ color: 'black' }]);
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
      expect(style({ hovered: false })).toEqual([{ color: 'black' }, { paddingTop: 8 }]);
      // media matches, hover true → base + media padding + composite pseudo.
      expect(style({ hovered: true })).toEqual([
        { color: 'black' },
        { paddingTop: 8 },
        { color: 'blue' },
      ]);
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

      expect(style({ hovered: false })).toEqual([{ color: 'black' }]);
      expect(style({ hovered: true })).toEqual([{ color: 'black' }]);
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
      expect(style({ pressed: false })).toEqual([{ color: 'black' }, { paddingTop: 4 }]);
      // Container matches + pressed true → padding + opacity.
      expect(style({ pressed: true })).toEqual([
        { color: 'black' },
        { paddingTop: 4 },
        { opacity: 0.5 },
      ]);
    });

    it('pseudo inside @container without a matching container stays inactive', () => {
      // No ContainerContext — container bucket can't match, composite pseudo can't fire.
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
      expect(style({ pressed: true })).toEqual([{ color: 'black' }]);
    });
  });
});
