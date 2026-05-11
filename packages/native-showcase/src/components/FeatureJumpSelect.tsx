import React from 'react';
import { FlatList, ListRenderItem, Modal, StyleSheet } from 'react-native';
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

const Caret = styled.Text`
  font-family: ${t.fontFamily.strong};
  font-size: ${t.fontSize.title}px;
  line-height: ${t.fontSize.title}px;
  color: ${C.fgMuted};
`;

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
  justify-content: space-between;
  align-items: center;
  padding: ${t.space.md}px;
  border-bottom-width: ${t.borderWidth.hairline}px;
  border-bottom-color: ${C.rule};
`;

const SheetTitle = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${C.fgFaint};
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

const ItemRow = styled.Pressable`
  padding-block: ${t.space.sm}px;
  padding-inline: ${t.space.md}px;
  min-height: 44px;
  justify-content: center;
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

type Row = { kind: 'group'; label: string } | { kind: 'item'; item: JumpItem };

function buildRows(groups: ReadonlyArray<JumpGroup>): Row[] {
  const rows: Row[] = [];
  for (const g of groups) {
    rows.push({ kind: 'group', label: g.label });
    for (const item of g.items) {
      rows.push({ kind: 'item', item });
    }
  }
  return rows;
}

const keyExtractor = (r: Row): string =>
  r.kind === 'group' ? `g:${r.label}` : `i:${r.item.slug}`;

export function FeatureJumpSelect({ groups, onJump }: Props) {
  const [open, setOpen] = React.useState(false);
  const rows = React.useMemo(() => buildRows(groups), [groups]);

  const handleSelect = React.useCallback(
    (slug: string) => {
      setOpen(false);
      onJump(slug);
    },
    [onJump]
  );

  const renderRow = React.useCallback<ListRenderItem<Row>>(
    ({ item }) => {
      if (item.kind === 'group') {
        return <GroupHeading>{item.label}</GroupHeading>;
      }
      const it = item.item;
      return (
        <ItemRow accessibilityRole="button" onPress={() => handleSelect(it.slug)}>
          {state => {
            const s = state as { pressed: boolean; hovered?: boolean; focused?: boolean };
            return (
              <ItemLabel
                data-hovered={String(!!s.hovered)}
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
    [handleSelect]
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
              <Caret>⌄</Caret>
            </TriggerInner>
          );
        }}
      </Trigger>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <ModalRoot>
          <BackdropPress
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Dismiss feature picker"
            onPress={() => setOpen(false)}
          />
          <Sheet>
            <SheetHeader>
              <SheetTitle>Jump to feature</SheetTitle>
              <CloseButton
                accessibilityRole="button"
                accessibilityLabel="Close feature picker"
                onPress={() => setOpen(false)}
              >
                <CloseLabel>✕</CloseLabel>
              </CloseButton>
            </SheetHeader>
            <FlatList<Row>
              data={rows}
              renderItem={renderRow}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
            />
          </Sheet>
        </ModalRoot>
      </Modal>
    </>
  );
}
