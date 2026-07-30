import React from 'react';
import { Frame } from './Frame.jsx';

/* A sequenced run of frames - the essay is the unit: 12-20 frames, in order.
   Horizontal contact-sheet scroll, numbered in mono. */
export function EssayStrip({ frames = [], startAt = 1, credit, className = '', style, ...rest }) {
  return (
    <div
      className={className}
      style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-2)', ...style }}
      {...rest}
    >
      {frames.map((fr, i) => (
        <div key={i} style={{ flex: '0 0 auto', width: fr.ratio === '4/5' ? 260 : 380 }}>
          <Frame
            src={fr.src}
            ratio={fr.ratio || '3/2'}
            label={String(startAt + i).padStart(2, '0') + ' / ' + String(frames.length).padStart(2, '0')}
            credit={fr.credit || credit}
          />
        </div>
      ))}
    </div>
  );
}
