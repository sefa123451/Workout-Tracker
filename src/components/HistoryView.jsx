import React from 'react';
import EmptyState from './EmptyState.jsx';

export default function HistoryView({
  sortedWorkouts,
  getExerciseName,
  formatDisplayDate,
  formatNumber,
  getEntryMetrics,
  startEditingWorkout,
  deleteWorkout,
}) {
  return (
    <main className="content-grid">
      <section className="panel panel-wide">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout history</p>
            <h2>Past sessions</h2>
          </div>
        </div>
        {sortedWorkouts.length ? (
          <div className="history-list">
            {sortedWorkouts.map((workout) => (
              <article key={workout.id} className="workout-card">
                <div className="workout-card-header">
                  <div className="workout-card-title">
                    <strong>{formatDisplayDate(workout.date)}</strong>
                    <span>{workout.entries.length} exercises</span>
                  </div>
                  <div className="history-actions">
                    <button
                      type="button"
                      className="ghost-button action-button"
                      onClick={() => startEditingWorkout(workout.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button danger-button"
                      onClick={() => deleteWorkout(workout.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="workout-entry-list">
                  {workout.entries.map((entry) => {
                    const metrics = getEntryMetrics(entry);

                    return (
                      <div key={`${workout.id}-${entry.exerciseId}`} className="history-entry">
                        <div>
                          <h3>{getExerciseName(entry.exerciseId)}</h3>
                          <p>
                            Best weight {formatNumber(metrics.bestWeight)} • Best reps{' '}
                            {formatNumber(metrics.bestReps)} • Volume {formatNumber(metrics.totalVolume)}
                          </p>
                          <ul className="set-list">
                            {entry.sets.map((set, index) => (
                              <li key={`${workout.id}-${entry.exerciseId}-${index}`}>
                                Set {index + 1}: {formatNumber(set.weight)} ×{' '}
                                {formatNumber(set.reps)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Workout history is empty"
            body="Save a workout to start building up a timeline of your training sessions."
          />
        )}
      </section>
    </main>
  );
}
