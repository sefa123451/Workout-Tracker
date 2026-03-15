import React from 'react';
import EmptyState from './EmptyState.jsx';
import ProgressChart from './ProgressChart.jsx';
import StatCard from './StatCard.jsx';

const PROGRESS_METRIC_OPTIONS = [
  { id: 'volume', label: 'Volume', bestLabel: 'Best volume', latestLabel: 'Latest volume' },
  { id: 'weight', label: 'Weight', bestLabel: 'Best weight', latestLabel: 'Latest weight' },
  { id: 'reps', label: 'Reps', bestLabel: 'Best reps', latestLabel: 'Latest reps' },
];

export default function ProgressView({
  exercises,
  selectedExerciseId,
  setSelectedExerciseId,
  progressWindows,
  selectedProgressWindow,
  setSelectedProgressWindow,
  selectedProgressMetric,
  setSelectedProgressMetric,
  selectedExerciseHistory,
  selectedExerciseWindowHistory,
  selectedExerciseWindowSummary,
  formatDisplayDate,
  formatDelta,
  formatNumber,
  hasPersonalRecord,
  hasImprovement,
}) {
  const metricConfig =
    PROGRESS_METRIC_OPTIONS.find((option) => option.id === selectedProgressMetric) ??
    PROGRESS_METRIC_OPTIONS[0];

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
  const allTimeBest = selectedExerciseHistory.length
    ? Math.max(
        ...selectedExerciseHistory.map((session) =>
          selectedProgressMetric === 'weight'
            ? session.metrics.bestWeight
            : selectedProgressMetric === 'reps'
              ? session.metrics.bestReps
              : session.metrics.totalVolume,
        ),
      )
    : 0;

  return (
    <main className="content-grid progress-layout">
      <section className="panel panel-wide panel-highlight progress-panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Progress view</p>
            <h2>Exercise progress</h2>
          </div>
        </div>
        {!exercises.length ? (
          <EmptyState
            title="No exercises available"
            body="Create an exercise, then log a session."
          />
        ) : (
          <div className="stack">
            <div className="progress-toolbar progress-control-shell">
              <label className="field field-compact">
                <span>Select exercise</span>
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
              </label>
              <div className="progress-controls">
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
                <div className="progress-window-switcher" role="group" aria-label="Progress comparison window">
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

            {selectedExerciseHistory.length ? (
              <div className="history-list">
                <article className="workout-card progress-overview">
                  <div className="workout-card-header">
                    <strong>{metricConfig.label} trend</strong>
                    <span>Last {selectedProgressWindow} days</span>
                  </div>
                  <div className="progress-highlight-grid">
                    <div className="progress-spotlight-card progress-spotlight-card-primary">
                      <span className="metric-label">Latest {metricConfig.label}</span>
                      <strong>{latestSession ? formatNumber(metricValue.latest) : '--'}</strong>
                      <p>
                        {latestSession
                          ? `Logged ${formatDisplayDate(latestSession.date)}`
                          : 'No entries in range'}
                      </p>
                    </div>
                    <div className="progress-spotlight-card">
                      <span className="metric-label">All-time peak</span>
                      <strong>{selectedExerciseHistory.length ? formatNumber(allTimeBest) : '--'}</strong>
                      <p>{selectedExerciseHistory.length ? 'Across all sessions' : 'No history yet'}</p>
                    </div>
                    <div className="progress-spotlight-card">
                      <span className="metric-label">Range change</span>
                      <strong>
                        {selectedExerciseWindowSummary?.comparison
                          ? formatDelta(metricValue.delta)
                          : '--'}
                      </strong>
                      <p>
                        {selectedExerciseWindowSummary?.comparison
                          ? `vs ${formatDisplayDate(selectedExerciseWindowSummary.comparison.firstDate)}`
                          : 'Need 2 entries'}
                      </p>
                    </div>
                  </div>
                  <div className="stats-grid progress-summary-grid">
                    <StatCard
                      label="Sessions"
                      value={
                        selectedExerciseWindowSummary
                          ? String(selectedExerciseWindowSummary.sessionCount)
                          : '--'
                      }
                      helper={
                        selectedExerciseWindowSummary
                          ? `${selectedProgressWindow} days`
                          : 'No entries'
                      }
                    />
                    <StatCard
                      label="PR hits"
                      value={
                        selectedExerciseWindowSummary
                          ? String(selectedExerciseWindowSummary.personalRecordCount)
                          : '--'
                      }
                      helper={
                        selectedExerciseWindowSummary
                          ? `${selectedProgressWindow} days`
                          : 'No entries'
                      }
                    />
                    <StatCard
                      label="Avg volume"
                      value={
                        selectedExerciseWindowSummary
                          ? formatNumber(selectedExerciseWindowSummary.averageVolume)
                          : '--'
                      }
                      helper={
                        selectedExerciseWindowSummary
                          ? 'Per session'
                          : 'No entries'
                      }
                    />
                  </div>
                  <ProgressChart sessions={selectedExerciseWindowHistory} metric={selectedProgressMetric} />
                  <div className="previous-row">
                    {selectedExerciseWindowSummary?.comparison ? (
                      <p>
                        vs {formatDisplayDate(selectedExerciseWindowSummary.comparison.firstDate)} • wt{' '}
                        {formatDelta(selectedExerciseWindowSummary.comparison.weightDelta)} • reps{' '}
                        {formatDelta(selectedExerciseWindowSummary.comparison.repsDelta)} • vol{' '}
                        {formatDelta(selectedExerciseWindowSummary.comparison.volumeDelta)}
                      </p>
                    ) : (
                      <p>Log one more entry to compare this range.</p>
                    )}
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
                      <div className="previous-row">
                        {session.previousMetrics ? (
                          <p>
                            Prev • wt {formatNumber(session.previousMetrics.bestWeight)} • reps{' '}
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
