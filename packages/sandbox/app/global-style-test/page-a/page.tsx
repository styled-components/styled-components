import styled from 'styled-components';
import { HintText } from '../../components/test-ui';

export default function PageA() {
  return (
    <Card>
      <h2>Page A</h2>
      <Text>
        Navigated here via client-side routing. The gradient background and
        rainbow top border from the layout&apos;s <code>createGlobalStyle</code>{' '}
        should still be active.
      </Text>
      <HintText>
        If broken: gradient or top border disappear — the layout&apos;s global
        style was removed during navigation.
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

