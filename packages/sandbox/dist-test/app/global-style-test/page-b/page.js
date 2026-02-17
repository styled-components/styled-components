import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function PageB() {
    return (_jsxs("div", { style: {
            background: 'rgba(15, 52, 96, 0.3)',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.15)',
        }, children: [_jsx("h2", { children: "Page B" }), _jsx("p", { style: { lineHeight: 1.8 }, children: "Another route under the same layout. The dark gradient and serif font should still be visible \u2014 try navigating rapidly between all three tabs." }), _jsxs("p", { style: { lineHeight: 1.8, opacity: 0.7 }, children: ["The layout's ", _jsx("code", { children: "createGlobalStyle" }), " stays mounted because Next.js preserves layouts across child route navigations."] })] }));
}
