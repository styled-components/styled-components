import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function PageA() {
    return (_jsxs("div", { style: {
            background: 'rgba(233, 69, 96, 0.1)',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid rgba(233, 69, 96, 0.3)',
        }, children: [_jsx("h2", { children: "Page A" }), _jsxs("p", { style: { lineHeight: 1.8 }, children: ["You navigated here via client-side routing. The dark gradient background and serif font from the layout's ", _jsx("code", { children: "createGlobalStyle" }), " should still be active."] }), _jsx("p", { style: { lineHeight: 1.8, opacity: 0.7 }, children: "If you see a plain white background or sans-serif font, the layout's global style was incorrectly removed during navigation." })] }));
}
