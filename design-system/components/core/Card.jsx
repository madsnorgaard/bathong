import React from 'react';

/* The print card: paper on colour, hard 10px ink offset shadow, square corners. */
export function Card({ children, className = '', style, ...rest }) {
  return <div className={'b-card ' + className} style={style} {...rest}>{children}</div>;
}
