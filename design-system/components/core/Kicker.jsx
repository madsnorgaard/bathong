import React from 'react';

/* The mono lead-in: an inverted chip plus a line of plain caps. */
export function Kicker({ chip, children, className = '', ...rest }) {
  return (
    <p className={'b-kicker ' + className} {...rest}>
      {chip ? <b>{chip}</b> : null}{chip ? '  ' : ''}{children}
    </p>
  );
}
