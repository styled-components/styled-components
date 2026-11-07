import styled from 'styled-components';
import theme from '../lib/theme';
import { ViewTransitionsHarness } from './harness';

export default function ViewTransitionsPage() {
  return (
    <Page>
      <Header>
        <H1>View transitions: target a component directly</H1>
        <Lede>
          A component that sets <Code>view-transition-name</Code> gets its own class as{' '}
          <Code>view-transition-class</Code>. A <Code>createGlobalStyle</Code> rule can then write{' '}
          <Code>::view-transition-group(*${'{Card}'})</Code> to style the transition of every Card,
          with no hand-made class or name.
        </Lede>
      </Header>
      <ViewTransitionsHarness />
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
