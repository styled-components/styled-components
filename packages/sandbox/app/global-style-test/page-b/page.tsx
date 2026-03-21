import styled from 'styled-components';
import { HintText } from '../../components/test-ui';

export default function PageB() {
  return (
    <Card>
      <h2>Page B</h2>
      <Text>
        Another route under the same layout. Try navigating rapidly between
        all three tabs &mdash; the gradient and top border should never flicker
        or disappear.
      </Text>
      <HintText>
        If broken: styles flash or disappear during rapid navigation. The
        layout&apos;s <code>createGlobalStyle</code> should stay mounted across
        all child route transitions.
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

const Text = styled.p`
  line-height: 1.7;
  margin-bottom: 16px;
  color: var(--sc-colors-textMuted, #6b7280);
  font-size: 14px;
`;

