import React from 'react';

/* The definition device. Explains the name without a paragraph of copy.
   Works as an Instagram slide, wall text, tote, the back of the membership card. */
export function DictionaryCard({
  entry = 'bathong!',
  pos = 'excl. / loc.',
  senses = [
    "what you say when you can't believe what you're seeing.",
    'ba-tho-ng: among the people - where this work is made.',
    'a collective of photographers from Pretoria, for the world.'
  ],
  surface = 'ink',
  style,
  ...rest
}) {
  return (
    <div className={'b-dict' + (surface === 'paper' ? ' b-dict--paper' : '')} style={style} {...rest}>
      <span className="entry">{entry}</span> <span className="pos">{pos}</span>
      {senses.map((s, i) => (
        <div key={i}>{i + 1}. {s}</div>
      ))}
    </div>
  );
}
