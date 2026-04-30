import React, { useState } from 'react';
import styled from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import { theme as t } from '@/theme/tokens';

const Button = styled.Pressable`
  align-self: flex-start;
  padding: 12px 20px;
  border: ${t.borderWidth.heavy}px solid ${t.colors.ink};
  background-color: ${t.colors.surfaceMuted};

  &:hover,
  &:focus,
  &:focus-visible {
    background-color: ${t.colors.bg};
  }

  &:active {
    background-color: ${t.colors.ink};
  }

  &:disabled {
    background-color: ${t.colors.surfaceMuted};
    border-color: ${t.colors.border};
  }
`;

const Label = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${t.colors.ink};

  &[data-pressed='true'] {
    color: ${t.colors.bg};
  }

  &[data-disabled='true'] {
    color: ${t.colors.fgFaint};
  }
`;

const Toggle = styled.Pressable`
  align-self: flex-start;
  padding: 5px 12px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  background-color: ${t.colors.bg};

  &[aria-pressed='true'] {
    background-color: ${t.colors.ink};
  }
`;

const ToggleLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.8px;
  color: ${t.colors.ink};
  text-transform: uppercase;

  &[aria-pressed='true'] {
    color: ${t.colors.bg};
  }
`;

export function PressInteractive() {
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <StateReadout
        entries={[
          { key: 'button.state', value: disabled ? 'disabled' : 'idle (tap to press)' },
          { key: 'rules', value: ':hover · :focus · :focus-visible · :active · :disabled' },
        ]}
        badge={{
          tone: disabled ? 'fail' : 'neutral',
          label: disabled ? 'DISABLED' : 'INTERACTIVE',
        }}
      />
      <Button disabled={disabled} accessibilityRole="button">
        {({ pressed }) => (
          <Label data-pressed={String(pressed)} data-disabled={String(disabled)}>
            Press me
          </Label>
        )}
      </Button>
      <Toggle
        aria-pressed={disabled}
        onPress={() => setDisabled(d => !d)}
        accessibilityRole="button"
        accessibilityState={{ selected: disabled }}
      >
        <ToggleLabel aria-pressed={disabled}>
          {disabled ? 'Tap to enable' : 'Tap to disable'}
        </ToggleLabel>
      </Toggle>
    </>
  );
}
