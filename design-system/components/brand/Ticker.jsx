import React from 'react';

/* The street shouting. Mono, uppercase, wide-tracked, signal bullets.
   Items are duplicated internally so the -50% loop is seamless. */
export function Ticker({
  items = ['Bathong!', 'Among the people', 'Pitori', '012', 'Next walk 29 Aug', 'Rooftops', 'Salvokop', 'Marabastad'],
  speed = 26,
  style,
  ...rest
}) {
  const run = items.map((t, i) => (
    <React.Fragment key={i}>
      {t} <b>●</b>{' '}
    </React.Fragment>
  ));
  return (
    <div className="b-ticker" aria-hidden="true" style={style} {...rest}>
      <div className="track" style={{ animationDuration: speed + 's' }}>
        {run}
        {run}
      </div>
    </div>
  );
}
