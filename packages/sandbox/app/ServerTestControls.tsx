'use client';

import styled from 'styled-components';
import { themes, type ThemePreset } from './lib/test-themes';

const ControlPanel = styled.div`
  background: white;
  border: 2px solid #333;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ControlLabel = styled.label`
  color: #333;
  font-size: 14px;
  font-weight: 600;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 14px;
  cursor: pointer;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 14px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  font-size: 14px;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

interface ServerTestControlsProps {
  onThemeChange: (theme: ThemePreset) => void;
  onVariantChange: (variant: 'default' | 'active' | 'disabled' | 'error') => void;
  onColorChange: (color: string) => void;
  onGlobalStyleChange: (enabled: boolean) => void;
  currentTheme: ThemePreset;
  currentVariant: 'default' | 'active' | 'disabled' | 'error';
  currentColor: string;
  currentGlobalStyleEnabled: boolean;
}

export function ServerTestControls({
  onThemeChange,
  onVariantChange,
  onColorChange,
  onGlobalStyleChange,
  currentTheme,
  currentVariant,
  currentColor,
  currentGlobalStyleEnabled,
}: ServerTestControlsProps) {
  const theme = themes[currentTheme];

  return (
    <ControlPanel>
      <ControlGroup>
        <ControlLabel>Theme Preset</ControlLabel>
        <Select value={currentTheme} onChange={e => onThemeChange(e.target.value as ThemePreset)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </ControlGroup>

      <ControlGroup>
        <CheckboxLabel>
          <Checkbox type="checkbox" checked={currentGlobalStyleEnabled} onChange={e => onGlobalStyleChange(e.target.checked)} />
          Enable Global Style
        </CheckboxLabel>
      </ControlGroup>

      <ControlGroup>
        <ControlLabel>Component Variant</ControlLabel>
        <Select value={currentVariant} onChange={e => onVariantChange(e.target.value as typeof currentVariant)}>
          <option value="default">Default</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="error">Error</option>
        </Select>
      </ControlGroup>

      <ControlGroup>
        <ControlLabel>Runtime Color</ControlLabel>
        <Input type="color" value={currentColor} onChange={e => onColorChange(e.target.value)} />
      </ControlGroup>
    </ControlPanel>
  );
}
