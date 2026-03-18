import React from 'react';
import EmptyState from './EmptyState.jsx';
import ProgressChart from './ProgressChart.jsx';
import StatCard from './StatCard.jsx';

const PROGRESS_METRIC_OPTIONS = [
  { id: 'volume', label: 'Volume', bestLabel: 'Best volume', latestLabel: 'Latest volume' },
  { id: 'weight', label: 'Weight', bestLabel: 'Best weight', latestLabel: 'Latest weight' },
  { id: 'reps', label: 'Reps', bestLabel: 'Best reps', latestLabel: 'Latest reps' },
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
  const latestSplitSession = selectedSplitWindowHistory[0] ?? null;
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
  const exerciseSignalLabels = getExerciseSignalLabels(latestSession);
  const splitSignalLabels = getSplitSignalLabels(latestSplitSession);

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
              <div className="progress-selector-stack">
                {splits.length > 0 && (
                  <div className="progress-window-switcher progress-mode-switcher" role="group" aria-label="Progress type">
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

                {selectedProgressView === 'split' ? (
                  splits.length ? (
                    <label className="field field-compact">
                      <span>Select split</span>
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
                    </label>
                  ) : (
                    <EmptyState
                      title="No splits available"
                      body="Create a split to track how full workout days evolve over time."
                    />
                  )
                ) : (
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
                )}
              </div>
              <div className="progress-controls">
                {selectedProgressView === 'exercise' && (
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
                )}
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

            {selectedProgressView === 'split' ? (
              splits.length ? (
                selectedSplitHistory.length ? (
                  <div className="history-list">
                    <article className="workout-card progress-overview">
                      <div className="workout-card-header">
                        <strong>{getSplitName(selectedSplitProgressId)} trend</strong>
                        <span>Last {selectedProgressWindow} days</span>
                      </div>
                      <div className="progress-highlight-grid">
                        <div className="progress-spotlight-card progress-spotlight-card-primary">
                          <span className="metric-label">Latest volume</span>
                          <strong>
                            {selectedSplitWindowSummary
                              ? formatNumber(selectedSplitWindowSummary.latestVolume)
                              : '--'}
                          </strong>
                          <p>
                            {selectedSplitWindowHistory[0]
                              ? `Logged ${formatDisplayDate(selectedSplitWindowHistory[0].date)}`
                              : 'No entries in range'}
                          </p>
                        </div>
                        <div className="progress-spotlight-card">
                          <span className="metric-label">Peak volume</span>
                          <strong>
                            {selectedSplitWindowSummary
                              ? formatNumber(selectedSplitWindowSummary.bestVolume)
                              : '--'}
                          </strong>
                          <p>{selectedSplitHistory.length ? 'Across split sessions' : 'No history yet'}</p>
                        </div>
                        <div className="progress-spotlight-card">
                          <span className="metric-label">Range change</span>
                          <strong>
                            {selectedSplitWindowSummary?.comparison
                              ? formatDelta(selectedSplitWindowSummary.comparison.volumeDelta)
                              : '--'}
                          </strong>
                          <p>
                            {selectedSplitWindowSummary?.comparison
                              ? `vs ${formatDisplayDate(selectedSplitWindowSummary.comparison.firstDate)}`
                              : 'Need 2 entries'}
                          </p>
                        </div>
                      </div>
                      <div className="stats-grid progress-summary-grid">
                        <StatCard
                          label="Sessions"
                          value={
                            selectedSplitWindowSummary
                              ? String(selectedSplitWindowSummary.sessionCount)
                              : '--'
                          }
                          helper={
                            selectedSplitWindowSummary
                              ? `${selectedProgressWindow} days`
                              : 'No entries'
                          }
                        />
                        <StatCard
                          label="Avg volume"
                          value={
                            selectedSplitWindowSummary
                              ? formatNumber(selectedSplitWindowSummary.averageVolume)
                              : '--'
                          }
                          helper={selectedSplitWindowSummary ? 'Per split session' : 'No entries'}
                        />
                        <StatCard
                          label="Avg sets"
                          value={
                            selectedSplitWindowSummary
                              ? formatNumber(selectedSplitWindowSummary.averageSets)
                              : '--'
                          }
                          helper={selectedSplitWindowSummary ? 'Per split session' : 'No entries'}
                        />
                      </div>
                      <div className="progress-insight-row">
                        <div className="progress-insight-card progress-insight-card-primary">
                          <span className="metric-label">Peak session</span>
                          <strong>
                            {selectedSplitWindowSummary
                              ? formatDisplayDate(selectedSplitWindowSummary.bestVolumeDate)
                              : '--'}
                          </strong>
                          <p>
                            {selectedSplitWindowSummary
                              ? `${formatNumber(selectedSplitWindowSummary.bestVolume)} volume`
                              : 'No entries yet'}
                          </p>
                        </div>
                        <div className="progress-insight-card progress-insight-card-secondary">
                          <span className="metric-label">Wins in range</span>
                          <strong>
                            {selectedSplitWindowSummary
                              ? String(selectedSplitWindowSummary.recentImprovementCount)
                              : '--'}
                          </strong>
                          <p>Sessions with stronger split signals</p>
                        </div>
                        <div className="progress-insight-card progress-insight-card-tertiary">
                          <span className="metric-label">Latest signal</span>
                          <strong>{splitSignalLabels[0] ?? '--'}</strong>
                          <p>
                            {splitSignalLabels.length
                              ? splitSignalLabels.join(' • ')
                              : 'Stable compared with the previous split log'}
                          </p>
                        </div>
                      </div>
                      <ProgressChart sessions={selectedSplitWindowHistory} metric="volume" />
                      <div className="previous-row">
                        {selectedSplitWindowSummary?.comparison ? (
                          <p>
                            vs {formatDisplayDate(selectedSplitWindowSummary.comparison.firstDate)} • vol{' '}
                            {formatDelta(selectedSplitWindowSummary.comparison.volumeDelta)} • sets{' '}
                            {formatDelta(selectedSplitWindowSummary.comparison.setsDelta)} • moves{' '}
                            {formatDelta(selectedSplitWindowSummary.comparison.exerciseDelta)}
                          </p>
                        ) : (
                          <p>Log one more split session to compare this range.</p>
                        )}
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
                          <div className="previous-row">
                            {session.previousMetrics ? (
                              <p>
                                Prev • volume {formatNumber(session.previousMetrics.totalVolume)} • sets{' '}
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
                  <div className="progress-insight-row">
                    <div className="progress-insight-card progress-insight-card-primary">
                      <span className="metric-label">Peak session</span>
                      <strong>
                        {selectedExerciseWindowSummary
                          ? formatDisplayDate(
                              selectedProgressMetric === 'weight'
                                ? selectedExerciseWindowSummary.bestWeightDate
                                : selectedProgressMetric === 'reps'
                                  ? selectedExerciseWindowSummary.bestRepsDate
                                  : selectedExerciseWindowSummary.bestVolumeDate,
                            )
                          : '--'}
                      </strong>
                      <p>
                        {selectedExerciseWindowSummary
                          ? `${formatNumber(metricValue.best)} ${metricConfig.label.toLowerCase()}`
                          : 'No entries yet'}
                      </p>
                    </div>
                    <div className="progress-insight-card progress-insight-card-secondary">
                      <span className="metric-label">Wins in range</span>
                      <strong>
                        {selectedExerciseWindowSummary
                          ? String(selectedExerciseWindowSummary.recentImprovementCount)
                          : '--'}
                      </strong>
                      <p>Sessions with stronger exercise signals</p>
                    </div>
                    <div className="progress-insight-card progress-insight-card-tertiary">
                      <span className="metric-label">Latest signal</span>
                      <strong>{exerciseSignalLabels[0] ?? '--'}</strong>
                      <p>
                        {exerciseSignalLabels.length
                          ? exerciseSignalLabels.join(' • ')
                          : 'Stable compared with the previous entry'}
                      </p>
                    </div>
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
