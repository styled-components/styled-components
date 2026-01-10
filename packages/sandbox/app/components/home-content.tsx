'use client';

import styled from 'styled-components';
import { InteractiveDemo } from './interactive-demo';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.large};
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.primary};
  font-size: 48px;
  margin-bottom: ${props => props.theme.spacing.large};
  margin-top: 60px;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.large};
  margin-bottom: ${props => props.theme.spacing.large};
  opacity: 0.8;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.large};
  margin-bottom: ${props => props.theme.spacing.large};
`;

const Card = styled.div`
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

const CardTitle = styled.h2`
  color: ${props => props.theme.colors.primary};
  font-size: ${props => props.theme.typography.fontSize.large};
  margin-bottom: ${props => props.theme.spacing.medium};
`;

const CardContent = styled.p`
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.medium};
  line-height: 1.6;
`;

const Badge = styled.span`
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
  return (
    <PageContainer>
      <Title>
        styled-components + React 19 + Next.js 16
        <Badge>v6.3.2</Badge>
      </Title>
      <Subtitle>
        Demonstrating React Server Components best practices with styled-components
      </Subtitle>

      <Grid>
        <Card>
          <CardTitle>React 19 Ready</CardTitle>
          <CardContent>
            Full support for React 19's new features including automatic style hoisting,
            where style tags are moved to the document head and deduplicated by href.
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Next.js 16 Compatible</CardTitle>
          <CardContent>
            Optimized for Next.js 16's Turbopack bundler with proper RSC integration.
            Styles are extracted and optimized at build time for maximum performance.
          </CardContent>
        </Card>

        <Card>
          <CardTitle>TypeScript First</CardTitle>
          <CardContent>
            Full TypeScript support with theme inference, transient props ($prop),
            and comprehensive type safety for all styled-components APIs.
          </CardContent>
        </Card>
      </Grid>

      <InteractiveDemo />

      <Card>
        <CardTitle>RSC Architecture Best Practices</CardTitle>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Client Components for Theming:</strong> ThemeProvider and themed components
            are client components to enable dynamic theme switching
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Server Components for Static Content:</strong> Use server components for
            static pages and data fetching when theming isn't needed
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Automatic Style Hoisting:</strong> React 19 automatically moves style tags
            to the head with precedence and deduplication
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Zero Layout Shift:</strong> Styles are injected during SSR ensuring no
            flash of unstyled content
          </li>
          <li>
            <strong>Optimal Bundle Size:</strong> Only interactive components ship JavaScript
            to the client
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle>Try It Out</CardTitle>
        <CardContent>
          Use the theme toggle button in the top-right to switch between light and dark modes.
          Visit <code>/client-example</code> for advanced client-side testing features.
        </CardContent>
      </Card>
    </PageContainer>
  );
}
