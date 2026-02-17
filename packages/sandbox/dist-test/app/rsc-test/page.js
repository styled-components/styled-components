import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styled from 'styled-components';
// Module-level styled components in an RSC file
// This should NOT trigger "created dynamically" warnings
const Row = styled.div `
  display: flex;
  flex-flow: row wrap;
  padding: 20px;
  gap: 16px;
`;
const Column = styled.div `
  flex: 1;
  min-width: 0;
  padding: 16px;
  background: #f0f0f0;
  border-radius: 8px;

  @media (max-width: 768px) {
    flex-basis: calc(50% - 8px);
  }

  @media (max-width: 480px) {
    flex-basis: 100%;
  }
`;
const SubHeader = styled.h3 `
  display: block;
  margin: 8px 0;
  color: #333;
  font-size: 18px;
`;
const Container = styled.div `
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;
const Title = styled.h1 `
  color: #0070f3;
  font-size: 32px;
  margin-bottom: 24px;
`;
const Description = styled.p `
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
`;
// Pure RSC - no hooks, no interactivity, no 'use client'
export default function RSCTestPage() {
    return (_jsxs(Container, { children: [_jsx(Title, { children: "RSC Dynamic Creation Test" }), _jsx(Description, { children: "This page tests that module-level styled components in React Server Components do not trigger false \"created dynamically\" warnings. Check your build/server console - there should be NO warnings." }), _jsxs(Row, { children: [_jsxs(Column, { children: [_jsx(SubHeader, { children: "Column 1" }), _jsx("p", { children: "This is the first column with styled components defined at module level." })] }), _jsxs(Column, { children: [_jsx(SubHeader, { children: "Column 2" }), _jsx("p", { children: "This is the second column, also using module-level styled components." })] }), _jsxs(Column, { children: [_jsx(SubHeader, { children: "Column 3" }), _jsx("p", { children: "This is the third column, demonstrating RSC compatibility." })] })] }), _jsxs(Row, { children: [_jsxs(Column, { children: [_jsx(SubHeader, { children: "Test Case" }), _jsxs("p", { children: [_jsx("strong", { children: "Expected:" }), " No \"created dynamically\" warnings"] }), _jsxs("p", { children: [_jsx("strong", { children: "Environment:" }), " React Server Component (no 'use client')"] }), _jsxs("p", { children: [_jsx("strong", { children: "Pattern:" }), " Module-level styled component definitions"] })] }), _jsxs(Column, { children: [_jsx(SubHeader, { children: "Why This Works" }), _jsx("p", { children: "styled-components now detects RSC environments and skips the hook-based dynamic creation check, which would produce false positives in server contexts." })] }), _jsxs(Column, { children: [_jsx(SubHeader, { children: "Verification" }), _jsx("p", { children: "Check your terminal/build console for any warnings mentioning component IDs like \"page__Row\" or \"page__Column\". With the fix, you should see none." })] })] })] }));
}
