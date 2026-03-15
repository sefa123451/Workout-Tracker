import React from 'react';

export default function StatCard({ label, value, helper, className = '' }) {
  const valueText = String(value ?? '').trim();
  const valueClassName = [
    'stat-value',
    valueText.length > 18 ? 'stat-value-very-long' : valueText.length > 10 ? 'stat-value-long' : '',
    valueText && !/\s/.test(valueText) ? 'stat-value-single-word' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className ? `stat-card ${className}` : 'stat-card'}>
      <span className="stat-label">{label}</span>
      <strong className={valueClassName} title={typeof value === 'string' ? value : undefined}>
        {value}
      </strong>
      <span className="stat-helper">{helper}</span>
    </div>
  );
}
