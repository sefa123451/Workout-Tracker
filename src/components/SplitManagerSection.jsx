import React from 'react';
import EmptyState from './EmptyState.jsx';

export default function SplitManagerSection({
  exercises,
  splits,
  splitForm,
  setSplitForm,
  editingSplitId,
  splitMessage,
  handleSplitSubmit,
  resetSplitForm,
  startEditingSplit,
  deleteSplit,
  createSplitExercise,
  getExerciseName,
}) {
  return (
    <>
      <section className="panel panel-wide">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout splits</p>
            <h2>{editingSplitId ? 'Edit split' : 'Build a split'}</h2>
          </div>
        </div>
        {!exercises.length ? (
          <EmptyState
            title="Create exercises first"
            body="Splits use your saved exercises, so add a few movements before building Push, Pull, Legs, or any custom plan."
          />
        ) : (
          <form className="stack" onSubmit={handleSplitSubmit}>
            <label className="field">
              <span>Split name</span>
              <input
                type="text"
                value={splitForm.name}
                onChange={(event) =>
                  setSplitForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Push day"
              />
            </label>

            <div className="stack">
              {splitForm.exercises.length ? (
                splitForm.exercises.map((splitExercise, index) => (
                  <div key={splitExercise.id} className="split-config-row">
                    <label className="field">
                      <span>Exercise {index + 1}</span>
                      <select
                        value={splitExercise.exerciseId}
                        onChange={(event) =>
                          setSplitForm((current) => ({
                            ...current,
                            exercises: current.exercises.map((item) =>
                              item.id === splitExercise.id
                                ? { ...item, exerciseId: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      >
                        <option value="">Select an exercise</option>
                        {exercises.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field split-sets-field">
                      <span>Default sets</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={splitExercise.defaultSets}
                        onChange={(event) =>
                          setSplitForm((current) => ({
                            ...current,
                            exercises: current.exercises.map((item) =>
                              item.id === splitExercise.id
                                ? { ...item, defaultSets: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        placeholder="3"
                      />
                    </label>
                    <div className="split-config-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setSplitForm((current) => ({
                            ...current,
                            exercises:
                              current.exercises.length === 1
                                ? []
                                : current.exercises.filter((item) => item.id !== splitExercise.id),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-inline">
                  <p>No exercises in this split yet. Add one below or save the split empty for later.</p>
                </div>
              )}
            </div>

            <div className="actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setSplitForm((current) => ({
                    ...current,
                    exercises: [...current.exercises, createSplitExercise()],
                  }))
                }
              >
                Add exercise to split
              </button>
              <button type="submit" className="primary-button">
                {editingSplitId ? 'Save split' : 'Add split'}
              </button>
              {editingSplitId && (
                <button type="button" className="ghost-button" onClick={resetSplitForm}>
                  Cancel editing
                </button>
              )}
            </div>

            {splitMessage.text && (
              <p
                className={splitMessage.type === 'error' ? 'feedback error' : 'feedback success'}
                role={splitMessage.type === 'error' ? 'alert' : 'status'}
                aria-live={splitMessage.type === 'error' ? 'assertive' : 'polite'}
              >
                {splitMessage.text}
              </p>
            )}
          </form>
        )}
      </section>

      <section className="panel panel-wide">
        <div className="section-heading">
          <div>
            <p className="section-label">Saved splits</p>
            <h2>Ready for quick logging</h2>
          </div>
        </div>
        {splits.length ? (
          <div className="split-grid">
            {splits.map((split) => (
              <article key={split.id} className="exercise-card split-card">
                <div className="exercise-card-header">
                  <div>
                    <h3>{split.name}</h3>
                    <p>
                      {split.exercises.length
                        ? `${split.exercises.length} exercises configured`
                        : 'No exercises configured yet'}
                    </p>
                  </div>
                  <div className="history-actions">
                    <button
                      type="button"
                      className="ghost-button action-button"
                      onClick={() => startEditingSplit(split.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button danger-button"
                      onClick={() => deleteSplit(split.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {split.exercises.length ? (
                  <ul className="set-list">
                    {split.exercises.map((splitExercise) => (
                      <li key={splitExercise.id}>
                        {getExerciseName(splitExercise.exerciseId)} • {splitExercise.defaultSets} default
                        {splitExercise.defaultSets === 1 ? ' set' : ' sets'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-inline">
                    <p>This split is empty for now. You can still save it and fill it later.</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No splits yet"
            body="Create a split like Push, Pull, Legs, or Upper/Lower to speed up workout logging."
          />
        )}
      </section>
    </>
  );
}
