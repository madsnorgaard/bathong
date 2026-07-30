import React from 'react';

/* The full stop, cut loose. Avatar, watermark, section punctuation. */
export function PunchDot({ size = 44, variant = 'dot', color = 'var(--jacaranda)', style, ...rest }) {
  if (variant === 'avatar') {
    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, background: 'var(--ink)', ...style }}
        {...rest}
      >
        <span style={{ display: 'block', width: size * 0.34, height: size * 0.34, background: color }} />
      </span>
    );
  }
  return <span style={{ display: 'inline-block', width: size, height: size, background: color, ...style }} {...rest} />;
}
