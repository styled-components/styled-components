import styled from 'styled-components';
import theme from './lib/theme';

export default function HomePage() {
  return (
    <div>
      <Title>styled-components Sandbox</Title>
      <Subtitle>
        React 19 + Next.js 16 + styled-components. Select a test from the sidebar.
      </Subtitle>
    </div>
  );
}

const Title = styled.h1`
  font-size: ${theme.typography.fontSize.large};
  color: ${theme.colors.text};
  margin: 0 0 8px;
`;

const Subtitle = styled.p`
  font-size: ${theme.typography.fontSize.small};
  color: ${theme.colors.textMuted};
  margin: 0;
`;
