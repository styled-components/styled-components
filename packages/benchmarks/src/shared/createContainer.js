// Factory function to create Container component with any styled function
export default function createContainer(styled, View) {
  const getContainerBackground = theme => {
    switch (theme) {
      case 'dark':
        return 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)';
      case 'contrast':
        return 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)';
      case 'light':
      default:
        return 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
    }
  };

  const Container = styled(View)`
    width: 100%;
    max-width: 1200px;
    max-height: 800px;
    overflow: auto;
    padding: 16px;
    border-radius: 8px;
    background: ${props => getContainerBackground(props.theme)};
    border: 1px solid
      ${props => {
        if (props.theme === 'dark') return '#374151';
        if (props.theme === 'contrast') return '#6b7280';
        return '#e5e7eb';
      }};
    box-shadow: ${props => {
      if (props.theme === 'dark') return '0 10px 25px rgba(0, 0, 0, 0.5)';
      if (props.theme === 'contrast') return '0 10px 25px rgba(0, 0, 0, 0.7)';
      return '0 10px 25px rgba(0, 0, 0, 0.1)';
    }};

    opacity: ${props => (props.isPending ? 0.8 : 1)};
    transition: opacity 0.3s ease;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      background: ${props => (props.theme === 'light' ? '#f1f5f9' : '#374151')};
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: ${props => (props.theme === 'light' ? '#cbd5e1' : '#6b7280')};
      border-radius: 4px;

      &:hover {
        background: ${props => (props.theme === 'light' ? '#94a3b8' : '#9ca3af')};
      }
    }

    /* Loading state overlay */
    ${props =>
      props.isPending &&
      `
      position: relative;
      
      &::before {
        content: 'Updating...';
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 8px;
        background: ${props.theme === 'light' ? '#3b82f6' : '#60a5fa'};
        color: white;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        z-index: 10;
      }
    `}
  `;

  Container.defaultProps = {
    theme: 'light',
    isPending: false,
  };

  return Container;
}
