import React from 'react';

/* Archivo Black, uppercase, 2px ink border, hard 15/22 padding.
   Default ink fill flips to signal on hover. */
export function Button({ variant = 'solid', size = 'md', href, children, className = '', ...rest }) {
  const cls = ['b-btn', variant === 'signal' && 'b-btn--signal', variant === 'ghost' && 'b-btn--ghost', size === 'sm' && 'b-btn--sm', className]
    .filter(Boolean)
    .join(' ');
  if (href) return <a className={cls} href={href} {...rest}>{children}</a>;
  return <button className={cls} type="button" {...rest}>{children}</button>;
}
