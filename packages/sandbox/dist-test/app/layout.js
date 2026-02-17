import { jsx as _jsx } from "react/jsx-runtime";
import StyledComponentsRegistry from './lib/registry';
export const metadata = {
    title: 'styled-components RSC Test',
    description: 'Testing styled-components with React Server Components and Next.js 16',
    generator: 'Next.js',
    applicationName: 'styled-components Sandbox',
};
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
    ],
};
export default function RootLayout({ children }) {
    return (_jsx("html", { lang: "en", suppressHydrationWarning: true, children: _jsx("body", { suppressHydrationWarning: true, children: _jsx(StyledComponentsRegistry, { children: children }) }) }));
}
