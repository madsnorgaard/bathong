import React from 'react';

/* Mono input, 2px ink border, uppercase placeholder, jacaranda focus ring. */
export function Field({ label, as = 'input', rows = 4, className = '', id, ...rest }) {
  const El = as === 'textarea' ? 'textarea' : 'input';
  const fieldId = id || (label ? 'f-' + String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);
  return (
    <div>
      {label ? <label className="b-label" htmlFor={fieldId}>{label}</label> : null}
      <El id={fieldId} className={'b-field ' + className} rows={as === 'textarea' ? rows : undefined} {...rest} />
    </div>
  );
}
