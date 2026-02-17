'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
const fadeIn = keyframes `
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;
const Container = styled.div `
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  animation: ${fadeIn} 0.3s ease-out;
`;
const Title = styled.h1 `
  color: ${props => props.theme.colors.primary};
  font-size: 48px;
  margin-bottom: 24px;
  margin-top: 60px;
`;
const Subtitle = styled.p `
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.large};
  margin-bottom: ${props => props.theme.spacing.large};
  opacity: 0.8;
`;
const ControlPanel = styled.div `
  background: ${props => props.theme.colors.background};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;
const ControlGroup = styled.div `
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const ControlLabel = styled.label `
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.small};
  font-weight: 600;
`;
const Select = styled.select `
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 6px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.small};
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.secondary};
  }
`;
const Input = styled.input `
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 6px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.small};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.secondary};
  }
`;
const TestArea = styled.div `
  background: ${props => props.theme.colors.background};
  border-radius: 12px;
  padding: 24px;
  border: 1px solid ${props => props.theme.colors.primary}20;
  margin-bottom: 20px;
`;
const TestCard = styled.div `
  ${props => {
    const baseStyles = css `
      border-radius: 8px;
      padding: ${props.theme.spacing.medium};
      margin-bottom: ${props.theme.spacing.medium};
      transition: all 0.2s;
      cursor: ${props.$variant === 'disabled' ? 'not-allowed' : 'pointer'};
      opacity: ${props.$variant === 'disabled' ? 0.5 : 1};
    `;
    const variantStyles = {
        default: css `
        background: ${props.theme.colors.background};
        border: 2px solid ${props.theme.colors.primary};
      `,
        active: css `
        background: ${props.theme.colors.primary};
        border: 2px solid ${props.theme.colors.primary};
        color: ${props.theme.colors.background};
      `,
        disabled: css `
        background: ${props.theme.colors.background};
        border: 2px solid ${props.theme.colors.secondary};
      `,
        error: css `
        background: ${props.theme.colors.accent || '#ff0000'};
        border: 2px solid ${props.theme.colors.accent || '#ff0000'};
        color: ${props.theme.colors.background};
      `,
    };
    return css `
      ${baseStyles}
      ${variantStyles[props.$variant]}
    `;
}}

  &:hover {
    ${props => props.$variant !== 'disabled' && css `
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    `}
  }
`;
const TestText = styled.p `
  color: ${props => props.$customColor || props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.medium};
  line-height: 1.6;
  margin-bottom: 16px;
`;
const Badge = styled.span `
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 12px;
  
  ${props => {
    const styles = {
        info: css `
        background: ${props.theme.colors.secondary}40;
        color: ${props.theme.colors.secondary};
      `,
        success: css `
        background: #00c85340;
        color: #00c853;
      `,
        warning: css `
        background: ${props.theme.colors.accent}40;
        color: ${props.theme.colors.accent};
      `,
    };
    return styles[props.$type];
}}
`;
const Image = (props) => _jsx("img", { ...props });
// Reproduction 1: attrs callback returning a prop from the wrapped component
const StyledImage = styled(Image).attrs((p) => ({
    draggable: p.draggable ?? false,
})) ``;
// Reproduction 2: spreading props through attrs
const StyledImage2 = styled(Image).attrs((p) => ({
    ...p,
    draggable: p.draggable ?? false,
})) ``;
// Reproduction 3: attrs returning style directly (should still work)
const StyledImage3 = styled(Image).attrs(() => ({
    style: { color: 'red' },
})) ``;
// Reproduction 4: attrs returning style with CSS variables
const StyledImage4 = styled(Image).attrs(() => ({
    style: { '--custom': 'value', color: 'red' },
})) ``;
// Reproduction 5: simple HTML element with attrs returning style from props
const StyledDiv = styled.div.attrs(p => ({
    style: {
        ...p.style,
        transform: `scale(${p.$scale ?? 1})`,
    },
})) ``;
export function ClientTestingHarness() {
    const [variant, setVariant] = useState('default');
    const [customColor, setCustomColor] = useState('#ff6b9d');
    return (_jsxs(Container, { children: [_jsxs(Title, { children: ["Client Component Testing", _jsx(Badge, { "$type": "warning", children: "Interactive" })] }), _jsx(Subtitle, { children: "Full client-side interactivity with dynamic styling and state management" }), _jsxs(ControlPanel, { children: [_jsxs(ControlGroup, { children: [_jsx(ControlLabel, { children: "Component Variant" }), _jsxs(Select, { value: variant, onChange: e => setVariant(e.target.value), children: [_jsx("option", { value: "default", children: "Default" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "disabled", children: "Disabled" }), _jsx("option", { value: "error", children: "Error" })] })] }), _jsxs(ControlGroup, { children: [_jsx(ControlLabel, { children: "Custom Color" }), _jsx(Input, { type: "color", value: customColor, onChange: e => setCustomColor(e.target.value) })] })] }), _jsxs(TestArea, { children: [_jsx("h2", { style: { marginBottom: '24px' }, children: "Dynamic Components" }), _jsx(TestCard, { "$variant": variant, children: _jsxs(TestText, { children: [_jsxs("strong", { children: ["Variant Test Card (", variant, ")"] }), _jsx("br", {}), "This card demonstrates conditional styling based on the selected variant. The styles are computed dynamically on every state change."] }) }), _jsxs(TestText, { "$customColor": customColor, children: [_jsx("strong", { children: "Runtime Color Test" }), _jsx("br", {}), "This text color updates in real-time as you adjust the color picker. Current value: ", _jsx("code", { children: customColor })] }), _jsxs(TestText, { children: [_jsx("strong", { children: "Theme-Based Styling" }), _jsx("br", {}), "This text uses values from the theme context. Try switching between light and dark mode using the button in the top-right corner to see the theme update."] })] }), _jsxs(TestArea, { children: [_jsxs("h2", { style: { marginBottom: '16px' }, children: ["React 19 + styled-components Features", _jsx(Badge, { "$type": "success", children: "New" })] }), _jsxs("ul", { style: { paddingLeft: '20px', lineHeight: '1.8' }, children: [_jsx("li", { children: "Automatic style deduplication and hoisting" }), _jsx("li", { children: "Client-side hydration with zero layout shift" }), _jsx("li", { children: "Transient props ($prop) prevent DOM attribute warnings" }), _jsx("li", { children: "CSS helper for composable style fragments" }), _jsx("li", { children: "Keyframe animations with automatic name generation" }), _jsx("li", { children: "TypeScript support with theme inference" })] })] })] }));
}
