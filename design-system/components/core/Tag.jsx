import React from 'react';

/* The signal chip: photocall status, 'NPC funded', open calls. Mono micro caps. */
export function Tag({ variant = 'signal', children, className = '', ...rest }) {
  const cls = ['b-tag', variant === 'ink' && 'b-tag--ink', variant === 'outline' && 'b-tag--outline', className].filter(Boolean).join(' ');
  return <span className={cls} {...rest}>{children}</span>;
}
