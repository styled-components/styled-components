'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styled from 'styled-components';
import { InteractiveDemo } from './interactive-demo';
const PageContainer = styled.div `
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
`;
const Title = styled.h1 `
  color: ${props => props.theme.colors.primary};
  font-size: 48px;
  margin-bottom: ${props => props.theme.spacing.large};
  margin-top: 60px;
`;
const Subtitle = styled.p `
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.large};
  margin-bottom: ${props => props.theme.spacing.large};
  opacity: 0.8;
`;
const Grid = styled.div `
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.large};
  margin-bottom: ${props => props.theme.spacing.large};
`;
const Card = styled.div `
  background: ${props => props.theme.colors.background};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: ${props => props.theme.spacing.large};
  margin-bottom: ${props => props.theme.spacing.medium};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
`;
const CardTitle = styled.h2 `
  color: ${props => props.theme.colors.primary};
  font-size: ${props => props.theme.typography.fontSize.large};
  margin-bottom: ${props => props.theme.spacing.medium};
`;
const CardContent = styled.p `
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.medium};
  line-height: 1.6;
`;
const Badge = styled.span `
  display: inline-block;
  background: ${props => props.theme.colors.secondary}40;
  color: ${props => props.theme.colors.secondary};
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 12px;
`;
export function HomeContent() {
    return (_jsxs(PageContainer, { children: [_jsxs(Title, { children: ["styled-components + React 19 + Next.js 16", _jsx(Badge, { children: "v6.3.2" })] }), _jsx(Subtitle, { children: "Demonstrating React Server Components best practices with styled-components" }), _jsxs(Grid, { children: [_jsxs(Card, { children: [_jsx(CardTitle, { children: "React 19 Ready" }), _jsx(CardContent, { children: "Full support for React 19's new features including automatic style hoisting, where style tags are moved to the document head and deduplicated by href." })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Next.js 16 Compatible" }), _jsx(CardContent, { children: "Optimized for Next.js 16's Turbopack bundler with proper RSC integration. Styles are extracted and optimized at build time for maximum performance." })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "TypeScript First" }), _jsx(CardContent, { children: "Full TypeScript support with theme inference, transient props ($prop), and comprehensive type safety for all styled-components APIs." })] })] }), _jsx(InteractiveDemo, {}), _jsxs(Card, { children: [_jsx(CardTitle, { children: "RSC Architecture Best Practices" }), _jsxs("ul", { style: { margin: 0, paddingLeft: '20px', lineHeight: '1.8' }, children: [_jsxs("li", { style: { marginBottom: '8px' }, children: [_jsx("strong", { children: "Client Components for Theming:" }), " ThemeProvider and themed components are client components to enable dynamic theme switching"] }), _jsxs("li", { style: { marginBottom: '8px' }, children: [_jsx("strong", { children: "Server Components for Static Content:" }), " Use server components for static pages and data fetching when theming isn't needed"] }), _jsxs("li", { style: { marginBottom: '8px' }, children: [_jsx("strong", { children: "Automatic Style Hoisting:" }), " React 19 automatically moves style tags to the head with precedence and deduplication"] }), _jsxs("li", { style: { marginBottom: '8px' }, children: [_jsx("strong", { children: "Zero Layout Shift:" }), " Styles are injected during SSR ensuring no flash of unstyled content"] }), _jsxs("li", { children: [_jsx("strong", { children: "Optimal Bundle Size:" }), " Only interactive components ship JavaScript to the client"] })] })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Try It Out" }), _jsx(CardContent, { children: "Use the theme toggle button in the top-right to switch between light and dark modes." })] }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Test Pages" }), _jsxs("ul", { style: { margin: 0, paddingLeft: '20px', lineHeight: '2.2' }, children: [_jsxs("li", { children: [_jsx("a", { href: "/client-example", children: "/client-example" }), " \u2014 Client-side testing features"] }), _jsxs("li", { children: [_jsx("a", { href: "/rsc-test", children: "/rsc-test" }), " \u2014 RSC dynamic creation test"] }), _jsxs("li", { children: [_jsx("a", { href: "/global-style-test", children: "/global-style-test" }), " \u2014 Global style unmount + navigation persistence (#5649)"] })] })] })] }));
}
