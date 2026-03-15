import React from 'react';
import { formatDisplayDate } from '../lib/workoutData.js';

export default function ProgressChart({ sessions }) {
  const chronologicalSessions = [...sessions].reverse();

  if (!chronologicalSessions.length) {
    return (
      <div className="chart-empty">
        <p>No entries in this date range yet.</p>
      </div>
    );
  }

  const width = 320;
  const height = 120;
  const padding = 14;
  const volumes = chronologicalSessions.map((session) => session.metrics.totalVolume);
  const minVolume = Math.min(...volumes);
  const maxVolume = Math.max(...volumes);
  const volumeRange = maxVolume - minVolume || 1;
  const step = chronologicalSessions.length > 1 ? (width - padding * 2) / (chronologicalSessions.length - 1) : 0;

  const points = chronologicalSessions.map((session, index) => {
    const normalizedVolume = (session.metrics.totalVolume - minVolume) / volumeRange;

    return {
      x: chronologicalSessions.length === 1 ? width / 2 : padding + index * step,
      y: height - padding - normalizedVolume * (height - padding * 2),
    };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = [
    `${points[0].x},${height - padding}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points[points.length - 1].x},${height - padding}`,
  ].join(' ');

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} className="progress-chart" role="img" aria-label="Total volume chart">
        <polyline className="progress-chart-area" points={areaPoints} />
        <polyline className="progress-chart-line" points={linePoints} />
        {points.map((point, index) => (
          <circle
            key={`${chronologicalSessions[index].workoutId}-point`}
            className="progress-chart-point"
            cx={point.x}
            cy={point.y}
            r="3.5"
          />
        ))}
      </svg>
      <div className="chart-caption">
        <span>{formatDisplayDate(chronologicalSessions[0].date)}</span>
        <span>{formatDisplayDate(chronologicalSessions[chronologicalSessions.length - 1].date)}</span>
      </div>
    </div>
  );
}
