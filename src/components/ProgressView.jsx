import React, { useState } from 'react';
import EmptyState from './EmptyState.jsx';
import ProgressChart from './ProgressChart.jsx';
import StatCard from './StatCard.jsx';
import {
  ANALYTICS_TERMS,
  buildChangeSignalCopy,
  buildNextMoveGuidance,
  buildWhyItMattersCopy,
  getSignalConfidenceLabel,
  getSignalProfile,
} from '../lib/progressAnalytics.js';

const PROGRESS_METRIC_OPTIONS = [
  { id: 'volume', label: 'Volume', bestLabel: 'Best volume', latestLabel: 'Latest volume' },
  { id: 'weight', label: 'Weight', bestLabel: 'Best weight', latestLabel: 'Latest weight' },
  { id: 'reps', label: 'Reps', bestLabel: 'Best reps', latestLabel: 'Latest reps' },
];
const EXERCISE_PR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'weight', label: 'Weight' },
  { id: 'reps', label: 'Reps' },
  { id: 'volume', label: 'Volume' },
];

function getExerciseSignalLabels(session) {
  if (!session) {
    return [];
  }

  const labels = [];

  if (session.personalRecords.weight) labels.push('Weight PR');
  if (session.personalRecords.reps) labels.push('Reps PR');
  if (session.personalRecords.volume) labels.push('Volume PR');
  if (session.improvements.weight) labels.push('Weight up');
  if (session.improvements.reps) labels.push('Reps up');
  if (session.improvements.volume) labels.push('Volume up');

  return labels;
}

function getSplitSignalLabels(session) {
  if (!session) {
    return [];
  }

  const labels = [];

  if (session.personalRecords.volume) labels.push('Volume PR');
  if (session.improvements.volume) labels.push('Volume up');
  if (session.improvements.sets) labels.push('Sets up');
  if (session.improvements.exercises) labels.push('More moves');

  return labels;
}

function matchesExercisePrFilter(session, filterId) {
  if (filterId === 'all') {
    return (
      session.personalRecords.weight ||
      session.personalRecords.reps ||
      session.personalRecords.volume
    );
  }

  return Boolean(session.personalRecords[filterId]);
}

function getExercisePrLead(session, formatNumber) {
  if (session.personalRecords.weight) {
    return `Weight ${formatNumber(session.metrics.bestWeight)} kg`;
  }

  if (session.personalRecords.reps) {
    return `Reps ${formatNumber(session.metrics.bestReps)}`;
  }

  if (session.personalRecords.volume) {
    return `Volume ${formatNumber(session.metrics.totalVolume)}`;
  }

  return 'No PR';
}

function formatWindowLabel(windowDays) {
  return `Last ${windowDays} day${windowDays === 1 ? '' : 's'}`;
}

function getSessionMetricValue(session, metric) {
  if (!session) {
    return null;
  }

  if (metric === 'weight') {
    return session.metrics.bestWeight;
  }

  if (metric === 'reps') {
    return session.metrics.bestReps;
  }

  return session.metrics.totalVolume;
}

function getTrendState(delta) {
  if (!Number.isFinite(delta)) {
    return {
      headline: 'Building a baseline',
      sentence: 'Log one more session to unlock a directional comparison.',
      tone: 'neutral',
    };
  }

  if (delta > 0) {
    return {
      headline: 'Improving',
      sentence: 'You are trending upward in this range.',
      tone: 'positive',
    };
  }

  if (delta < 0) {
    return {
      headline: 'Cooling off',
      sentence: 'This range is trailing the starting point.',
      tone: 'negative',
    };
  }

  return {
    headline: 'Holding steady',
    sentence: 'Performance is flat versus the start of this range.',
    tone: 'neutral',
  };
}

function ProgressStoryCard({
  eyebrow,
  title,
  body,
  rangeLabel,
  trendTone,
  metrics,
  signalLabels,
  signalFallback,
}) {
  return (
    <section
      className={
        trendTone === 'positive'
          ? 'progress-story-card progress-story-card-positive'
          : trendTone === 'negative'
            ? 'progress-story-card progress-story-card-negative'
            : 'progress-story-card'
      }
    >
      <div className="progress-story-header">
        <div>
          <span className="metric-label">{eyebrow}</span>
          <h3>{title}</h3>
          <p>{body}</p>
        </div>
        <span className="progress-story-range">{rangeLabel}</span>
      </div>
      <div className="progress-story-metrics">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={index === 0 ? 'progress-story-metric progress-story-metric-primary' : 'progress-story-metric'}
          >
            <span className="metric-label">{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.helper}</p>
          </div>
        ))}
      </div>
      <div className="progress-story-footer">
        <div className="progress-story-signal-copy">
          <span className="metric-label">{ANALYTICS_TERMS.latestSignal}</span>
          <p>{signalLabels.length ? signalLabels.join(' • ') : signalFallback}</p>
        </div>
        <div className="tag-row">
          {signalLabels.length ? (
            signalLabels.map((label) => (
              <span
                key={label}
                className={label.includes('PR') ? 'tag pr-tag' : 'tag'}
              >
                {label}
              </span>
            ))
          ) : (
            <span className="tag muted">No new high</span>
          )}
        </div>
      </div>
    </section>
  );
}

function ProgressDecisionBand({
  title,
  subtitle,
  items,
}) {
  return (
    <section className="progress-decision-band" aria-label={ANALYTICS_TERMS.decisionSummary}>
      <div className="progress-decision-header">
        <span className="metric-label">{title}</span>
        <p>{subtitle}</p>
      </div>
      <div className={items.length > 3 ? 'progress-decision-grid progress-decision-grid-wide' : 'progress-decision-grid'}>
        {items.map((item, index) => (
          <article
            key={item.label}
            className={index === 0 ? 'progress-decision-item progress-decision-item-primary' : 'progress-decision-item'}
          >
            <span className="metric-label">{item.label}</span>
            <p>{item.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProgressTopSurface({
  title,
  windowLabel,
  story,
  decision,
  summaryCards,
}) {
  return (
    <>
      <div className="workout-card-header">
        <strong>{title}</strong>
        <span>{windowLabel}</span>
      </div>
      <ProgressStoryCard
        eyebrow={story.eyebrow}
        title={story.title}
        body={story.body}
        rangeLabel={story.rangeLabel}
        trendTone={story.trendTone}
        metrics={story.metrics}
        signalLabels={story.signalLabels}
        signalFallback={story.signalFallback}
      />
      <ProgressDecisionBand
        title={decision.title}
        subtitle={decision.subtitle}
        items={decision.items}
      />
      <div className="stats-grid progress-summary-grid progress-summary-grid-compact">
        {summaryCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
          />
        ))}
      </div>
    </>
  );
}

function ProgressToolbar({
  exercises,
  splits,
  selectedProgressView,
  setSelectedProgressView,
  selectedExerciseId,
  setSelectedExerciseId,
  selectedSplitProgressId,
  setSelectedSplitProgressId,
  progressWindows,
  selectedProgressWindow,
  setSelectedProgressWindow,
  selectedProgressMetric,
  setSelectedProgressMetric,
  selectedEntityLabel,
  selectedMetricLabel,
}) {
  return (
    <div className="progress-toolbar progress-control-shell">
      <div className="progress-toolbar-copy">
        <span className="metric-label">Viewing</span>
        <strong>{selectedEntityLabel}</strong>
        <p>
          {selectedProgressView === 'split' ? 'Split progress' : 'Exercise progress'}
          {' '}• {selectedMetricLabel} • {formatWindowLabel(selectedProgressWindow)}
        </p>
      </div>
      <div className="progress-toolbar-controls">
        <div className="progress-toolbar-row">
          {splits.length > 0 && (
            <div
              className="progress-window-switcher progress-mode-switcher"
              role="group"
              aria-label="Progress type"
            >
              <button
                type="button"
                className={
                  selectedProgressView === 'exercise'
                    ? 'view-button active range-button'
                    : 'view-button range-button'
                }
                onClick={() => setSelectedProgressView('exercise')}
              >
                Exercises
              </button>
              <button
                type="button"
                className={
                  selectedProgressView === 'split'
                    ? 'view-button active range-button'
                    : 'view-button range-button'
                }
                onClick={() => setSelectedProgressView('split')}
              >
                Splits
              </button>
            </div>
          )}

          <label className="field field-compact progress-toolbar-field">
            <span>{selectedProgressView === 'split' ? 'Split' : 'Exercise'}</span>
            {selectedProgressView === 'split' ? (
              splits.length ? (
                <select
                  value={selectedSplitProgressId}
                  onChange={(event) => setSelectedSplitProgressId(event.target.value)}
                >
                  {splits.map((split) => (
                    <option key={split.id} value={split.id}>
                      {split.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="progress-toolbar-inline-note">No splits available</span>
              )
            ) : (
              <select
                value={selectedExerciseId}
                onChange={(event) => setSelectedExerciseId(event.target.value)}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>

        <div className="progress-toolbar-row progress-toolbar-row-secondary">
          {selectedProgressView === 'exercise' && (
            <div className="progress-control-stack progress-control-stack-inline">
              <span className="metric-label">Metric</span>
              <div className="progress-window-switcher" role="group" aria-label="Progress metric">
                {PROGRESS_METRIC_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      option.id === selectedProgressMetric
                        ? 'view-button active range-button'
                        : 'view-button range-button'
                    }
                    onClick={() => setSelectedProgressMetric(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="progress-control-stack progress-control-stack-inline">
            <span className="metric-label">Window</span>
            <div
              className="progress-window-switcher"
              role="group"
              aria-label="Progress comparison window"
            >
              {progressWindows.map((windowDays) => (
                <button
                  key={windowDays}
                  type="button"
                  className={
                    windowDays === selectedProgressWindow
                      ? 'view-button active range-button'
                      : 'view-button range-button'
                  }
                  onClick={() => setSelectedProgressWindow(windowDays)}
                >
                  {windowDays}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProgressView({
  exercises,
  splits,
  selectedProgressView,
  setSelectedProgressView,
  selectedExerciseId,
  setSelectedExerciseId,
  selectedSplitProgressId,
  setSelectedSplitProgressId,
  progressWindows,
  selectedProgressWindow,
  setSelectedProgressWindow,
  selectedProgressMetric,
  setSelectedProgressMetric,
  selectedExerciseHistory,
  selectedExerciseWindowHistory,
  selectedExerciseWindowSummary,
  selectedSplitHistory,
  selectedSplitWindowHistory,
  selectedSplitWindowSummary,
  getSplitName,
  formatDisplayDate,
  formatDelta,
  formatNumber,
  hasPersonalRecord,
  hasImprovement,
}) {
  const [selectedExercisePrFilter, setSelectedExercisePrFilter] = useState('all');
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
  const selectedExerciseHasGoal =
    selectedExercise?.targetRepMin || selectedExercise?.targetRepMax || selectedExercise?.targetWeight;
  const metricConfig =
    PROGRESS_METRIC_OPTIONS.find((option) => option.id === selectedProgressMetric) ??
    PROGRESS_METRIC_OPTIONS[0];
  const selectedWindowLabel = formatWindowLabel(selectedProgressWindow);
  const selectedWindowLabelLower = selectedWindowLabel.toLowerCase();

  const metricValue =
    selectedProgressMetric === 'weight'
      ? {
          best: selectedExerciseWindowSummary?.bestWeight,
          latest: selectedExerciseWindowSummary?.latestWeight,
          delta: selectedExerciseWindowSummary?.comparison?.weightDelta,
        }
      : selectedProgressMetric === 'reps'
        ? {
            best: selectedExerciseWindowSummary?.bestReps,
            latest: selectedExerciseWindowSummary?.latestReps,
            delta: selectedExerciseWindowSummary?.comparison?.repsDelta,
          }
        : {
            best: selectedExerciseWindowSummary?.bestVolume,
            latest: selectedExerciseWindowSummary?.latestVolume,
            delta: selectedExerciseWindowSummary?.comparison?.volumeDelta,
          };
  const latestSession = selectedExerciseWindowHistory[0] ?? null;
  const latestSplitSession = selectedSplitWindowHistory[0] ?? null;
  const baselineExerciseSession =
    selectedExerciseWindowHistory[selectedExerciseWindowHistory.length - 1] ?? null;
  const baselineSplitSession =
    selectedSplitWindowHistory[selectedSplitWindowHistory.length - 1] ?? null;
  const exerciseSignalLabels = getExerciseSignalLabels(latestSession);
  const splitSignalLabels = getSplitSignalLabels(latestSplitSession);
  const recentExercisePrSessions = selectedExerciseWindowHistory.filter(
    (session) =>
      session.personalRecords.weight ||
      session.personalRecords.reps ||
      session.personalRecords.volume,
  );
  const recentSplitPrSessions = selectedSplitWindowHistory.filter(
    (session) => session.personalRecords.volume,
  );
  const filteredExercisePrSessions = recentExercisePrSessions.filter((session) =>
    matchesExercisePrFilter(session, selectedExercisePrFilter),
  );
  const selectedExerciseGoalProgress =
    selectedExercise?.targetWeight && selectedExerciseWindowSummary
      ? Math.min(selectedExerciseWindowSummary.bestWeight / selectedExercise.targetWeight, 1)
      : null;
  const selectedSplit = splits.find((split) => split.id === selectedSplitProgressId) ?? null;
  const selectedEntityLabel =
    selectedProgressView === 'split'
      ? selectedSplit?.name ?? getSplitName(selectedSplitProgressId)
      : selectedExercise?.name ?? 'Exercise';
  const selectedMetricLabel =
    selectedProgressView === 'split' ? 'Volume' : metricConfig.label;
  const exerciseTrendState = getTrendState(metricValue.delta);
  const splitTrendState = getTrendState(selectedSplitWindowSummary?.comparison?.volumeDelta);
  const exerciseSignalProfile = getSignalProfile(
    getSessionMetricValue(baselineExerciseSession, selectedProgressMetric),
    getSessionMetricValue(latestSession, selectedProgressMetric),
  );
  const splitSignalProfile = getSignalProfile(
    getSessionMetricValue(baselineSplitSession, 'volume'),
    getSessionMetricValue(latestSplitSession, 'volume'),
  );
  const exerciseSampleQuality = getSignalConfidenceLabel(selectedExerciseWindowHistory.length);
  const splitSampleQuality = getSignalConfidenceLabel(selectedSplitWindowHistory.length);
  const exerciseBestDate = selectedExerciseWindowSummary
    ? selectedProgressMetric === 'weight'
      ? selectedExerciseWindowSummary.bestWeightDate
      : selectedProgressMetric === 'reps'
        ? selectedExerciseWindowSummary.bestRepsDate
        : selectedExerciseWindowSummary.bestVolumeDate
    : null;
  const exerciseStoryMetrics = [
    {
      label: `Latest ${metricConfig.label.toLowerCase()}`,
      value: latestSession ? formatNumber(metricValue.latest) : '--',
      helper: latestSession ? formatDisplayDate(latestSession.date) : 'No entries in range',
    },
    {
      label: 'Best in range',
      value: selectedExerciseWindowSummary ? formatNumber(metricValue.best) : '--',
      helper: exerciseBestDate ? formatDisplayDate(exerciseBestDate) : 'No entries yet',
    },
    {
      label: 'Range change',
      value: selectedExerciseWindowSummary?.comparison ? formatDelta(metricValue.delta) : '--',
      helper: selectedExerciseWindowSummary?.comparison
        ? `vs ${formatDisplayDate(selectedExerciseWindowSummary.comparison.firstDate)}`
        : 'Need 2 entries',
    },
  ];
  const exerciseChangeSignal = buildChangeSignalCopy({
    signalProfile: exerciseSignalProfile,
    formatDelta,
    baselineDateLabel: selectedExerciseWindowSummary?.comparison
      ? formatDisplayDate(selectedExerciseWindowSummary.comparison.firstDate)
      : '',
    noComparisonCopy: `Need one more entry in ${selectedWindowLabelLower}`,
  });
  const exerciseWhySummary = buildWhyItMattersCopy({
    metricLabel: metricConfig.label,
    signalProfile: selectedExerciseWindowSummary?.comparison ? exerciseSignalProfile : null,
    confidenceLabel: exerciseSampleQuality,
    noComparisonCopy: `You have activity in ${selectedWindowLabelLower}, but you need one more entry to confirm direction.`,
  });
  const splitStoryMetrics = [
    {
      label: 'Latest volume',
      value: selectedSplitWindowSummary ? formatNumber(selectedSplitWindowSummary.latestVolume) : '--',
      helper: latestSplitSession ? formatDisplayDate(latestSplitSession.date) : 'No entries in range',
    },
    {
      label: 'Best in range',
      value: selectedSplitWindowSummary ? formatNumber(selectedSplitWindowSummary.bestVolume) : '--',
      helper: selectedSplitWindowSummary?.bestVolumeDate
        ? formatDisplayDate(selectedSplitWindowSummary.bestVolumeDate)
        : 'No entries yet',
    },
    {
      label: 'Range change',
      value: selectedSplitWindowSummary?.comparison
        ? formatDelta(selectedSplitWindowSummary.comparison.volumeDelta)
        : '--',
      helper: selectedSplitWindowSummary?.comparison
        ? `vs ${formatDisplayDate(selectedSplitWindowSummary.comparison.firstDate)}`
        : 'Need 2 entries',
    },
  ];
  const splitChangeSignal = buildChangeSignalCopy({
    signalProfile: splitSignalProfile,
    formatDelta,
    baselineDateLabel: selectedSplitWindowSummary?.comparison
      ? formatDisplayDate(selectedSplitWindowSummary.comparison.firstDate)
      : '',
    noComparisonCopy: `Need one more split session in ${selectedWindowLabelLower}`,
  });
  const splitWhySummary = buildWhyItMattersCopy({
    metricLabel: 'Split volume',
    signalProfile: selectedSplitWindowSummary?.comparison ? splitSignalProfile : null,
    confidenceLabel: splitSampleQuality,
    noComparisonCopy: `You have activity in ${selectedWindowLabelLower}, but one more split session is needed for a true comparison.`,
  });
  const splitSummaryCards = [
    {
      label: 'Sessions',
      value: selectedSplitWindowSummary ? String(selectedSplitWindowSummary.sessionCount) : '--',
      helper: selectedSplitWindowSummary ? `${selectedProgressWindow} days` : 'No entries',
    },
    {
      label: 'Avg volume',
      value: selectedSplitWindowSummary
        ? formatNumber(selectedSplitWindowSummary.averageVolume)
        : '--',
      helper: selectedSplitWindowSummary ? 'Per split session' : 'No entries',
    },
    {
      label: 'Avg sets',
      value: selectedSplitWindowSummary ? formatNumber(selectedSplitWindowSummary.averageSets) : '--',
      helper: selectedSplitWindowSummary ? 'Per split session' : 'No entries',
    },
  ];
  const exerciseSummaryCards = [
    {
      label: 'Best set',
      value: selectedExerciseWindowSummary
        ? `${formatNumber(selectedExerciseWindowSummary.bestSetWeight)} x ${formatNumber(selectedExerciseWindowSummary.bestSetReps)}`
        : '--',
      helper: selectedExerciseWindowSummary?.bestSetDate
        ? formatDisplayDate(selectedExerciseWindowSummary.bestSetDate)
        : 'No entries',
    },
    {
      label: 'Est. 1RM',
      value: selectedExerciseWindowSummary
        ? formatNumber(selectedExerciseWindowSummary.estimatedOneRepMax)
        : '--',
      helper: selectedExerciseWindowSummary ? 'From best set' : 'No entries',
    },
    {
      label: 'Best session',
      value: selectedExerciseWindowSummary
        ? formatNumber(selectedExerciseWindowSummary.bestSessionVolume)
        : '--',
      helper: selectedExerciseWindowSummary?.bestSessionVolumeDate
        ? formatDisplayDate(selectedExerciseWindowSummary.bestSessionVolumeDate)
        : 'No entries',
    },
  ];
  const goalSummaryLine = selectedExercise?.targetWeight
    ? selectedExerciseWindowSummary
      ? `Best weight ${formatNumber(selectedExerciseWindowSummary.bestWeight)} kg • ${formatNumber(selectedExerciseGoalProgress * 100)}% of ${formatNumber(selectedExercise.targetWeight)} kg target`
      : `Weight target ${formatNumber(selectedExercise.targetWeight)} kg`
    : (selectedExercise?.targetRepMin || selectedExercise?.targetRepMax)
      ? selectedExerciseWindowSummary
        ? `Latest top reps ${formatNumber(selectedExerciseWindowSummary.latestReps)} • target range ${selectedExercise.targetRepMin ?? '--'}-${selectedExercise.targetRepMax ?? '--'}`
        : `Target reps ${selectedExercise.targetRepMin ?? '--'}-${selectedExercise.targetRepMax ?? '--'}`
      : 'Set a target in the exercise library to unlock goal tracking here.';
  const exerciseNextMoveBase = buildNextMoveGuidance({
    signalProfile: selectedExerciseWindowSummary?.comparison ? exerciseSignalProfile : null,
    confidenceLabel: exerciseSampleQuality,
    noComparisonCopy: 'Log one more entry to unlock a reliable direction call.',
  });
  const goalActionLine = selectedExercise?.targetWeight
    ? exerciseSignalProfile.direction === 'down'
      ? 'Use your baseline top set to stabilize execution, then add load gradually.'
      : 'Use your latest top set as the anchor for the next overload step.'
    : (selectedExercise?.targetRepMin || selectedExercise?.targetRepMax)
      ? exerciseSignalProfile.direction === 'up'
        ? 'Stay within target reps and progress load in small, repeatable steps.'
        : 'Use the target rep range to decide whether to add load or reps next session.'
      : exerciseNextMoveBase;
  const splitNextMoveSummary = buildNextMoveGuidance({
    signalProfile: selectedSplitWindowSummary?.comparison ? splitSignalProfile : null,
    confidenceLabel: splitSampleQuality,
    noComparisonCopy: 'Log one more split session to unlock a reliable direction call.',
  });
  const exerciseDecisionItems = [
    {
      label: ANALYTICS_TERMS.changeSignal,
      copy: exerciseChangeSignal,
    },
    {
      label: ANALYTICS_TERMS.whyItMatters,
      copy: exerciseWhySummary,
    },
    {
      label: 'Goal progress',
      copy: selectedExerciseHasGoal ? goalSummaryLine : 'No active goal yet. Add a target to anchor progression decisions.',
    },
    {
      label: ANALYTICS_TERMS.nextMove,
      copy: goalActionLine,
    },
  ];
  const splitDecisionItems = [
    {
      label: ANALYTICS_TERMS.changeSignal,
      copy: splitChangeSignal,
    },
    {
      label: ANALYTICS_TERMS.whyItMatters,
      copy: splitWhySummary,
    },
    {
      label: ANALYTICS_TERMS.nextMove,
      copy: splitNextMoveSummary,
    },
  ];

  return (
    <main className="content-grid progress-layout">
      <section className="panel panel-wide panel-highlight progress-panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Progress view</p>
            <h2>{selectedProgressView === 'split' ? 'Split progress' : 'Exercise progress'}</h2>
          </div>
        </div>
        {!exercises.length ? (
          <EmptyState
            title="No exercises available"
            body="Create an exercise, then log a session."
          />
        ) : (
          <div className="stack">
            <ProgressToolbar
              exercises={exercises}
              splits={splits}
              selectedProgressView={selectedProgressView}
              setSelectedProgressView={setSelectedProgressView}
              selectedExerciseId={selectedExerciseId}
              setSelectedExerciseId={setSelectedExerciseId}
              selectedSplitProgressId={selectedSplitProgressId}
              setSelectedSplitProgressId={setSelectedSplitProgressId}
              progressWindows={progressWindows}
              selectedProgressWindow={selectedProgressWindow}
              setSelectedProgressWindow={setSelectedProgressWindow}
              selectedProgressMetric={selectedProgressMetric}
              setSelectedProgressMetric={setSelectedProgressMetric}
              selectedEntityLabel={selectedEntityLabel}
              selectedMetricLabel={selectedMetricLabel}
            />

            {selectedProgressView === 'split' ? (
              splits.length ? (
                selectedSplitHistory.length ? (
                  <div className="history-list">
                    <article className="workout-card progress-overview">
                      <ProgressTopSurface
                        title={`${getSplitName(selectedSplitProgressId)} trend`}
                        windowLabel={selectedWindowLabel}
                        story={{
                          eyebrow: 'Improvement story',
                          title: `${getSplitName(selectedSplitProgressId)} ${splitTrendState.headline.toLowerCase()} in total volume`,
                          body: selectedSplitWindowSummary?.comparison
                            ? `${splitTrendState.sentence} Comparing the latest split session with the start of ${selectedWindowLabelLower}.`
                            : `You have activity in ${selectedWindowLabelLower}, but you need one more split session for a true comparison.`,
                          rangeLabel: selectedWindowLabel,
                          trendTone: splitTrendState.tone,
                          metrics: splitStoryMetrics,
                          signalLabels: splitSignalLabels,
                          signalFallback: 'Stable compared with the previous split log',
                        }}
                        decision={{
                          title: ANALYTICS_TERMS.decisionSummary,
                          subtitle: `Use this snapshot to decide your next split focus in ${selectedWindowLabelLower}.`,
                          items: splitDecisionItems,
                        }}
                        summaryCards={splitSummaryCards}
                      />
                      <div className="progress-module progress-module-pr">
                        <div className="progress-pr-center-header">
                          <div>
                            <span className="metric-label">PR center</span>
                            <div className="progress-pr-center-meta">
                              <span className="metric-label">{ANALYTICS_TERMS.latestSignal} focus</span>
                              <p>
                                {recentSplitPrSessions.length
                                  ? `${recentSplitPrSessions.length} ${recentSplitPrSessions.length === 1 ? 'session' : 'sessions'} in ${selectedWindowLabelLower}`
                                  : 'No PR sessions in this range'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="progress-pr-feed">
                        {recentSplitPrSessions.length ? (
                          recentSplitPrSessions.slice(0, 4).map((session) => (
                            <article key={`split-pr-${session.workoutId}`} className="progress-pr-card">
                              <div>
                                <span className="metric-label">PR session</span>
                                <strong>{formatDisplayDate(session.date)}</strong>
                                <p>Volume {formatNumber(session.metrics.totalVolume)}</p>
                              </div>
                              <div className="tag-row">
                                <span className="tag pr-tag">Volume PR</span>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="progress-pr-card progress-pr-card-empty">
                            <span className="metric-label">PR signal</span>
                            <strong>No PR yet</strong>
                            <p>Push this split a bit further to surface the next high.</p>
                          </div>
                        )}
                        </div>
                      </div>
                      <div className="progress-module progress-module-chart">
                        <ProgressChart
                          sessions={selectedSplitWindowHistory}
                          metric="volume"
                          rangeLabel={selectedWindowLabel}
                        />
                      </div>
                    </article>

                    {selectedSplitWindowHistory.length ? (
                      selectedSplitWindowHistory.map((session) => (
                        <article key={session.workoutId} className="workout-card progress-card">
                          <div className="workout-card-header">
                            <strong>{formatDisplayDate(session.date)}</strong>
                            <span>Volume {formatNumber(session.metrics.totalVolume)}</span>
                          </div>
                          <div className="progress-metrics">
                            <div>
                              <span className="metric-label">Total volume</span>
                              <strong>{formatNumber(session.metrics.totalVolume)}</strong>
                            </div>
                            <div>
                              <span className="metric-label">Sets</span>
                              <strong>{session.metrics.totalSets}</strong>
                            </div>
                            <div>
                              <span className="metric-label">Moves</span>
                              <strong>{session.metrics.totalExercises}</strong>
                            </div>
                          </div>
                          <div className="tag-row">
                            {session.personalRecords.volume && <span className="tag pr-tag">Volume PR</span>}
                            {session.improvements.volume && <span className="tag">Volume up</span>}
                            {session.improvements.sets && <span className="tag">Sets up</span>}
                            {session.improvements.exercises && <span className="tag">More moves</span>}
                            {!session.previousMetrics && <span className="tag muted">First split log</span>}
                            {!session.personalRecords.volume &&
                              !session.improvements.volume &&
                              !session.improvements.sets &&
                              !session.improvements.exercises &&
                              session.previousMetrics && (
                                <span className="tag muted">No new high</span>
                              )}
                          </div>
                          <div className="previous-row progress-previous-row">
                            {session.previousMetrics ? (
                              <p>
                                {ANALYTICS_TERMS.baseline} vs previous split • volume {formatNumber(session.previousMetrics.totalVolume)} • sets{' '}
                                {formatNumber(session.previousMetrics.totalSets)} • moves{' '}
                                {formatNumber(session.previousMetrics.totalExercises)}
                              </p>
                            ) : (
                              <p>No previous split entry yet.</p>
                            )}
                          </div>
                          {session.notes ? (
                            <div className="progress-note">
                              <span className="metric-label">Session note</span>
                              <p>{session.notes}</p>
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <EmptyState
                        title={`No split sessions in the last ${selectedProgressWindow} days`}
                        body="Choose a wider range or log this split again."
                      />
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="No split progress yet"
                    body="Log a workout from one of your splits to unlock split trends."
                  />
                )
              ) : null
            ) : selectedExerciseHistory.length ? (
              <div className="history-list">
                <article className="workout-card progress-overview">
                  <ProgressTopSurface
                    title={`${metricConfig.label} trend`}
                    windowLabel={selectedWindowLabel}
                    story={{
                      eyebrow: 'Improvement story',
                      title: `${selectedEntityLabel} ${exerciseTrendState.headline.toLowerCase()} in ${metricConfig.label.toLowerCase()}`,
                      body: selectedExerciseWindowSummary?.comparison
                        ? `${exerciseTrendState.sentence} This view compares your latest session with the start of ${selectedWindowLabelLower}.`
                        : `You have activity in ${selectedWindowLabelLower}, but you need one more entry to judge direction.`,
                      rangeLabel: selectedWindowLabel,
                      trendTone: exerciseTrendState.tone,
                      metrics: exerciseStoryMetrics,
                      signalLabels: exerciseSignalLabels,
                      signalFallback: 'Stable compared with the previous entry',
                    }}
                    decision={{
                      title: ANALYTICS_TERMS.decisionSummary,
                      subtitle: `Use this snapshot to decide your next ${selectedEntityLabel.toLowerCase()} session in ${selectedWindowLabelLower}.`,
                      items: exerciseDecisionItems,
                    }}
                    summaryCards={exerciseSummaryCards}
                  />
                  <div className="progress-module progress-module-pr">
                    <div className="progress-pr-center-header">
                      <div>
                        <span className="metric-label">PR center</span>
                        <div className="progress-pr-center-meta">
                          <span className="metric-label">{ANALYTICS_TERMS.latestSignal} focus</span>
                          <p>
                            {filteredExercisePrSessions.length
                              ? `${filteredExercisePrSessions.length} ${filteredExercisePrSessions.length === 1 ? 'session' : 'sessions'} in ${selectedWindowLabelLower}`
                              : 'No PR sessions in this filter'}
                          </p>
                        </div>
                      </div>
                      <div className="progress-window-switcher" role="group" aria-label="Exercise PR filter">
                        {EXERCISE_PR_FILTERS.map((filter) => (
                          <button
                            key={filter.id}
                            type="button"
                            className={
                              filter.id === selectedExercisePrFilter
                                ? 'view-button active range-button'
                                : 'view-button range-button'
                            }
                            onClick={() => setSelectedExercisePrFilter(filter.id)}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="progress-pr-feed">
                    {filteredExercisePrSessions.length ? (
                      filteredExercisePrSessions.slice(0, 5).map((session) => (
                        <article key={`exercise-pr-${session.workoutId}`} className="progress-pr-card">
                          <div>
                            <span className="metric-label">PR session</span>
                            <strong>{formatDisplayDate(session.date)}</strong>
                            <p>{getExercisePrLead(session, formatNumber)}</p>
                          </div>
                          <div className="tag-row">
                            {session.personalRecords.weight && <span className="tag pr-tag">Weight PR</span>}
                            {session.personalRecords.reps && <span className="tag pr-tag">Reps PR</span>}
                            {session.personalRecords.volume && <span className="tag pr-tag">Volume PR</span>}
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="progress-pr-card progress-pr-card-empty">
                        <span className="metric-label">PR center</span>
                        <strong>No PR yet</strong>
                        <p>
                          {selectedExercisePrFilter === 'all'
                            ? 'Keep logging this exercise to build a clearer best-lift story.'
                            : `No ${EXERCISE_PR_FILTERS.find((filter) => filter.id === selectedExercisePrFilter)?.label.toLowerCase()} PRs in this range.`}
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="progress-module progress-module-chart">
                    <ProgressChart
                      sessions={selectedExerciseWindowHistory}
                      metric={selectedProgressMetric}
                      rangeLabel={selectedWindowLabel}
                    />
                  </div>
                </article>

                {selectedExerciseWindowHistory.length ? (
                  selectedExerciseWindowHistory.map((session) => (
                    <article key={session.workoutId} className="workout-card progress-card">
                      <div className="workout-card-header">
                        <strong>{formatDisplayDate(session.date)}</strong>
                        <span>
                          {metricConfig.label} {formatNumber(
                            selectedProgressMetric === 'weight'
                              ? session.metrics.bestWeight
                              : selectedProgressMetric === 'reps'
                                ? session.metrics.bestReps
                                : session.metrics.totalVolume,
                          )}
                        </span>
                      </div>
                      <div className="progress-metrics">
                        <div>
                          <span className="metric-label">Best weight</span>
                          <strong>{formatNumber(session.metrics.bestWeight)}</strong>
                        </div>
                        <div>
                          <span className="metric-label">Best reps</span>
                          <strong>{formatNumber(session.metrics.bestReps)}</strong>
                        </div>
                        <div>
                          <span className="metric-label">Total volume</span>
                          <strong>{formatNumber(session.metrics.totalVolume)}</strong>
                        </div>
                      </div>
                      <div className="tag-row">
                        {session.personalRecords.weight && <span className="tag pr-tag">Weight PR</span>}
                        {session.personalRecords.reps && <span className="tag pr-tag">Reps PR</span>}
                        {session.personalRecords.volume && <span className="tag pr-tag">Volume PR</span>}
                        {session.improvements.weight && <span className="tag">Weight up</span>}
                        {session.improvements.reps && <span className="tag">Reps up</span>}
                        {session.improvements.volume && <span className="tag">Volume up</span>}
                        {!session.previousMetrics && <span className="tag muted">First entry</span>}
                        {!hasPersonalRecord(session.personalRecords) &&
                          !hasImprovement(session.improvements) &&
                          session.previousMetrics && (
                            <span className="tag muted">No new high</span>
                          )}
                      </div>
                      <div className="previous-row progress-previous-row">
                        {session.previousMetrics ? (
                          <p>
                            {ANALYTICS_TERMS.baseline} vs previous entry • wt {formatNumber(session.previousMetrics.bestWeight)} • reps{' '}
                            {formatNumber(session.previousMetrics.bestReps)} • volume{' '}
                            {formatNumber(session.previousMetrics.totalVolume)}
                          </p>
                        ) : (
                          <p>No previous entry yet.</p>
                        )}
                      </div>
                      <ul className="set-list">
                        {session.sets.map((set, index) => (
                          <li key={`${session.workoutId}-${index}`}>
                            Set {index + 1}: {formatNumber(set.weight)} × {formatNumber(set.reps)}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title={`No entries in the last ${selectedProgressWindow} days`}
                    body="Choose a wider range or log a newer session."
                  />
                )}
              </div>
            ) : (
              <EmptyState
                title="No logged progress yet"
                body="Log this exercise to unlock progress."
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
}
