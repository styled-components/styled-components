'use client';

import Link from 'next/link';
import styled from 'styled-components';

const scenarios = [
  {
    href: '/rsc',
    title: 'RSC Tests',
    desc: 'React Server Component integration: module-level components, cross-boundary specificity, inheritance chains, keyframes, and dynamic props.',
  },
  {
    href: '/client-example',
    title: 'Client Component Tests',
    desc: 'Client-side interactivity: dynamic variants, runtime color changes, attrs() patterns, keyframes, and theme-based styling.',
  },
  {
    href: '/global-style-test',
    title: 'Global Style Lifecycle',
    desc: 'createGlobalStyle persistence across route navigations and conditional mount/unmount behavior.',
  },
];

export function HomeContent() {
  return (
    <Container>
      <Title>styled-components Test Sandbox</Title>
      <Subtitle>
        React 19 + Next.js 16 + styled-components. Each page exercises a specific
        integration scenario with documentation of what failure looks like.
      </Subtitle>

      {scenarios.map(s => (
        <TestCard key={s.href} href={s.href}>
          <TestTitle>{s.title}</TestTitle>
          <Desc>{s.desc}</Desc>
        </TestCard>
      ))}
    </Container>
  );
}

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const Title = styled.h1`
  color: ${p => p.theme.colors.text};
  font-size: 32px;
  margin-bottom: 8px;
  margin-top: 48px;
`;

const Subtitle = styled.p`
  color: ${p => p.theme.colors.text};
  opacity: 0.6;
  font-size: 14px;
  margin-bottom: 32px;
`;

const TestCard = styled(Link)`
  display: block;
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  text-decoration: none;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${p => p.theme.colors.primary};
  }
`;

const TestTitle = styled.span`
  color: ${p => p.theme.colors.primary};
  font-size: 18px;
  font-weight: 700;
`;

const Desc = styled.p`
  color: ${p => p.theme.colors.textMuted};
  font-size: 14px;
  line-height: 1.6;
  margin-top: 8px;
`;

