import styled, { createGlobalStyle } from 'styled-components';
import BackLink from '../components/back-link';
import AutopilotClient from './autopilot-client';
import { GlobalStyleChecks } from './global-style-checks';
import NavClient from './nav-client';

/**
 * Persistent global style living in a shared layout.
 * Should remain applied while navigating between child routes.
 * Uses a subtle stripe pattern and border — works in both light and dark mode
 * without overriding theme colors.
 */
const LayoutGlobalStyle = createGlobalStyle`
  body {
    min-height: 100vh;
    background-image: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.18) 0%,
      rgba(168, 85, 247, 0.15) 35%,
      rgba(236, 72, 153, 0.15) 65%,
      rgba(251, 146, 60, 0.12) 100%
    ) !important;
    background-attachment: fixed !important;
    transition: background 0.5s ease !important;
  }
`;

export default function GlobalStyleTestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LayoutGlobalStyle />
      <Wrapper>
        <BackLink />
        <PageTitle>Global Style Lifecycle Tests</PageTitle>
        <Desc>
          The colorful gradient background comes from a{' '}
          <code>createGlobalStyle</code> in this shared layout.
        </Desc>
        <GlobalStyleChecks />
        <NavClient />
        <AutopilotClient />
        {children}
      </Wrapper>
    </>
  );
}

const Wrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const PageTitle = styled.h1`
  margin-bottom: 8px;
  color: var(--sc-colors-text, #111827);
`;

const Desc = styled.p`
  margin-bottom: 8px;
  color: var(--sc-colors-textMuted, #6b7280);
`;

