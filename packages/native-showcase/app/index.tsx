import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ListRenderItem } from 'react-native';
import styled from 'styled-components/native';
import { JumpGroup } from '@/components/FeatureJumpSelect';
import { CategoryRef, ScreenScaffold } from '@/components/ScreenScaffold';
import { WidgetCase } from '@/components/WidgetCase';
import { PlatonicLogo } from '@/widgets/PlatonicLogo';
import { fidgetsByCategory, FidgetEntry, FidgetCategory } from '@/widgets/registry';
import { theme as t } from '@/theme/tokens';

const CategoryBlock = styled.View`
  margin-top: ${t.space.sm}px;
`;

const CategoryHeading = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
  margin-bottom: ${t.space.xs}px;
`;

const CategoryRule = styled.View`
  height: ${t.borderWidth.hairline}px;
  background-color: ${t.colors.fgFaint};
  margin-bottom: ${t.space.md}px;
`;

type CatalogRow =
  | { kind: 'category'; category: FidgetCategory }
  | { kind: 'fidget'; entry: FidgetEntry };

function buildCatalog(): {
  rows: CatalogRow[];
  anchorIndex: Map<string, number>;
  categories: CategoryRef[];
  jumpList: JumpGroup[];
} {
  const groups = fidgetsByCategory();
  const rows: CatalogRow[] = [];
  const anchorIndex = new Map<string, number>();
  const categories: CategoryRef[] = [];
  const jumpList: JumpGroup[] = [];
  for (const { category, entries } of groups) {
    categories.push({ label: category, index: rows.length });
    rows.push({ kind: 'category', category });
    const items = entries.map(entry => ({ slug: entry.slug, title: entry.title }));
    jumpList.push({ label: category, items });
    for (const entry of entries) {
      anchorIndex.set(entry.slug, rows.length);
      rows.push({ kind: 'fidget', entry });
    }
  }
  return { rows, anchorIndex, categories, jumpList };
}

const renderRow: ListRenderItem<CatalogRow> = ({ item }) => {
  if (item.kind === 'category') {
    return (
      <CategoryBlock>
        <CategoryHeading>{item.category}</CategoryHeading>
        <CategoryRule />
      </CategoryBlock>
    );
  }
  const f = item.entry;
  return (
    <WidgetCase slug={f.slug} title={f.title} brief={f.summary} feature={f.feature}>
      <f.Widget />
    </WidgetCase>
  );
};

const keyExtractor = (item: CatalogRow): string =>
  item.kind === 'category' ? `cat:${item.category}` : `fid:${item.entry.slug}`;

export default function Catalog() {
  // Catalog is fully static; build once.
  const { rows, anchorIndex, categories, jumpList } = React.useMemo(() => buildCatalog(), []);
  const params = useLocalSearchParams<{ focus?: string }>();
  return (
    <ScreenScaffold
      title="styled-components"
      summary="A visual showcase for CSS functionality. Run all simulators (web, iOS, Android) simultaneously and compare, they should match or warn appropriately."
      hero={<PlatonicLogo />}
      focusSlug={params.focus}
      data={rows}
      renderItem={renderRow}
      keyExtractor={keyExtractor}
      anchorIndex={anchorIndex}
      categories={categories}
      jumpList={jumpList}
    />
  );
}
