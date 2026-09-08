import { Suspense } from 'react';
import styled from 'styled-components';
import { SectionDesc } from '../components/test-ui';
import theme from '../lib/theme';

/**
 * Repro for #5808: an inline <style> tag emitted while rendering a Suspense
 * fallback is deduped away when the resolved content renders the same styled
 * component, then React discards the fallback subtree (and its <style>),
 * leaving the resolved element with a class but no matching rule.
 *
 * SharedPanel appears ONLY inside the Suspense subtree, in both the fallback
 * and the resolved child, so the fallback is the first (and only) emitter of
 * its rule. AlwaysPanel lives in the static shell as a control: its styling
 * must survive, proving the pipeline itself works.
 */

async function SlowContent() {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return (
    <SharedPanel data-testid="resolved-panel">
      Resolved content. This panel must stay crimson after the fallback swaps
      out. If it renders unstyled (white), #5808 has regressed: its rule reached
      the DOM only inside the discarded fallback.
    </SharedPanel>
  );
}

export default function Suspense5808Page() {
  return (
    <Wrapper>
      <Heading>#5808 Suspense inline &lt;style&gt; removal</Heading>

      <SectionDesc>
        The blue control panel lives in the static shell and proves the pipeline works. The panel
        below streams in behind Suspense and is the actual test: it must be crimson once it replaces
        the fallback. A white (unstyled) panel means #5808 has regressed.
      </SectionDesc>

      <AlwaysPanel data-testid="control-panel">
        Control panel (static shell). Always blue.
      </AlwaysPanel>

      <Suspense
        fallback={
          <SharedPanel data-testid="fallback-panel">Loading… (fallback, crimson)</SharedPanel>
        }
      >
        <SlowContent />
      </Suspense>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Heading = styled.h1`
  font-size: 24px;
  color: ${theme.colors.text};
`;

/** Rendered in the static shell; emits its own rule that is never discarded. */
const AlwaysPanel = styled.div`
  padding: 24px;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  background-color: rgb(37, 99, 235);
`;

/** Rendered ONLY inside the Suspense subtree (fallback + resolved child). */
const SharedPanel = styled.div`
  padding: 24px;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  background-color: rgb(220, 20, 60);
`;
