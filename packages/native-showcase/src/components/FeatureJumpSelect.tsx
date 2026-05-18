import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import {
  FlatList,
  ListRenderItem,
  Modal,
  NativeSyntheticEvent,
  StyleSheet,
  TextInputKeyPressEventData,
} from 'react-native';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

// Match the Rail chrome's `light-dark()` palette so theme switches repaint
// without a full React re-render. createTheme leaves flatten to literal hex
// at render on rn-web (no `var()` emission yet), so `t.colors.*` would
// freeze us to whichever mode rendered first.
const C = {
  ink: 'light-dark(#0e0e10, #f5f3ee)',
  fgMuted: 'light-dark(#46464a, #a8a8ac)',
  fgFaint: 'light-dark(#7c7c80, #6c6c70)',
  rule: 'light-dark(#7c7c80, #3a3a3f)',
  bg: 'light-dark(#f5f3ee, #0e0e10)',
  scrim: 'light-dark(rgba(14, 14, 16, 0.55), rgba(0, 0, 0, 0.7))',
  highlight: 'light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.08))',
};

export interface JumpItem {
  slug: string;
  title: string;
}

export interface JumpGroup {
  label: string;
  items: ReadonlyArray<JumpItem>;
}

interface Props {
  groups: ReadonlyArray<JumpGroup>;
  onJump: (slug: string) => void;
}

const Trigger = styled.Pressable`
  align-self: stretch;
`;

const TriggerInner = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${t.space.sm}px;
  padding-block: ${t.space.sm}px;
  padding-inline: ${t.space.sm}px;
  min-height: 44px;
  border-width: ${t.borderWidth.hairline}px;
  border-color: ${C.rule};
`;

const TriggerLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: ${C.fgMuted};
  transition: color 120ms ease-out;

  &[data-hovered='true'],
  &[data-focused='true'] {
    color: ${C.ink};
  }

  &[data-pressed='true'] {
    color: ${C.fgFaint};
  }
`;

const Chevron = styled(Feather).attrs({
  name: 'chevron-down' as const,
  size: 16,
  color: C.fgMuted,
})``;

const ModalRoot = styled.View`
  flex: 1;
  justify-content: flex-end;
`;

const BackdropPress = styled.Pressable`
  background-color: ${C.scrim};
`;

const Sheet = styled.View`
  background-color: ${C.bg};
  border-top-width: ${t.borderWidth.hairline}px;
  border-top-color: ${C.rule};
  max-height: 70%;
`;

const SheetHeader = styled.View`
  flex-direction: row;
  align-items: stretch;
  border-bottom-width: ${t.borderWidth.hairline}px;
  border-bottom-color: ${C.rule};
`;

const FilterInput = styled.TextInput`
  flex: 1;
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  color: ${C.ink};
  padding: ${t.space.md}px;
`;

const CloseButton = styled.Pressable`
  padding-block: ${t.space.xs}px;
  padding-inline: ${t.space.sm}px;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
`;

const CloseLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
  color: ${C.ink};
`;

const GroupHeading = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${C.fgFaint};
  padding-top: ${t.space.md}px;
  padding-right: ${t.space.md}px;
  padding-bottom: ${t.space.xs}px;
  padding-left: ${t.space.md}px;
`;

const ItemRow = styled.Pressable<{ $highlighted?: boolean }>`
  padding-block: ${t.space.sm}px;
  padding-inline: ${t.space.md}px;
  min-height: 44px;
  justify-content: center;
  background-color: ${p => (p.$highlighted ? C.highlight : 'transparent')};
`;

const ItemLabel = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  line-height: ${t.lineHeight.body}px;
  color: ${C.ink};
  transition: color 120ms ease-out;

  &[data-hovered='true'],
  &[data-focused='true'] {
    color: ${C.fgMuted};
  }

  &[data-pressed='true'] {
    color: ${C.fgFaint};
  }
`;

const EmptyLabel = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  color: ${C.fgFaint};
  padding: ${t.space.md}px;
`;

type Row = { kind: 'group'; label: string } | { kind: 'item'; item: JumpItem };

const keyExtractor = (r: Row): string => (r.kind === 'group' ? `g:${r.label}` : `i:${r.item.slug}`);

function filterGroups(
  groups: ReadonlyArray<JumpGroup>,
  q: string
): { rows: Row[]; items: JumpItem[] } {
  const needle = q.trim().toLowerCase();
  const rows: Row[] = [];
  const items: JumpItem[] = [];
  for (const g of groups) {
    const matched = needle
      ? g.items.filter(it => it.title.toLowerCase().includes(needle))
      : g.items;
    if (matched.length === 0) continue;
    rows.push({ kind: 'group', label: g.label });
    for (const it of matched) {
      rows.push({ kind: 'item', item: it });
      items.push(it);
    }
  }
  return { rows, items };
}

export function FeatureJumpSelect({ groups, onJump }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(0);
  const listRef = React.useRef<FlatList<Row> | null>(null);

  const { rows, items } = React.useMemo(() => filterGroups(groups, query), [groups, query]);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlight(0);
    }
  }, [open]);

  // Clamp highlight whenever the filtered set shrinks.
  React.useEffect(() => {
    setHighlight(h => (h >= items.length ? 0 : h));
  }, [items.length]);

  const handleSelect = React.useCallback(
    (slug: string) => {
      setOpen(false);
      onJump(slug);
    },
    [onJump]
  );

  const scrollHighlightedIntoView = React.useCallback(
    (slug: string) => {
      const idx = rows.findIndex(r => r.kind === 'item' && r.item.slug === slug);
      if (idx >= 0) {
        listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.4 });
      }
    },
    [rows]
  );

  const handleKeyPress = React.useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      const key = e.nativeEvent.key;
      if (key === 'ArrowDown') {
        if (items.length === 0) return;
        setHighlight(h => {
          const next = (h + 1) % items.length;
          scrollHighlightedIntoView(items[next].slug);
          return next;
        });
      } else if (key === 'ArrowUp') {
        if (items.length === 0) return;
        setHighlight(h => {
          const next = (h - 1 + items.length) % items.length;
          scrollHighlightedIntoView(items[next].slug);
          return next;
        });
      } else if (key === 'Enter') {
        const it = items[highlight];
        if (it) handleSelect(it.slug);
      } else if (key === 'Escape') {
        setOpen(false);
      }
    },
    [items, highlight, scrollHighlightedIntoView, handleSelect]
  );

  // Native keyboards send Enter through onSubmitEditing rather than
  // onKeyPress; covers the iOS/Android hardware-keyboard return path.
  const handleSubmit = React.useCallback(() => {
    const it = items[highlight];
    if (it) handleSelect(it.slug);
  }, [items, highlight, handleSelect]);

  const handleScrollToIndexFailed = React.useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
    },
    []
  );

  const highlightedSlug = items[highlight]?.slug;

  const renderRow = React.useCallback<ListRenderItem<Row>>(
    ({ item }) => {
      if (item.kind === 'group') {
        return <GroupHeading>{item.label}</GroupHeading>;
      }
      const it = item.item;
      const isHighlighted = it.slug === highlightedSlug;
      return (
        <ItemRow
          $highlighted={isHighlighted}
          accessibilityRole="button"
          onPress={() => handleSelect(it.slug)}
        >
          {state => {
            const s = state as { pressed: boolean; hovered?: boolean; focused?: boolean };
            return (
              <ItemLabel
                data-hovered={String(!!s.hovered || isHighlighted)}
                data-focused={String(!!s.focused)}
                data-pressed={String(s.pressed)}
              >
                {it.title}
              </ItemLabel>
            );
          }}
        </ItemRow>
      );
    },
    [handleSelect, highlightedSlug]
  );

  return (
    <>
      <Trigger
        accessibilityRole="button"
        accessibilityLabel="Jump to a feature"
        onPress={() => setOpen(true)}
      >
        {state => {
          const s = state as { pressed: boolean; hovered?: boolean; focused?: boolean };
          return (
            <TriggerInner>
              <TriggerLabel
                data-hovered={String(!!s.hovered)}
                data-focused={String(!!s.focused)}
                data-pressed={String(s.pressed)}
              >
                Jump to feature
              </TriggerLabel>
              <Chevron />
            </TriggerInner>
          );
        }}
      </Trigger>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <ModalRoot>
          <BackdropPress
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Dismiss feature picker"
            onPress={() => setOpen(false)}
          />
          <Sheet>
            <SheetHeader>
              <FilterInput
                key={open ? 'open' : 'closed'}
                accessibilityLabel="Filter features"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                placeholder="Jump to feature"
                placeholderTextColor={C.fgFaint}
                returnKeyType="go"
                value={query}
                onChangeText={setQuery}
                onKeyPress={handleKeyPress}
                onSubmitEditing={handleSubmit}
              />
              <CloseButton
                accessibilityRole="button"
                accessibilityLabel="Close feature picker"
                onPress={() => setOpen(false)}
              >
                <CloseLabel>✕</CloseLabel>
              </CloseButton>
            </SheetHeader>
            {items.length === 0 ? (
              <EmptyLabel>No features match "{query}"</EmptyLabel>
            ) : (
              <FlatList<Row>
                ref={listRef}
                data={rows}
                renderItem={renderRow}
                keyExtractor={keyExtractor}
                keyboardShouldPersistTaps="handled"
                onScrollToIndexFailed={handleScrollToIndexFailed}
              />
            )}
          </Sheet>
        </ModalRoot>
      </Modal>
    </>
  );
}
