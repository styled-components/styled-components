import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createGlobalStyle } from 'styled-components';
import ToggleClient from './toggle-client';
/**
 * Conditional global style — should be removed from <head> when unmounted.
 */
const BodyLockStyles = createGlobalStyle `
  body {
    overflow: hidden !important;
    outline: 6px solid #e94560 !important;
    outline-offset: -6px;
  }
`;
export default function GlobalStyleTestPage() {
    return (_jsxs("div", { style: {
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.1)',
        }, children: [_jsx("h2", { children: "Conditional Unmount" }), _jsxs("p", { style: { lineHeight: 1.8, marginBottom: '16px' }, children: ["Toggle to mount/unmount a ", _jsx("code", { children: "createGlobalStyle" }), " that adds a thick pink border to the viewport and locks scrolling. The", ' ', _jsx("code", { children: "<style>" }), " tag should appear in ", _jsx("code", { children: "<head>" }), ' ', "when mounted and disappear when unmounted."] }), _jsx(ToggleClient, { children: _jsx(BodyLockStyles, {}) })] }));
}
