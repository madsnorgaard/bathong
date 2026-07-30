import React from 'react';
import { Wordmark } from '../brand/Wordmark.jsx';

/* The membership card: ink with a jacaranda offset shadow. Price may read 'R -' while TBC. */
export function MemberCard({
  number = 'Member № 0001 · Pitori · 012',
  price = 'R -',
  priceNote = 'Launch pricing announced soon · anyone can join',
  cta = 'Become a member →',
  ctaHref = 'mailto:hello@bathong.co.za?subject=Membership%20-%20count%20me%20in',
  footnote = 'Membership cards supported by the Press Club NPC',
  className = '',
  style,
  ...rest
}) {
  return (
    <div className={'b-card--member ' + className} style={style} {...rest}>
      <Wordmark size="lg" style={{ fontSize: '1.9rem' }} />
      <div className="card-line">{number}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', margin: '22px 0 2px', lineHeight: 1 }}>
        {price}
        {priceNote ? (
          <small style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '.7rem', letterSpacing: '.14em', color: 'var(--signal)', marginTop: 6, lineHeight: 1.5 }}>
            {priceNote}
          </small>
        ) : null}
      </div>
      {cta ? (
        <a
          href={ctaHref}
          style={{ display: 'block', textAlign: 'center', background: 'var(--signal)', color: 'var(--ink)', textDecoration: 'none', fontFamily: 'var(--font-display)', textTransform: 'uppercase', padding: 15, marginTop: 22, border: '2px solid var(--signal)', transition: '.18s ease' }}
        >
          {cta}
        </a>
      ) : null}
      {footnote ? (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--grey-line)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--grey-ghost)' }}>
          {footnote}
        </div>
      ) : null}
    </div>
  );
}
