import React from 'react';
import View from './View';

const Row = ({ theme = 'light', index = 0, style, ...other }) => {
  const getRowBackground = (theme, isEven) => {
    if (!isEven) return 'transparent';

    if (theme === 'dark') return 'rgba(255, 255, 255, 0.02)';
    if (theme === 'contrast') return 'rgba(255, 255, 255, 0.05)';
    return 'rgba(0, 0, 0, 0.02)';
  };

  const getRowHoverBackground = theme => {
    if (theme === 'dark') return 'rgba(255, 255, 255, 0.05)';
    if (theme === 'contrast') return 'rgba(255, 255, 255, 0.1)';
    return 'rgba(0, 0, 0, 0.05)';
  };

  const rowStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    margin: '2px 0',
    backgroundColor: getRowBackground(theme, index % 2 === 1),
  };

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <View
      {...other}
      style={{
        ...rowStyle,
        ...(isHovered ? { backgroundColor: getRowHoverBackground(theme) } : {}),
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
};

export default Row;
