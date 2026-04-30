import React from 'react';
import styled from 'styled-components/native';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { WidgetCase } from '@/components/WidgetCase';
import { fidgetsByCategory } from '@/widgets/registry';
import { theme as t } from '@/theme/tokens';

const CategoryHeading = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
  margin-bottom: ${t.space.md}px;
  margin-top: ${t.space.sm}px;
`;

const CategoryRule = styled.View`
  height: ${t.borderWidth.heavy}px;
  background-color: ${t.colors.ink};
  margin-bottom: ${t.space.md}px;
`;

export default function Catalog() {
  const groups = fidgetsByCategory();
  return (
    <ScreenScaffold
      title="styled-components"
      summary="Modern CSS compiled deterministically to React Native styles. Each section exercises one feature; verification rows compare the compiled output against expectations."
    >
      {groups.map(({ category, entries }) => (
        <React.Fragment key={category}>
          <CategoryHeading>{category}</CategoryHeading>
          <CategoryRule />
          {entries.map(f => (
            <WidgetCase
              key={f.slug}
              title={f.title}
              brief={f.summary}
              feature={f.feature}
              cases={f.cases}
            >
              <f.Widget />
            </WidgetCase>
          ))}
        </React.Fragment>
      ))}
    </ScreenScaffold>
  );
}
