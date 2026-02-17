'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function ToggleClient({ children }) {
    const [show, setShow] = useState(false);
    return (_jsxs("div", { children: [_jsx("button", { onClick: () => setShow(v => !v), style: {
                    padding: '12px 24px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    background: show ? '#e94560' : '#2a4a6b',
                    color: '#fff',
                    border: show ? '1px solid #e94560' : '1px solid #3a6a9b',
                    borderRadius: '8px',
                    marginBottom: '16px',
                }, children: show ? 'Remove conditional style' : 'Add conditional style' }), show && children, _jsxs("p", { style: { marginTop: '16px', opacity: 0.7 }, children: [_jsx("strong", { children: "Status:" }), " Conditional global style is", ' ', _jsx("span", { style: { color: show ? '#e94560' : '#2ecc71', fontWeight: 700 }, children: show ? 'MOUNTED' : 'UNMOUNTED' }), ". Inspect ", _jsx("code", { children: "<head>" }), " for the", ' ', _jsx("code", { children: "data-styled-global" }), " style tag."] })] }));
}
