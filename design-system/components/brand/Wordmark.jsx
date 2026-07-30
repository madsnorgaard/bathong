import React from 'react';

/* BATHONG. - the wordmark. Archivo Black, uppercase, tight, jacaranda full stop.
   Never set in another typeface. Never with an exclamation mark. */
export function Wordmark({ size = 'md', as = 'span', href, dotColor, style, ...rest }) {
  const sizes = { hero: 'var(--text-mark)', xl: 'clamp(3rem,10vw,7rem)', lg: '2.6rem', md: '1.9rem', sm: '1.25rem' };
  const Tag = href ? 'a' : as;
  return (
    <Tag
      className={'b-mark' + (size === 'hero' ? ' b-mark--hero' : '')}
      href={href}
      style={{ fontSize: size === 'hero' ? undefined : sizes[size] || size, ...style }}
      {...rest}
    >
      Bathong<span className="dot" style={dotColor ? { color: dotColor } : undefined}>.</span>
    </Tag>
  );
}
