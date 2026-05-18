import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown, Markdown } from '../components/Markdown';

/**
 * CSS Overscroll 1 - `overscroll-behavior` + CSS Scrollbars 1 §3.1 -
 * `scrollbar-width`. Both target `<ScrollView>` / `<FlatList>` /
 * `<SectionList>` / `<VirtualizedList>`. Toggle between the spec
 * values to feel the differences:
 *   - overscroll-behavior controls bounce on iOS + glow on Android
 *     (auto = platform default; contain | none = disabled).
 *   - scrollbar-width: none hides both scroll indicators. RN has no
 *     thin-scrollbar surface so `thin` is equivalent to `auto` per
 *     the spec note that UAs may disregard `thin`.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const ToggleRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.xs}px;
`;

const Toggle = styled.Pressable`
  padding: 6px 12px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.bg};
  &[aria-pressed='true'] {
    background-color: ${t.colors.ink};
  }
`;

const ToggleLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.ink};
  &[aria-pressed='true'] {
    color: ${t.colors.bg};
  }
`;

const ControlBlock = styled.View`
  gap: ${t.space.xs}px;
`;

const ControlLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const ScrollFrame = styled.View`
  height: 220px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surface};
`;

// The scroll variants encode every (overscroll x scrollbar) pair
// declaratively so the actual ScrollView prop bridge is what's being
// exercised - swapping which styled component renders is the only JS
// branching the demo does.
const ScrollAA = styled.ScrollView`
  overscroll-behavior: auto;
  scrollbar-width: auto;
`;
const ScrollAN = styled.ScrollView`
  overscroll-behavior: auto;
  scrollbar-width: none;
`;
const ScrollCA = styled.ScrollView`
  overscroll-behavior: contain;
  scrollbar-width: auto;
`;
const ScrollCN = styled.ScrollView`
  overscroll-behavior: contain;
  scrollbar-width: none;
`;
const ScrollNA = styled.ScrollView`
  overscroll-behavior: none;
  scrollbar-width: auto;
`;
const ScrollNN = styled.ScrollView`
  overscroll-behavior: none;
  scrollbar-width: none;
`;

const Item = styled.View`
  padding: ${t.space.md}px ${t.space.sm}px;
  border-bottom-width: ${t.borderWidth.hairline}px;
  border-bottom-color: ${t.colors.rule};
`;

const ItemLabel = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.ink};
`;

const ROWS = Array.from({ length: 24 }, (_, i) => `Row ${i + 1}`);

type OverscrollMode = 'auto' | 'contain' | 'none';
type ScrollbarMode = 'auto' | 'none';

// nestedScrollEnabled is required on Android when a same-direction
// ScrollView lives inside another ScrollView (the catalog page is one).
// iOS ignores the prop, so it's safe to pass everywhere.
function ScrollVariant({
  overscroll,
  scrollbar,
  children,
}: {
  overscroll: OverscrollMode;
  scrollbar: ScrollbarMode;
  children: React.ReactNode;
}) {
  if (overscroll === 'auto' && scrollbar === 'auto')
    return <ScrollAA nestedScrollEnabled>{children}</ScrollAA>;
  if (overscroll === 'auto') return <ScrollAN nestedScrollEnabled>{children}</ScrollAN>;
  if (overscroll === 'contain' && scrollbar === 'auto')
    return <ScrollCA nestedScrollEnabled>{children}</ScrollCA>;
  if (overscroll === 'contain') return <ScrollCN nestedScrollEnabled>{children}</ScrollCN>;
  if (scrollbar === 'auto') return <ScrollNA nestedScrollEnabled>{children}</ScrollNA>;
  return <ScrollNN nestedScrollEnabled>{children}</ScrollNN>;
}

interface SegmentedProps<T extends string> {
  values: ReadonlyArray<T>;
  value: T;
  onChange: (next: T) => void;
}

function Segmented<T extends string>({ values, value, onChange }: SegmentedProps<T>) {
  return (
    <ToggleRow>
      {values.map(v => {
        const pressed = v === value;
        return (
          <Toggle key={v} aria-pressed={pressed} onPress={() => onChange(v)}>
            <ToggleLabel aria-pressed={pressed}>{v}</ToggleLabel>
          </Toggle>
        );
      })}
    </ToggleRow>
  );
}

export function ScrollSurfacesBoard() {
  const [overscroll, setOverscroll] = useState<OverscrollMode>('auto');
  const [scrollbar, setScrollbar] = useState<ScrollbarMode>('auto');
  return (
    <Stack>
      <InlineMarkdown variant="brief">
        {`Drag the list past its top or bottom edge - the bounce / over-scroll glow follows the active \`overscroll-behavior\`. Indicator visibility tracks \`scrollbar-width\`.`}
      </InlineMarkdown>
      <ControlBlock>
        <ControlLabel>overscroll-behavior</ControlLabel>
        <Segmented
          values={['auto', 'contain', 'none'] as const}
          value={overscroll}
          onChange={setOverscroll}
        />
      </ControlBlock>
      <ControlBlock>
        <ControlLabel>scrollbar-width</ControlLabel>
        <Segmented values={['auto', 'none'] as const} value={scrollbar} onChange={setScrollbar} />
      </ControlBlock>
      <ScrollFrame>
        <ScrollVariant overscroll={overscroll} scrollbar={scrollbar}>
          {ROWS.map(label => (
            <Item key={label}>
              <ItemLabel>{label}</ItemLabel>
            </Item>
          ))}
        </ScrollVariant>
      </ScrollFrame>
      <Markdown variant="hint">
        {`\`scrollbar-width: thin\` is treated like \`auto\` on iOS and Android. Web builds keep all three values so the browser handles them.`}
      </Markdown>
    </Stack>
  );
}
