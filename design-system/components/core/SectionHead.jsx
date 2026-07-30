import React from 'react';

/* Display title with a jacaranda punch-dot, baseline-aligned with an archive index. */
export function SectionHead({ title, index, dotColor, level = 2, className = '', ...rest }) {
  const H = 'h' + level;
  return (
    <div className={'b-sechead ' + className} {...rest}>
      <H className="b-display-1">
        {title}
        <span className="dot" style={{ color: dotColor || 'var(--jacaranda)' }}>.</span>
      </H>
      {index ? <span className="idx">{index}</span> : null}
    </div>
  );
}
