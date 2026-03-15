import React from 'react';
import EmptyState from './EmptyState.jsx';
import ProgressChart from './ProgressChart.jsx';
import StatCard from './StatCard.jsx';

export default function ProgressView({
  exercises,
  selectedExerciseId,
  setSelectedExerciseId,
  progressWindows,
  selectedProgressWindow,
  setSelectedProgressWindow,
  selectedExerciseHistory,
  selectedExerciseWindowHistory,
  selectedExerciseWindowSummary,
  formatDisplayDate,
  formatDelta,
  formatNumber,
  hasPersonalRecord,
  hasImprovement,
}) {
  return (
    <main className="content-grid">
      <section className="panel panel-wide">
        <div className="section-heading">
          <div>
            <p className="section-label">Progress view</p>
            <h2>Track one exercise over time</h2>
          </div>
        </div>
        {!exercises.length ? (
          <EmptyState
            title="No exercises available"
            body="Create an exercise first, then its progress will appear after you log workouts."
          />
        ) : (
          <div className="stack">
            <div className="progress-toolbar">
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

            {selectedExerciseHistory.length ? (
              <div className="history-list">
                <article className="workout-card progress-overview">
                  <div className="workout-card-header">
                    <strong>Volume trend</strong>
                    <span>Last {selectedProgressWindow} days</span>
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
                          ? `Entries in the last ${selectedProgressWindow} days`
                          : 'No entries in this range'
                      }
                    />
                    <StatCard
                      label="Best volume"
                      value={
                        selectedExerciseWindowSummary
                          ? formatNumber(selectedExerciseWindowSummary.bestVolume)
                          : '--'
                      }
                      helper={
                        selectedExerciseWindowSummary
                          ? 'Highest total volume in the selected range'
                          : 'No entries in this range'
                      }
                    />
                    <StatCard
                      label="Latest volume"
                      value={
                        selectedExerciseWindowSummary
                          ? formatNumber(selectedExerciseWindowSummary.latestVolume)
                          : '--'
                      }
                      helper={
                        selectedExerciseWindowSummary
                          ? 'Most recent workout volume in the selected range'
                          : 'No entries in this range'
                      }
                    />
                  </div>
                  <ProgressChart sessions={selectedExerciseWindowHistory} />
                  <div className="previous-row">
                    {selectedExerciseWindowSummary?.comparison ? (
                      <p>
                        Compared with{' '}
                        {formatDisplayDate(selectedExerciseWindowSummary.comparison.firstDate)}: weight{' '}
                        {formatDelta(selectedExerciseWindowSummary.comparison.weightDelta)} • reps{' '}
                        {formatDelta(selectedExerciseWindowSummary.comparison.repsDelta)} • volume{' '}
                        {formatDelta(selectedExerciseWindowSummary.comparison.volumeDelta)}
                      </p>
                    ) : (
                      <p>Log at least two entries in this window to compare the trend.</p>
                    )}
                  </div>
                </article>

                {selectedExerciseWindowHistory.length ? (
                  selectedExerciseWindowHistory.map((session) => (
                    <article key={session.workoutId} className="workout-card progress-card">
                      <div className="workout-card-header">
                        <strong>{formatDisplayDate(session.date)}</strong>
                        <span>Volume {formatNumber(session.metrics.totalVolume)}</span>
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
                        {!session.previousMetrics && (
                          <span className="tag muted">First logged entry for this exercise</span>
                        )}
                        {!hasPersonalRecord(session.personalRecords) &&
                          !hasImprovement(session.improvements) &&
                          session.previousMetrics && (
                            <span className="tag muted">No metric improved vs previous entry</span>
                          )}
                      </div>
                      <div className="previous-row">
                        {session.previousMetrics ? (
                          <p>
                            Previous: weight {formatNumber(session.previousMetrics.bestWeight)} • reps{' '}
                            {formatNumber(session.previousMetrics.bestReps)} • volume{' '}
                            {formatNumber(session.previousMetrics.totalVolume)}
                          </p>
                        ) : (
                          <p>No previous entry to compare yet.</p>
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
                    body="Choose a wider range or log a newer workout for this exercise."
                  />
                )}
              </div>
            ) : (
              <EmptyState
                title="No logged progress yet"
                body="Log this exercise in a workout and its history plus improvements will show up here."
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
}
