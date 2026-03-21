import styled from 'styled-components';
import { HintText } from '../components/test-ui';

export default function GlobalStyleTestPage() {
  return (
    <Card>
      <Heading>Test: Layout persistence</Heading>
      <Text>
        Navigate between the tabs above. The gradient background and rainbow
        top border should remain applied on every page because the{' '}
        <code>createGlobalStyle</code> lives in the shared layout.
      </Text>
      <SubHeading>Test: Conditional mount/unmount</SubHeading>
      <Text>
        Use the toggle above to mount a conditional <code>createGlobalStyle</code>{' '}
        that adds a red border and locks scrolling. Toggle it off &mdash; the
        border and scroll lock should disappear immediately.
      </Text>
      <HintText>
        If broken: the gradient/border disappear when navigating, or the red
        outline persists after toggling off.
      </HintText>
    </Card>
  );
}

const Card = styled.div`
  background: var(--sc-colors-surface, #f9fafb);
  border-radius: 10px;
  padding: 24px;
  border: 1px solid var(--sc-colors-border, #e5e7eb);
`;

const Heading = styled.h2`
  font-size: 18px;
  margin-bottom: 8px;
`;

const SubHeading = styled.h3`
  font-size: 16px;
  margin-bottom: 8px;
`;

const Text = styled.p`
  line-height: 1.7;
  margin-bottom: 16px;
  color: var(--sc-colors-textMuted, #6b7280);
  font-size: 14px;
`;

