import classnames from 'classnames';
import React from 'react';
import {
  computeHeavyValues,
  getPriorityAccent,
  getSizeScale,
  getStateColor,
  getTextColor,
} from '../../shared/createCell';
import styles from './cell-styles.css';
import View from './View';

const Cell = ({
  state = 'idle',
  theme = 'light',
  isPending = false,
  intensity = 1,
  size = 'medium',
  priority = 'low',
  suspend = false,
  rowIndex = 0,
  abortSignal = null,
  ...other
}) => {
  if (suspend) {
    throw new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => resolve(null), 50 * (rowIndex % 5) || 50);

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Cell suspend aborted'));
        });
      }
    });
  }

  const sizeScale = getSizeScale(size);

  // Heavy computation here for css-modules
  const heavyValues = computeHeavyValues(other);

  const dynamicStyles = {
    backgroundColor: getStateColor(state, theme, intensity),
    color: getTextColor(state, theme, intensity),
    borderColor: heavyValues.$borderColor || getPriorityAccent(priority, intensity),
    minWidth: 50 * sizeScale,
    minHeight: 35 * sizeScale,
    padding: 6 * sizeScale,
    fontSize: 11 * sizeScale,
    borderRadius: 4 * sizeScale,
    opacity: isPending ? 0.6 : 0.9 + intensity * 0.1,
    transform: `scale(${(() => {
      let baseScale = sizeScale;
      if (state === 'loading') baseScale *= 1.05;
      if (priority === 'critical') baseScale *= 1.1;
      if (state === 'error') baseScale *= 1.08;
      return baseScale;
    })()}) rotate(${(() => {
      if (state === 'error') return `${intensity * 2 - 1}deg`;
      if (priority === 'critical') return `${intensity * 1.5 - 0.75}deg`;
      return '0deg';
    })()})`,
    fontWeight: (() => {
      if (priority === 'critical') return 'bold';
      if (state === 'success' || priority === 'high') return '600';
      return 'normal';
    })(),
    textShadow: (() => {
      const shadowIntensity = heavyValues.$shadowIntensity || intensity * 0.5;
      if (theme === 'light' && state === 'idle') return 'none';
      return `0 1px 2px rgba(0, 0, 0, ${shadowIntensity})`;
    })(),
    boxShadow: `
      0 2px 8px ${getPriorityAccent(priority, heavyValues.$shadowIntensity || intensity * 0.5)},
      inset 0 1px 0 rgba(255, 255, 255, ${intensity * 0.2})
    `,
  };

  return <View {...other} className={classnames(styles.cell)} style={dynamicStyles} />;
};

export default Cell;
