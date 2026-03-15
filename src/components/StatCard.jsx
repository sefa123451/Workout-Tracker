import React from 'react';

export default function StatCard({ label, value, helper }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-helper">{helper}</span>
    </div>
  );
}
