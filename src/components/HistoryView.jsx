import React from 'react';
import EmptyState from './EmptyState.jsx';

export default function HistoryView({
  sortedWorkouts,
  getExerciseName,
  getSplitName,
  formatDisplayDate,
  formatNumber,
  getEntryMetrics,
  startEditingWorkout,
  duplicateWorkout,
  deleteWorkout,
}) {
  return (
    <main className="content-grid history-layout">
      <section className="panel panel-wide panel-highlight">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout history</p>
            <h2>Past sessions</h2>
          </div>
        </div>
        {sortedWorkouts.length ? (
          <div className="history-list timeline-list">
            {sortedWorkouts.map((workout) => {
              const sessionVolume = workout.entries.reduce(
                (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
                0,
              );
              const sessionSets = workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0);

              return (
                <article key={workout.id} className="workout-card history-workout-card">
                  <div className="workout-card-header">
                    <div className="workout-card-title history-card-title">
                      <strong>{formatDisplayDate(workout.date)}</strong>
                      {workout.splitId ? <span>{getSplitName(workout.splitId)}</span> : null}
                      <span>{workout.entries.length} exercises</span>
                    </div>
                    <div className="history-actions">
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Edit workout from ${formatDisplayDate(workout.date)}`}
                        onClick={() => startEditingWorkout(workout.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Duplicate workout from ${formatDisplayDate(workout.date)}`}
                        onClick={() => duplicateWorkout(workout.id)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button danger-button"
                        aria-label={`Delete workout from ${formatDisplayDate(workout.date)}`}
                        onClick={() => deleteWorkout(workout.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="history-session-stats">
                    <div className="history-session-stat history-session-stat-primary">
                      <span>Volume</span>
                      <strong>{formatNumber(sessionVolume)}</strong>
                    </div>
                    <div className="history-session-stat">
                      <span>Sets</span>
                      <strong>{sessionSets}</strong>
                    </div>
                    <div className="history-session-stat">
                      <span>Moves</span>
                      <strong>{workout.entries.length}</strong>
                    </div>
                  </div>
                  <div className="workout-entry-list">
                    {workout.entries.map((entry) => {
                      const metrics = getEntryMetrics(entry);

                      return (
                        <div key={`${workout.id}-${entry.exerciseId}`} className="history-entry">
                          <div className="history-entry-header">
                            <div>
                              <h3>{getExerciseName(entry.exerciseId)}</h3>
                              <p>{entry.sets.length} sets logged</p>
                            </div>
                            <div className="activity-metrics history-entry-metrics">
                              <span>Wt {formatNumber(metrics.bestWeight)}</span>
                              <span>Rp {formatNumber(metrics.bestReps)}</span>
                              <span>Vol {formatNumber(metrics.totalVolume)}</span>
                            </div>
                          </div>
                          <ul className="set-list">
                            {entry.sets.map((set, index) => (
                              <li key={`${workout.id}-${entry.exerciseId}-${index}`}>
                                Set {index + 1}: {formatNumber(set.weight)} × {formatNumber(set.reps)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Workout history is empty"
            body="Save a workout to start your timeline."
          />
        )}
      </section>
    </main>
  );
}
