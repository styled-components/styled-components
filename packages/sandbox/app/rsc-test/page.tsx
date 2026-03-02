import styled, { css } from 'styled-components';

// Module-level styled components in an RSC file
// This should NOT trigger "created dynamically" warnings
const Row = styled.div`
  display: flex;
  flex-flow: row wrap;
  padding: 20px;
  gap: 16px;
`;

const Column = styled.div`
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

const SubHeader = styled.h3`
  display: block;
  margin: 8px 0;
  color: #333;
  font-size: 18px;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Title = styled.h1`
  color: #0070f3;
  font-size: 32px;
  margin-bottom: 24px;
`;

const Description = styled.p`
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
`;

// Pure RSC - no hooks, no interactivity, no 'use client'
export default function RSCTestPage() {
  return (
    <Container>
      <Title>RSC Dynamic Creation Test</Title>
      <Description>
        This page tests that module-level styled components in React Server Components do not
        trigger false "created dynamically" warnings. Check your build/server console - there
        should be NO warnings.
      </Description>

      <Row>
        <Column>
          <SubHeader>Column 1</SubHeader>
          <p>This is the first column with styled components defined at module level.</p>
        </Column>
        <Column>
          <SubHeader>Column 2</SubHeader>
          <p>This is the second column, also using module-level styled components.</p>
        </Column>
        <Column>
          <SubHeader>Column 3</SubHeader>
          <p>This is the third column, demonstrating RSC compatibility.</p>
        </Column>
      </Row>

      <Row>
        <Column>
          <SubHeader>Test Case</SubHeader>
          <p>
            <strong>Expected:</strong> No "created dynamically" warnings
          </p>
          <p>
            <strong>Environment:</strong> React Server Component (no 'use client')
          </p>
          <p>
            <strong>Pattern:</strong> Module-level styled component definitions
          </p>
        </Column>
        <Column>
          <SubHeader>Why This Works</SubHeader>
          <p>
            styled-components now detects RSC environments and skips the hook-based dynamic creation
            check, which would produce false positives in server contexts.
          </p>
        </Column>
        <Column>
          <SubHeader>Verification</SubHeader>
          <p>
            Check your terminal/build console for any warnings mentioning component IDs like
            "page__Row" or "page__Column". With the fix, you should see none.
          </p>
        </Column>
      </Row>
    </Container>
  );
}
