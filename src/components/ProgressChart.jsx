import React from 'react';
import { formatDisplayDate } from '../lib/workoutData.js';

const METRIC_CONFIG = {
  volume: {
    label: 'Total volume',
    getValue: (session) => session.metrics.totalVolume,
  },
  weight: {
    label: 'Best weight',
    getValue: (session) => session.metrics.bestWeight,
  },
  reps: {
    label: 'Best reps',
    getValue: (session) => session.metrics.bestReps,
  },
};

export default function ProgressChart({ sessions, metric = 'volume' }) {
  const chronologicalSessions = [...sessions].reverse();
  const metricConfig = METRIC_CONFIG[metric] ?? METRIC_CONFIG.volume;

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
  const values = chronologicalSessions.map((session) => metricConfig.getValue(session));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const step = chronologicalSessions.length > 1 ? (width - padding * 2) / (chronologicalSessions.length - 1) : 0;

  const points = chronologicalSessions.map((session, index) => {
    const normalizedValue = (metricConfig.getValue(session) - minValue) / valueRange;

    return {
      x: chronologicalSessions.length === 1 ? width / 2 : padding + index * step,
      y: height - padding - normalizedValue * (height - padding * 2),
    };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = [
    `${points[0].x},${height - padding}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points[points.length - 1].x},${height - padding}`,
  ].join(' ');
  const guideLines = [0.25, 0.5, 0.75].map((ratio) => height - padding - ratio * (height - padding * 2));

  return (
    <div className="chart-shell">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="progress-chart"
        role="img"
        aria-label={`${metricConfig.label} chart`}
      >
        {guideLines.map((y) => (
          <line
            key={y}
            className="progress-chart-guide"
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
          />
        ))}
        <polyline className="progress-chart-area" points={areaPoints} />
        <polyline className="progress-chart-line" points={linePoints} />
        {points.map((point, index) => (
          <circle
            key={`${chronologicalSessions[index].workoutId}-point`}
            className={
              index === points.length - 1
                ? 'progress-chart-point progress-chart-point-latest'
                : 'progress-chart-point'
            }
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? '4.6' : '3.5'}
          />
        ))}
      </svg>
      <div className="chart-stats">
        <span>Peak {Math.round(maxValue * 100) / 100}</span>
        <span>Base {Math.round(minValue * 100) / 100}</span>
      </div>
      <div className="chart-caption">
        <span>{formatDisplayDate(chronologicalSessions[0].date)}</span>
        <span>{formatDisplayDate(chronologicalSessions[chronologicalSessions.length - 1].date)}</span>
      </div>
    </div>
  );
}
