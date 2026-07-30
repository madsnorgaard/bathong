import React from 'react';
import { Tag } from '../core/Tag.jsx';

/* Every photograph lives in one. 2px ink border, mono caption bar, credit.
   The photograph is shown as shot - brand colour stays in the furniture. */
export function Frame({ src, alt = '', ratio = '3/2', tag, label, credit, className = '', style, children, ...rest }) {
  const ratioCls = { '21/9': ' b-frame--wide', '4/5': ' b-frame--tall', '1/1': ' b-frame--square' }[ratio] || '';
  return (
    <figure
      className={'b-frame' + ratioCls + ' ' + className}
      role="group"
      aria-label={alt}
      style={{ backgroundImage: src ? `url("${src}")` : undefined, backgroundColor: src ? undefined : 'var(--paper-dim)', ...style }}
      {...rest}
    >
      {src ? null : (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)', letterSpacing: 'var(--track-label)', textTransform: 'uppercase', color: 'var(--grey-warm)' }}>
          Photo slot
        </span>
      )}
      {tag ? <Tag>{tag}</Tag> : null}
      {children}
      {label || credit ? (
        <figcaption>
          <span>{label}</span>
          {credit ? <cite className="b-credit">{credit}</cite> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
