import { createElement, StyleSheet } from 'react-native';
import {
  getPriorityAccent,
  getSizeScale,
  getStateColor,
  getTextColor,
} from '../../shared/createCell';

const Cell = ({
  state = 'idle',
  theme = 'light',
  isPending = false,
  intensity = 1,
  size = 'medium',
  priority = 'low',
  children,
  ...other
}) => {
  const sizeScale = getSizeScale(size);

  // Calculate dynamic styles
  const dynamicStyle = {
    minWidth: 50 * sizeScale,
    minHeight: 35 * sizeScale,
    padding: 6 * sizeScale,
    borderRadius: 4 * sizeScale,
    backgroundColor: getStateColor(state, theme, intensity),
    borderColor: getPriorityAccent(priority, intensity),
    fontSize: 11 * sizeScale,
    fontWeight: (() => {
      if (priority === 'critical') return 'bold';
      if (state === 'success' || priority === 'high') return '600';
      return 'normal';
    })(),
    opacity: isPending ? 0.6 : 0.9 + intensity * 0.1,
    transform: [
      {
        scale: (() => {
          let baseScale = sizeScale;
          if (state === 'loading') baseScale *= 1.05;
          if (priority === 'critical') baseScale *= 1.1;
          if (state === 'error') baseScale *= 1.08;
          return baseScale;
        })(),
      },
      {
        rotate: (() => {
          if (state === 'error') return `${intensity * 2 - 1}deg`;
          if (priority === 'critical') return `${intensity * 1.5 - 0.75}deg`;
          return '0deg';
        })(),
      },
    ],
  };

  return createElement('div', {
    ...other,
    children,
    style: [styles.cell, dynamicStyle, { color: getTextColor(state, theme, intensity) }],
  });
};

const styles = StyleSheet.create({
  cell: {
    margin: 2,
    borderWidth: 3,
    borderStyle: 'solid',
    position: 'relative',
    cursor: 'pointer',
  },
});

export default Cell;
