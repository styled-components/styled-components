import styled from 'styled-components';
import theme from '../lib/theme';
import { ContainerQueriesHarness } from './harness';

export default function ContainerQueriesPage() {
  return (
    <Page>
      <Header>
        <H1>Container queries — zero coordination</H1>
        <Lede>
          Declare <Code>container-type: size</Code> on a component. styled-components auto-names
          the container with the styled-component&apos;s id, so descendants can use{' '}
          <Code>cqh</Code> / <Code>cqw</Code> units, anonymous <Code>@container (…)</Code>{' '}
          queries, or cross-component <Code>@container ${'{Card}'} (…)</Code> queries — without
          ever writing a <Code>container-name</Code>.
        </Lede>
      </Header>
      <ContainerQueriesHarness />
    </Page>
  );
}

const Page = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const H1 = styled.h1`
  font-size: 28px;
  margin: 0;
  letter-spacing: -0.02em;
`;

const Lede = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--sc-colors-textMuted);
  max-width: 60ch;
`;

const Code = styled.code`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 0.92em;
  background: var(--sc-colors-surface);
  border: 1px solid var(--sc-colors-border);
  padding: 1px 6px;
  border-radius: 4px;
`;
