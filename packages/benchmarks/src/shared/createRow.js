// Factory function to create Row component with any styled function
export default function createRow(styled, View) {
  const Row = styled(View)`
    flex-direction: row;
    align-items: center;
    margin: 2px 0;

    &:nth-child(even) {
      background-color: ${props => {
        if (props.theme === 'dark') return 'rgba(255, 255, 255, 0.02)';
        if (props.theme === 'contrast') return 'rgba(255, 255, 255, 0.05)';
        return 'rgba(0, 0, 0, 0.02)';
      }};
    }

    &:hover {
      background-color: ${props => {
        if (props.theme === 'dark') return 'rgba(255, 255, 255, 0.05)';
        if (props.theme === 'contrast') return 'rgba(255, 255, 255, 0.1)';
        return 'rgba(0, 0, 0, 0.05)';
      }};
    }
  `;

  Row.defaultProps = {
    'data-testid': 'row',
    theme: 'light',
    index: 0,
  };

  return Row;
}
