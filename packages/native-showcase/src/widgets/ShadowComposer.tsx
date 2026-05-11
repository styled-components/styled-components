import React from 'react';
import styled from 'styled-components/native';
import { darkChip } from '@/components/captionStyles';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  /* Larger row gap so soft / layered drop shadows have room to bloom
     without crowding the row above or below. */
  gap: ${t.space.xl}px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.lg}px;
  flex-wrap: wrap;
`;

const Card = styled.View`
  flex: 1 1 30%;
  min-width: 90px;
  height: 90px;
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  align-items: center;
  justify-content: center;
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  color: ${t.colors.ink};
  text-transform: uppercase;
  ${darkChip}
`;

/* Drop shadows on dark surfaces: a darker shadow disappears into the
   page bg, so swap to a soft cream halo via light-dark(). The visual
   convention in dark UIs is a tinted glow rather than a literal cast
   shadow, which still reads as elevation without implying a light
   source the surface can't actually have. v7's resolver re-evaluates
   light-dark() on every scheme change. */

const Soft = styled(Card)`
  box-shadow: 0 6px 18px light-dark(rgba(14, 14, 16, 0.18), rgba(245, 243, 238, 0.08));
`;

const Layered = styled(Card)`
  box-shadow:
    0 1px 1px light-dark(rgba(14, 14, 16, 0.12), rgba(245, 243, 238, 0.05)),
    0 4px 8px light-dark(rgba(14, 14, 16, 0.1), rgba(245, 243, 238, 0.06)),
    0 16px 28px light-dark(rgba(14, 14, 16, 0.14), rgba(245, 243, 238, 0.08));
`;

const Inset = styled(Card)`
  box-shadow: inset 0 0 0 4px ${t.colors.ink};
  /* Keep the caption chip clear of the 4px inset ring. */
  padding: ${t.space.xs}px;
`;

const Spread = styled(Card)`
  box-shadow: 0 0 0 6px ${t.colors.fail};
`;

const Themed = styled(Card)`
  /* fail is the theme accent red, visually distinctive in both light
     and dark modes. ink would render as a cream glow in dark mode
     (it flips for foreground contrast), which obscures the
     theme-color-drives-the-shadow point. */
  box-shadow: 0 4px 14px ${t.colors.fail};
`;

const Multi = styled(Card)`
  /* Showcase rule: ultra-obvious demonstrations. The inset uses a
     translucent ink so it reads as a soft inner frame rather than
     overwhelming the outer drop shadow with a solid 2px line. The
     outer shadow runs at high opacity + a generous blur so both
     effects are clearly legible side by side in light and dark. */
  box-shadow:
    inset 0 0 0 2px light-dark(rgba(14, 14, 16, 0.4), rgba(245, 243, 238, 0.3)),
    0 14px 30px light-dark(rgba(14, 14, 16, 0.4), rgba(245, 243, 238, 0.18));
  /* Keep the caption chip clear of the inset ring. */
  padding: ${t.space.xxs}px;
`;

export function ShadowComposer() {
  return (
    <Stack>
      <Row>
        <Soft>
          <Caption>soft</Caption>
        </Soft>
        <Layered>
          <Caption>layered · 3</Caption>
        </Layered>
        <Inset>
          <Caption>inset</Caption>
        </Inset>
      </Row>
      <Row>
        <Spread>
          <Caption>spread</Caption>
        </Spread>
        <Themed>
          <Caption>theme color</Caption>
        </Themed>
        <Multi>
          <Caption>inset + outer</Caption>
        </Multi>
      </Row>
    </Stack>
  );
}
