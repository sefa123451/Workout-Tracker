import React from 'react';
import EmptyState from './EmptyState.jsx';
import { getLatestExerciseSession } from '../lib/workoutData.js';

export default function WorkoutFormView({
  exercises,
  workouts,
  workoutForm,
  editingWorkoutId,
  workoutMessage,
  setWorkoutForm,
  updateWorkoutEntry,
  applyLatestWorkoutToEntry,
  handleWorkoutSubmit,
  resetWorkoutForm,
  createSet,
  createSetFromValues,
  createWorkoutEntry,
  formatDisplayDate,
  formatNumber,
}) {
  return (
    <main className="content-grid">
      <section className="panel panel-wide">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout logging</p>
            <h2>{editingWorkoutId ? 'Edit a saved workout' : 'Log a workout by date'}</h2>
          </div>
        </div>
        {!exercises.length ? (
          <EmptyState
            title="Create exercises first"
            body="The workout form becomes available as soon as you add at least one exercise."
          />
        ) : (
          <form className="stack" onSubmit={handleWorkoutSubmit}>
            <label className="field field-compact">
              <span>Workout date</span>
              <input
                type="date"
                value={workoutForm.date}
                onChange={(event) =>
                  setWorkoutForm((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>

            <div className="stack">
              {workoutForm.entries.map((entry, entryIndex) => {
                const latestSession = getLatestExerciseSession(workouts, entry.exerciseId);

                return (
                  <article key={entry.id} className="entry-card">
                    <div className="entry-card-header">
                      <h3>Exercise {entryIndex + 1}</h3>
                      {workoutForm.entries.length > 1 && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() =>
                            setWorkoutForm((current) => ({
                              ...current,
                              entries: current.entries.filter((item) => item.id !== entry.id),
                            }))
                          }
                        >
                          Remove exercise
                        </button>
                      )}
                    </div>

                    <label className="field">
                      <span>Exercise</span>
                      <select
                        value={entry.exerciseId}
                        onChange={(event) =>
                          updateWorkoutEntry(entry.id, (currentEntry) => ({
                            ...currentEntry,
                            exerciseId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select an exercise</option>
                        {entry.exerciseId &&
                          !exercises.some((exercise) => exercise.id === entry.exerciseId) && (
                            <option value={entry.exerciseId}>Unknown exercise (deleted)</option>
                          )}
                        {exercises.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {latestSession && (
                      <div className="suggestion-card">
                        <div className="suggestion-header">
                          <div>
                            <span className="metric-label">Last workout</span>
                            <p>
                              {formatDisplayDate(latestSession.date)} • Volume{' '}
                              {formatNumber(latestSession.metrics.totalVolume)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="ghost-button action-button"
                            onClick={() => applyLatestWorkoutToEntry(entry.id, latestSession)}
                          >
                            Use last workout
                          </button>
                        </div>
                        <ul className="set-list compact-set-list">
                          {latestSession.sets.map((set, index) => (
                            <li key={`${latestSession.workoutId}-${index}`}>
                              Set {index + 1}: {formatNumber(set.weight)} × {formatNumber(set.reps)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="sets-stack">
                      {entry.sets.map((set, setIndex) => (
                        <div key={set.id} className="set-row">
                          <label className="field">
                            <span>Weight</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={set.weight}
                              onChange={(event) =>
                                updateWorkoutEntry(entry.id, (currentEntry) => ({
                                  ...currentEntry,
                                  sets: currentEntry.sets.map((currentSet) =>
                                    currentSet.id === set.id
                                      ? { ...currentSet, weight: event.target.value }
                                      : currentSet,
                                  ),
                                }))
                              }
                              placeholder="0"
                            />
                          </label>
                          <label className="field">
                            <span>Reps</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={set.reps}
                              onChange={(event) =>
                                updateWorkoutEntry(entry.id, (currentEntry) => ({
                                  ...currentEntry,
                                  sets: currentEntry.sets.map((currentSet) =>
                                    currentSet.id === set.id
                                      ? { ...currentSet, reps: event.target.value }
                                      : currentSet,
                                  ),
                                }))
                              }
                              placeholder="0"
                            />
                          </label>
                          <div className="set-actions">
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() =>
                                updateWorkoutEntry(entry.id, (currentEntry) => ({
                                  ...currentEntry,
                                  sets: [
                                    ...currentEntry.sets,
                                    createSetFromValues(set.weight, set.reps),
                                  ],
                                }))
                              }
                            >
                              Copy set
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() =>
                                updateWorkoutEntry(entry.id, (currentEntry) => ({
                                  ...currentEntry,
                                  sets:
                                    currentEntry.sets.length === 1
                                      ? [createSet()]
                                      : currentEntry.sets.filter((currentSet) => currentSet.id !== set.id),
                                }))
                              }
                            >
                              {entry.sets.length === 1 && setIndex === 0 ? 'Clear set' : 'Remove set'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        updateWorkoutEntry(entry.id, (currentEntry) => ({
                          ...currentEntry,
                          sets: [...currentEntry.sets, createSet()],
                        }))
                      }
                    >
                      Add set
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setWorkoutForm((current) => ({
                    ...current,
                    entries: [...current.entries, createWorkoutEntry()],
                  }))
                }
              >
                Add exercise to workout
              </button>
              {editingWorkoutId && (
                <button type="button" className="ghost-button" onClick={resetWorkoutForm}>
                  Cancel editing
                </button>
              )}
              <button type="submit" className="primary-button">
                {editingWorkoutId ? 'Save changes' : 'Save workout'}
              </button>
            </div>

            {workoutMessage.text && (
              <p
                className={workoutMessage.type === 'error' ? 'feedback error' : 'feedback success'}
                role={workoutMessage.type === 'error' ? 'alert' : 'status'}
                aria-live={workoutMessage.type === 'error' ? 'assertive' : 'polite'}
              >
                {workoutMessage.text}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
