import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '../components/Markdown';

/**
 * CSS Box Alignment 3 §6.3 (place-self) and §7.3 (place-items). The
 * shorthand expands to two longhands per the spec. On RN, the
 * `justify-items` / `justify-self` halves silently drop (Yoga only
 * implements the cross-axis half); rn-web honors both. The visible
 * effect on native is the cross-axis alignment.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;

  @media (min-aspect-ratio: 1/1) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const Row = styled.View`
  gap: ${t.space.xs}px;

  @media (min-aspect-ratio: 1/1) {
    flex: 1 1 45%;
    min-width: 320px;
  }
  @media (min-aspect-ratio: 4/3) {
    flex: 1 1 30%;
    min-width: 280px;
  }
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

const ItemsContainer = styled.View`
  flex-direction: row;
  height: 140px;
  gap: ${t.space.sm}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surface};

  &[data-place='start'] {
    place-items: flex-start;
  }
  &[data-place='center'] {
    place-items: center;
  }
  &[data-place='end'] {
    place-items: flex-end;
  }
  &[data-place='stretch'] {
    place-items: stretch;
  }
`;

/* The card has an intrinsic min-height (so start/center/end have
   something to pin), flex-grows along the main axis (so the row of
   cards spans the container), and leaves cross-axis size unspecified
   (so stretch can drive it from align-items). */
const Card = styled.View`
  flex-grow: 1;
  flex-basis: 0;
  min-height: 44px;
  background-color: ${t.colors.ink};
  align-items: center;
  justify-content: center;
`;

const CardLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.bg};
`;

const SelfContainer = styled.View`
  flex-direction: row;
  height: 140px;
  gap: ${t.space.sm}px;
  align-items: flex-start;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surface};
`;

const SelfCard = styled.View`
  flex-grow: 1;
  flex-basis: 0;
  min-height: 44px;
  background-color: ${t.colors.ink};
  align-items: center;
  justify-content: center;

  &[data-self='start'] {
    place-self: flex-start;
  }
  &[data-self='center'] {
    place-self: center;
  }
  &[data-self='end'] {
    place-self: flex-end;
  }
  &[data-self='stretch'] {
    place-self: stretch;
  }
`;

const PLACES = ['start', 'center', 'end', 'stretch'] as const;

export function PlaceShelf() {
  return (
    <Stack>
      <Row>
        <Tag>place-items · §7.3</Tag>
        <InlineMarkdown variant="brief">
          {`Shorthand for \`align-items\` + \`justify-items\`. On native, only the cross-axis half lands; rn-web honors both.`}
        </InlineMarkdown>
        {PLACES.map(place => (
          <Row key={place}>
            <Caption>{`place-items: ${place}`}</Caption>
            <ItemsContainer data-place={place}>
              <Card>
                <CardLabel>A</CardLabel>
              </Card>
              <Card>
                <CardLabel>B</CardLabel>
              </Card>
              <Card>
                <CardLabel>C</CardLabel>
              </Card>
            </ItemsContainer>
          </Row>
        ))}
      </Row>

      <Row>
        <Tag>place-self · §6.3</Tag>
        <InlineMarkdown variant="brief">
          {`Each card overrides container alignment via the per-item shorthand. Container defaults to \`align-items: flex-start\`.`}
        </InlineMarkdown>
        <SelfContainer>
          {PLACES.map(place => (
            <SelfCard key={place} data-self={place}>
              <CardLabel>{place}</CardLabel>
            </SelfCard>
          ))}
        </SelfContainer>
      </Row>
    </Stack>
  );
}
