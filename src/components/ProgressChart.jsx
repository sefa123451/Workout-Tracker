import React from 'react';
import { formatDisplayDate } from '../lib/workoutData.js';
import {
  buildNextMoveGuidance,
  buildWhyItMattersCopy,
  formatSignalPercent,
  getSignalConfidenceLabel,
  getSignalProfile,
} from '../lib/progressAnalytics.js';

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

function formatAxisValue(value) {
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value * 10) / 10);
}

function buildSmoothPath(points) {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const prev = points[i - 1] || current;
    const afterNext = points[i + 2] || next;

    const tension = 0.3;
    const cp1x = current.x + (next.x - prev.x) * tension;
    const cp1y = current.y + (next.y - prev.y) * tension;
    const cp2x = next.x - (afterNext.x - current.x) * tension;
    const cp2y = next.y - (afterNext.y - current.y) * tension;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  return path;
}

function buildContextMarkerLabels(markers, minGap = 34) {
  const ordered = [...markers].sort((left, right) => left.x - right.x);
  let previousX = -Infinity;
  let previousLevel = 0;

  return ordered.map((marker) => {
    const isOverlapping = marker.x - previousX < minGap;
    const level = isOverlapping ? (previousLevel === 0 ? 1 : 0) : 0;

    previousX = marker.x;
    previousLevel = level;

    return {
      ...marker,
      yOffset: level === 0 ? 10 : 18,
    };
  });
}

export default function ProgressChart({ sessions, metric = 'volume', rangeLabel = '' }) {
  const chronologicalSessions = [...sessions].reverse();
  const metricConfig = METRIC_CONFIG[metric] ?? METRIC_CONFIG.volume;

  if (!chronologicalSessions.length) {
    return (
      <div className="chart-empty">
        <p>No entries in this date range yet.</p>
      </div>
    );
  }

  const values = chronologicalSessions.map((session) => metricConfig.getValue(session));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const midValue = minValue + valueRange / 2;
  const width = 360;
  const height = 204;
  const paddingTop = 28;
  const paddingBottom = 20;
  const paddingRight = 18;
  const axisLabelLength = Math.max(
    formatAxisValue(minValue).length,
    formatAxisValue(midValue).length,
    formatAxisValue(maxValue).length,
  );
  const paddingLeft = Math.min(64, Math.max(46, 24 + axisLabelLength * 5));
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const step = chronologicalSessions.length > 1 ? chartWidth / (chronologicalSessions.length - 1) : 0;

  const points = chronologicalSessions.map((session, index) => {
    const normalizedValue = (metricConfig.getValue(session) - minValue) / valueRange;

    return {
      x: chronologicalSessions.length === 1 ? paddingLeft + chartWidth / 2 : paddingLeft + index * step,
      y: paddingTop + chartHeight - normalizedValue * chartHeight,
      value: metricConfig.getValue(session),
    };
  });

  const smoothLine = points.length > 1 ? buildSmoothPath(points) : '';
  const areaPath = smoothLine
    ? `${smoothLine} L ${points[points.length - 1].x},${paddingTop + chartHeight} L ${points[0].x},${paddingTop + chartHeight} Z`
    : '';

  const guidePositions = [0, 0.5, 1].map((ratio) => ({
    y: paddingTop + chartHeight - ratio * chartHeight,
    value: minValue + ratio * valueRange,
  }));

  const gradientId = `chart-gradient-${metric}`;
  const firstSession = chronologicalSessions[0];
  const latestSession = chronologicalSessions[chronologicalSessions.length - 1];
  const firstValue = metricConfig.getValue(firstSession);
  const latestValue = metricConfig.getValue(latestSession);
  const bestValue = Math.max(...values);
  const bestIndex = values.findIndex((value) => value === bestValue);
  const bestSession = chronologicalSessions[bestIndex];
  const hasComparison = chronologicalSessions.length > 1;
  const signalProfile = getSignalProfile(firstValue, latestValue);
  const confidenceLabel = getSignalConfidenceLabel(chronologicalSessions.length);
  const comparisonSignalProfile = hasComparison ? signalProfile : null;
  const changeSummary = Number.isFinite(signalProfile.delta)
    ? `${signalProfile.delta > 0 ? '+' : ''}${formatAxisValue(signalProfile.delta)}`
    : '--';
  const changePercentSummary = formatSignalPercent(signalProfile.deltaPercent);
  const whySummary = buildWhyItMattersCopy({
    metricLabel: metricConfig.label,
    signalProfile: comparisonSignalProfile,
    confidenceLabel,
    noComparisonCopy: 'Log one more session in this range to unlock a reliable direction.',
  });
  const soWhatGuidance = buildNextMoveGuidance({
    signalProfile: comparisonSignalProfile,
    confidenceLabel,
    noComparisonCopy: 'Keep logging this range. One more session will unlock a confident next-step call.',
  });
  const baselineX = points[0]?.x ?? paddingLeft;
  const latestX = points[points.length - 1]?.x ?? paddingLeft;
  const bestX = points[bestIndex]?.x ?? latestX;
  const bestIsLatest = bestIndex === points.length - 1;
  const contextMarkers = buildContextMarkerLabels(
    bestIsLatest
      ? [
          { key: 'baseline', label: 'Baseline', x: baselineX, className: 'progress-chart-marker-label-baseline' },
          { key: 'best-latest', label: 'Best = Latest', x: latestX, className: 'progress-chart-marker-label-best-latest' },
        ]
      : [
          { key: 'baseline', label: 'Baseline', x: baselineX, className: 'progress-chart-marker-label-baseline' },
          { key: 'best', label: 'Best', x: bestX, className: 'progress-chart-marker-label-best' },
          { key: 'latest', label: 'Latest', x: latestX, className: 'progress-chart-marker-label-latest' },
        ],
  );

  return (
    <div className="chart-shell">
      <div className="chart-stats chart-insight-row" role="group" aria-label="Chart decision support">
        <span className="chart-stat-item">Baseline {formatAxisValue(firstValue)} • {formatDisplayDate(firstSession.date)}</span>
        <span className="chart-stat-item">Latest signal {formatAxisValue(latestValue)} • {formatDisplayDate(latestSession.date)}</span>
        <span className="chart-stat-item">
          {bestIsLatest ? 'Best = Latest' : 'Best'} {formatAxisValue(bestValue)} • {formatDisplayDate(bestSession.date)}
        </span>
        <span className={`chart-stat-item chart-signal-badge chart-signal-badge-${signalProfile.tone}`}>
          {hasComparison
            ? `Change signal ${changeSummary}${changePercentSummary ? ` (${changePercentSummary})` : ''}`
            : 'Change signal Baseline building'}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="progress-chart"
        role="img"
        aria-label={`${metricConfig.label} chart`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis labels */}
        {guidePositions.map((guide) => (
          <g key={guide.y}>
            <line
              className="progress-chart-guide"
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={guide.y}
              y2={guide.y}
            />
            <text
              className="progress-chart-axis-label"
              x={paddingLeft - 8}
              y={guide.y + 3.5}
              textAnchor="end"
            >
              {formatAxisValue(guide.value)}
            </text>
          </g>
        ))}

        {/* Context markers */}
        <line
          className="progress-chart-context-line progress-chart-context-baseline"
          x1={baselineX}
          x2={baselineX}
          y1={paddingTop}
          y2={paddingTop + chartHeight}
        />
        {bestIsLatest ? (
          <line
            className="progress-chart-context-line progress-chart-context-best-latest"
            x1={latestX}
            x2={latestX}
            y1={paddingTop}
            y2={paddingTop + chartHeight}
          />
        ) : (
          <>
            <line
              className="progress-chart-context-line progress-chart-context-best"
              x1={bestX}
              x2={bestX}
              y1={paddingTop}
              y2={paddingTop + chartHeight}
            />
            <line
              className="progress-chart-context-line progress-chart-context-latest"
              x1={latestX}
              x2={latestX}
              y1={paddingTop}
              y2={paddingTop + chartHeight}
            />
          </>
        )}
        {contextMarkers.map((marker) => {
          const nearLeftEdge = marker.x <= paddingLeft + 12;
          const nearRightEdge = marker.x >= width - paddingRight - 12;
          const textAnchor = nearLeftEdge ? 'start' : nearRightEdge ? 'end' : 'middle';
          return (
            <text
              key={marker.key}
              className={`progress-chart-marker-label ${marker.className}`}
              x={marker.x}
              y={paddingTop - marker.yOffset}
              textAnchor={textAnchor}
            >
              {marker.label}
            </text>
          );
        })}

        {/* Area fill */}
        {areaPath && (
          <path
            className="progress-chart-area"
            d={areaPath}
            fill={`url(#${gradientId})`}
          />
        )}

        {/* Line */}
        {smoothLine && (
          <path
            className="progress-chart-line"
            d={smoothLine}
          />
        )}

        {/* Data points */}
        {points.map((point, index) => {
          const isLatest = index === points.length - 1;
          const isBest = index === bestIndex;
          return (
            <g key={`${chronologicalSessions[index].workoutId}-point`}>
              {isLatest && (
                <circle
                  className="progress-chart-point-glow"
                  cx={point.x}
                  cy={point.y}
                  r="10"
                />
              )}
              <circle
                className={
                  isLatest
                    ? 'progress-chart-point progress-chart-point-latest'
                    : 'progress-chart-point'
                }
                cx={point.x}
                cy={point.y}
                r={isLatest ? '5' : '3.5'}
              />
              {isLatest && bestIsLatest && (
                <circle
                  className="progress-chart-point-best-latest-ring"
                  cx={point.x}
                  cy={point.y}
                  r="7.5"
                />
              )}
              {isLatest && (
                <text
                  className="progress-chart-value-label"
                  x={point.x}
                  y={point.y - (bestIsLatest ? 20 : 12)}
                  textAnchor="middle"
                >
                  {formatAxisValue(point.value)}
                </text>
              )}
              {isLatest && bestIsLatest && (
                <text
                  className="progress-chart-best-latest-label"
                  x={point.x}
                  y={point.y - 30}
                  textAnchor="middle"
                >
                  Best = Latest
                </text>
              )}
              {isBest && !isLatest && (
                <circle
                  className="progress-chart-point-best"
                  cx={point.x}
                  cy={point.y}
                  r="4.5"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-context-legend" aria-hidden="true">
        <span className="chart-context-legend-item chart-context-legend-baseline">Baseline</span>
        {bestIsLatest ? (
          <span className="chart-context-legend-item chart-context-legend-best-latest">Best = Latest</span>
        ) : (
          <>
            <span className="chart-context-legend-item chart-context-legend-best">Best</span>
            <span className="chart-context-legend-item chart-context-legend-latest">Latest</span>
          </>
        )}
      </div>
      <div className="chart-guidance">
        <span className="metric-label">So what</span>
        <p>{whySummary}</p>
        <p>
          {soWhatGuidance}
          {rangeLabel ? ` (${rangeLabel})` : ''}
        </p>
      </div>
      <div className="chart-caption">
        <span>{formatDisplayDate(chronologicalSessions[0].date)}</span>
        <span>{formatDisplayDate(chronologicalSessions[chronologicalSessions.length - 1].date)}</span>
      </div>
    </div>
  );
}
