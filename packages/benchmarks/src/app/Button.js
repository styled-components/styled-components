import React from 'react';
import { font } from './constants';

export default function Button({ accessibilityLabel, color, disabled, onPress, style, testID, title, variant }) {
  const isStop = variant === 'stop';
  const isMuted = variant === 'muted';

  const bg = isStop
    ? 'var(--bench-danger)'
    : isMuted
      ? 'var(--bench-muted-btn)'
      : color || 'var(--bench-accent)';

  return (
    <div
      data-bench-btn=""
      data-disabled={disabled ? 'true' : undefined}
      data-testid={testID}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={accessibilityLabel}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onPress}
      onKeyDown={disabled ? undefined : e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderRadius: 6,
        padding: '8px 12px',
        outline: 'none',
        ...style,
      }}
    >
      <span
        style={spanStyle}
      >
        {title}
      </span>
    </div>
  );
}

const spanStyle = {
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: font,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
};
