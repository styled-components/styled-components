import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Attribute-driven variants: one `Pill` styled component, every visual
 * variant expressed as a `[data-*]` or `[aria-*]` selector branch in
 * its CSS. No JS-side variant prop, no `if`/`switch`, no compound
 * styled-components. Tap any pill to flip its `aria-pressed` and watch
 * the compound `[data-variant='ghost'][aria-pressed='true']` rule fire.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

/**
 * v7's native engine supports single (`&[a]`), compound (`&[a][b]`),
 * and comma-grouped (`&[a], &[b]`) attribute selectors. The compound
 * rule below only fires when BOTH `data-variant='ghost'` AND
 * `aria-pressed='true'` are set on the rendered element — every
 * other path is a single-attr selector that cascades by source order.
 */
const Pill = styled.Pressable`
  align-self: flex-start;
  padding: 8px 14px;
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.heavy}px solid ${t.colors.border};

  &[data-tone='pass'] {
    background-color: ${t.colors.pass};
    border-color: ${t.colors.pass};
  }

  &[data-tone='fail'] {
    background-color: ${t.colors.fail};
    border-color: ${t.colors.fail};
  }

  &[data-variant='outline'] {
    background-color: transparent;
  }

  &[data-variant='ghost'] {
    background-color: transparent;
    border-color: transparent;
  }

  &[aria-pressed='true'] {
    background-color: ${t.colors.ink};
    border-color: ${t.colors.border};
  }

  /* Compound: distinct ghost+pressed treatment via the AND-bucket. */
  &[data-variant='ghost'][aria-pressed='true'] {
    background-color: ${t.colors.pass};
    border-color: ${t.colors.pass};
  }

  /* CSS Selectors 4 §6.2 operators */
  &[data-tone^='pa'] {
    /* Prefix-match: tones starting with "pa" (pass) */
  }
  &[data-tone*='ai'] {
    /* Substring-match: tones containing "ai" (fail) */
  }

  /* CSS Selectors 4 §4.3 :not — flips back to default when pressed */
  &:not([aria-pressed='true']):not([data-tone='pass']):not([data-tone='fail']) {
    border-color: ${t.colors.fgMuted};
  }
`;

const PillLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: 12px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${t.colors.ink};

  &[data-variant='ghost'] {
    color: ${t.colors.fgMuted};
  }

  &[data-tone='pass'] {
    color: ${t.colors.bg};
  }

  &[data-tone='fail'] {
    color: ${t.colors.bg};
  }

  &[aria-pressed='true'] {
    color: ${t.colors.bg};
  }
`;

const VariantRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
`;

const Selector = styled.Text`
  flex: 1;
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

interface Variant {
  id: string;
  label: string;
  attrs: Record<string, string>;
  /** The selector chain rendered next to the pill so the user can see what styled it. */
  selector: string;
}

const VARIANTS: ReadonlyArray<Variant> = [
  { id: 'default', label: 'Default', attrs: {}, selector: '(no attrs)' },
  { id: 'pass', label: 'Pass', attrs: { 'data-tone': 'pass' }, selector: "[data-tone='pass']" },
  { id: 'fail', label: 'Fail', attrs: { 'data-tone': 'fail' }, selector: "[data-tone='fail']" },
  {
    id: 'outline',
    label: 'Outline',
    attrs: { 'data-variant': 'outline' },
    selector: "[data-variant='outline']",
  },
  {
    id: 'ghost',
    label: 'Ghost',
    attrs: { 'data-variant': 'ghost' },
    selector: "[data-variant='ghost']",
  },
];

export function AttributeVariants() {
  const [pressed, setPressed] = useState<string | null>(null);
  return (
    <Stack>
      {VARIANTS.map(v => {
        const isPressed = pressed === v.id;
        return (
          <VariantRow key={v.id}>
            <Pill
              {...v.attrs}
              aria-pressed={isPressed}
              onPress={() => setPressed(p => (p === v.id ? null : v.id))}
              accessibilityRole="button"
            >
              <PillLabel {...v.attrs} aria-pressed={isPressed}>
                {v.label}
              </PillLabel>
            </Pill>
            <Selector>
              {v.selector}
              {isPressed ? "[aria-pressed='true']" : ''}
            </Selector>
          </VariantRow>
        );
      })}
    </Stack>
  );
}
