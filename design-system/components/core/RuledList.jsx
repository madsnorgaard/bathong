import React from 'react';

/* Frame-width rules between rows. Mono index, display-weight label, muted sub-line. */
export function RuledList({ items = [], className = '', ...rest }) {
  return (
    <ul className={'b-ruled ' + className} {...rest}>
      {items.map((it, i) => (
        <li key={i}>
          {it.num ? <span className="num">{it.num}</span> : null}
          <div>
            {it.label}
            {it.note ? <small>{it.note}</small> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
