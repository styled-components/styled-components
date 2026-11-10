import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '../components/Markdown';

/**
 * Selectors 4 §12.1 - `:disabled`, `:read-only`, `:read-write` on TextInput.
 * Each input receives only plain props (nothing hand-computed); the rules
 * below are the sole source of the look, so a cell that looks wrong means
 * the library did not match.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Row = styled.View`
  gap: ${t.space.xs}px;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const Field = styled.TextInput`
  padding: ${t.space.xs}px ${t.space.sm}px;
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  border-width: 2px;
  border-style: solid;
  border-color: ${t.colors.border};
  background-color: ${t.colors.surface};
  color: ${t.colors.ink};

  &:read-write {
    border-color: ${t.colors.ink};
  }

  &:read-only {
    border-style: dotted;
    border-color: ${t.colors.fgFaint};
    background-color: ${t.colors.surfaceMuted};
    color: ${t.colors.fgMuted};
  }

  &:disabled {
    border-width: 4px;
    border-style: dashed;
    border-color: light-dark(#c8243a, #ff6b80);
    background-color: ${t.colors.ink};
    color: ${t.colors.bg};
  }
`;

const Toggle = styled.Pressable`
  align-self: flex-start;
  padding: 5px 12px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.bg};
`;

const ToggleLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.8px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

export function TextInputStates() {
  const [off, setOff] = useState(true);
  return (
    <Stack>
      <InlineMarkdown variant="brief">
        {`Same rules on three inputs. Solid heavy border: \`:read-write\`. Dotted muted field: \`:read-only\`. Ink flood with a dashed red border: \`:disabled\`, which also blocks focus and typing. Toggle the third input.`}
      </InlineMarkdown>
      <Row>
        <Tag>default · read-write</Tag>
        <Field defaultValue="Type here" accessibilityLabel="read-write input" />
      </Row>
      <Row>
        <Tag>readOnly</Tag>
        <Field
          readOnly
          defaultValue="Selectable, not editable"
          accessibilityLabel="read-only input"
        />
      </Row>
      <Row>
        <Tag>{off ? 'disabled' : 'disabled={false}'}</Tag>
        <Field disabled={off} defaultValue="Toggle me" accessibilityLabel="toggled input" />
        <Toggle
          onPress={() => setOff(d => !d)}
          accessibilityRole="button"
          accessibilityState={{ selected: off }}
        >
          <ToggleLabel>{off ? 'Enable input' : 'Disable input'}</ToggleLabel>
        </Toggle>
      </Row>
    </Stack>
  );
}
