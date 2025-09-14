import { createElement, StyleSheet } from 'react-native';

const Row = ({ theme = 'light', index = 0, children, ...other }) => {
  const getRowBackground = (theme, isEven) => {
    if (!isEven) return 'transparent';

    if (theme === 'dark') return 'rgba(255, 255, 255, 0.02)';
    if (theme === 'contrast') return 'rgba(255, 255, 255, 0.05)';
    return 'rgba(0, 0, 0, 0.02)';
  };

  const dynamicStyle = {
    backgroundColor: getRowBackground(theme, index % 2 === 1),
  };

  return createElement('div', {
    ...other,
    children,
    style: [styles.row, dynamicStyle],
  });
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
});

export default Row;
