import { Suspense } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Demo, HintText, Section, SectionDesc } from '../components/test-ui';
import theme from '../lib/theme';

/**
 * Repro for the createGlobalStyle analog of #5808: a request-scoped dedup
 * ledger recorded a global style's key the first time it rendered inside a
 * request. A Suspense fallback renders before the resolved content, so the
 * fallback instance won the ledger and the resolved instance emitted
 * nothing; React then discards the fallback (tag and all) on reveal,
 * leaving the page with no global styles at all. With synchronous content
 * the fallback is never even in the HTML, so the global went missing with
 * JavaScript off too. Per-instance emission (no ledger) fixes both: every
 * instance carries its own tag, so the marker below stays dashed regardless
 * of which instance the browser keeps.
 */

const MarkerGlobalStyle = createGlobalStyle`
  [data-testid$="-marker"] {
    border-style: dashed !important;
  }
`;

function SyncContent() {
  return (
    <>
      <MarkerGlobalStyle />
      <Marker data-testid="sync-resolved-marker">
        Resolved content (synchronous). Its global style must apply even though the fallback above
        rendered the identical global first.
      </Marker>
    </>
  );
}

async function AsyncContent() {
  await new Promise(resolve => setTimeout(resolve, 50));
  return (
    <>
      <MarkerGlobalStyle />
      <Marker data-testid="async-resolved-marker">
        Resolved content (async). Its global style must apply after streaming in behind the fallback
        below.
      </Marker>
    </>
  );
}

export default function SuspenseGlobalsPage() {
  return (
    <Wrapper>
      <Heading>Suspense global style per-instance emission</Heading>
      <SectionDesc>
        Each block below renders the same <Code>createGlobalStyle</Code> once in a Suspense fallback
        and once in the resolved content. With per-instance emission both markers stay dashed; a
        regression to request-wide dedup drops the border on the resolved marker (or on both, once
        the fallback is discarded on reveal).
      </SectionDesc>

      <Section>
        <SectionDesc>Fallback + synchronous content</SectionDesc>
        <HintText>
          The content below never suspends, so a real server exercises the ordering between a
          fallback prop and its children rather than an actual streaming delay.
        </HintText>
        <Demo>
          <Suspense
            fallback={
              <>
                <MarkerGlobalStyle />
                <Marker data-testid="sync-fallback-marker">Loading… (fallback)</Marker>
              </>
            }
          >
            <SyncContent />
          </Suspense>
        </Demo>
      </Section>

      <Section>
        <SectionDesc>Fallback + async content</SectionDesc>
        <HintText>
          The content below awaits before resolving, so a real server actually streams the fallback
          first and swaps it for the resolved content.
        </HintText>
        <Demo>
          <Suspense
            fallback={
              <>
                <MarkerGlobalStyle />
                <Marker data-testid="async-fallback-marker">Loading… (fallback)</Marker>
              </>
            }
          >
            <AsyncContent />
          </Suspense>
        </Demo>
      </Section>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const Heading = styled.h1`
  font-size: 24px;
  color: ${theme.colors.text};
  margin-bottom: 8px;
`;

const Code = styled.code`
  font-family: monospace;
  background: ${theme.colors.surface};
  padding: 2px 4px;
  border-radius: 4px;
`;

/** Styled by MarkerGlobalStyle's `[data-testid$="-marker"]` selector when its rule reaches the DOM. */
const Marker = styled.div`
  padding: 16px;
  border: 2px solid ${theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  color: ${theme.colors.text};
`;
