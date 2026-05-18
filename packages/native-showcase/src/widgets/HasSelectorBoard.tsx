import React from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '@/components/Markdown';

/**
 * CSS Selectors 4 §13.1 - `&:has(<simple>)`. Each card reads its OWN
 * children subtree at render time and reflows in response. When the
 * inner predicate matches a descendant, the card grows extra left
 * padding (component form) or a thick bottom rail (attr form), so
 * the layout difference is visible without relying on color flips.
 * v7 supports two inner forms on native: `${Component}` and
 * `[attr]` / `[attr=value]`.
 */

const Stack = styled.View`
  gap: ${t.space.lg}px;
`;

const Section = styled.View`
  gap: ${t.space.sm}px;
`;

const SectionTitle = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.brief}px;
  color: ${t.colors.ink};
  letter-spacing: -0.2px;
`;

const LabeledRow = styled.View`
  gap: ${t.space.xs}px;
`;

const Icon = styled.View`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
`;

const Other = styled.View`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.fgFaint};
`;

const Item = styled.View`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.fgFaint};
`;

const ComponentCard = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
  &:has(${Icon}) {
    padding-left: 48px;
  }
`;

const AttrCard = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
  border-bottom-width: 0;
  &:has([data-state='active']) {
    border-bottom-width: 6px;
    border-bottom-color: ${t.colors.ink};
  }
`;

const PresenceCard = styled.View`
  flex-direction: row;
  align-items: center;
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
  border-bottom-width: 0;
  &:has([data-flag]) {
    border-bottom-width: 6px;
    border-bottom-color: ${t.colors.ink};
  }
`;

const NestedWrap = styled.View`
  padding: 4px;
  background-color: ${t.colors.surfaceMuted};
`;

export function HasSelectorBoard() {
  return (
    <Stack>
      <Section>
        <SectionTitle>
          :has(${'$'}
          {'{Component}'})
        </SectionTitle>
        <LabeledRow>
          <InlineMarkdown variant="brief">
            {'Card contains an `Icon` - `:has(${Icon})` matches; card gains left padding'}
          </InlineMarkdown>
          <ComponentCard>
            <Icon />
          </ComponentCard>
        </LabeledRow>

        <LabeledRow>
          <InlineMarkdown variant="brief">
            {'Card contains an `Other` (no `Icon`) - no match; padding stays flush'}
          </InlineMarkdown>
          <ComponentCard>
            <Other />
          </ComponentCard>
        </LabeledRow>

        <LabeledRow>
          <InlineMarkdown variant="brief">
            {
              'Card contains `Icon` nested two levels deep - recursive walk finds it; padding shifts'
            }
          </InlineMarkdown>
          <ComponentCard>
            <NestedWrap>
              <View>
                <Icon />
              </View>
            </NestedWrap>
          </ComponentCard>
        </LabeledRow>
      </Section>

      <Section>
        <SectionTitle>:has([attr]) / :has([attr=value])</SectionTitle>
        <LabeledRow>
          <InlineMarkdown variant="brief">
            {"Card contains an item with `data-state='active'` - card gains a thick bottom rail"}
          </InlineMarkdown>
          <AttrCard>
            <Item data-state="active" />
          </AttrCard>
        </LabeledRow>

        <LabeledRow>
          <InlineMarkdown variant="brief">
            {"Same selector, item has `data-state='idle'` - value mismatch, rail stays absent"}
          </InlineMarkdown>
          <AttrCard>
            <Item data-state="idle" />
          </AttrCard>
        </LabeledRow>

        <LabeledRow>
          <InlineMarkdown variant="brief">
            {'`:has([data-flag])` - presence form, any descendant carrying the prop; rail appears'}
          </InlineMarkdown>
          <PresenceCard>
            <Item data-flag />
          </PresenceCard>
        </LabeledRow>
      </Section>
    </Stack>
  );
}
