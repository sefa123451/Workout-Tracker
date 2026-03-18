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
  moveSavedSplit,
  createSplitExercise,
  getExerciseName,
}) {
  function moveSplitExercise(fromIndex, toIndex) {
    setSplitForm((current) => {
      if (
        toIndex < 0 ||
        toIndex >= current.exercises.length ||
        fromIndex === toIndex
      ) {
        return current;
      }

      const nextExercises = [...current.exercises];
      const [movedExercise] = nextExercises.splice(fromIndex, 1);
      nextExercises.splice(toIndex, 0, movedExercise);

      return {
        ...current,
        exercises: nextExercises,
      };
    });
  }

  return (
    <>
      <section className="panel panel-wide panel-form">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout splits</p>
            <h2>{editingSplitId ? 'Edit split' : 'Split planner'}</h2>
          </div>
        </div>
        {!exercises.length ? (
          <EmptyState
            title="Create exercises first"
            body="Add exercises first, then build a split."
          />
        ) : (
          <form className="stack split-builder-form" onSubmit={handleSplitSubmit}>
            <div className="split-builder-summary">
              <div className="split-builder-summary-card split-builder-summary-card-primary">
                <span className="section-label">Planner</span>
                <strong>{splitForm.exercises.length}</strong>
                <p>{splitForm.exercises.length ? 'Exercises in this split' : 'Build a split from scratch'}</p>
              </div>
              <div className="split-builder-summary-card">
                <span className="section-label">Default flow</span>
                <strong>
                  {splitForm.exercises.length
                    ? splitForm.exercises.reduce(
                        (sum, exercise) => sum + (Number.parseInt(exercise.defaultSets, 10) || 0),
                        0,
                      )
                    : 0}
                </strong>
                <p>Total default sets across this split</p>
              </div>
            </div>

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

            <div className="stack split-config-list">
              {splitForm.exercises.length ? (
                splitForm.exercises.map((splitExercise, index) => (
                  <div key={splitExercise.id} className="split-config-row">
                    <div className="split-config-index">#{index + 1}</div>
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
                        className="ghost-button action-button"
                        aria-label={`Move split exercise ${index + 1} up`}
                        onClick={() => moveSplitExercise(index, index - 1)}
                        disabled={index === 0}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Move split exercise ${index + 1} down`}
                        onClick={() => moveSplitExercise(index, index + 1)}
                        disabled={index === splitForm.exercises.length - 1}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Remove split exercise ${index + 1}`}
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
                    <p>No exercises yet. Add one below or save this split for later.</p>
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
                Add exercise
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

      <section className="panel panel-wide panel-highlight">
        <div className="section-heading">
          <div>
            <p className="section-label">Saved splits</p>
            <h2>Saved splits</h2>
          </div>
        </div>
        {splits.length ? (
          <div className="split-grid split-library-grid">
            {splits.map((split) => (
                <article key={split.id} className="exercise-card split-card library-card">
                <div className="exercise-card-header">
                  <div>
                    <h3>{split.name}</h3>
                    <p>
                      {split.exercises.length
                        ? `${split.exercises.length} exercises`
                        : 'No exercises yet'}
                    </p>
                  </div>
                  <div className="history-actions">
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Move split ${split.name} up`}
                      onClick={() => moveSavedSplit(split.id, 'up')}
                      disabled={splits[0]?.id === split.id}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Move split ${split.name} down`}
                      onClick={() => moveSavedSplit(split.id, 'down')}
                      disabled={splits[splits.length - 1]?.id === split.id}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Edit split ${split.name}`}
                      onClick={() => startEditingSplit(split.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button danger-button"
                      aria-label={`Delete split ${split.name}`}
                      onClick={() => deleteSplit(split.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="split-card-summary">
                  <div className="split-card-kpi">
                    <span>Exercises</span>
                    <strong>{split.exercises.length}</strong>
                  </div>
                  <div className="split-card-kpi">
                    <span>Default sets</span>
                    <strong>
                      {split.exercises.reduce((sum, splitExercise) => sum + splitExercise.defaultSets, 0)}
                    </strong>
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
                    <p>This split is empty for now.</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No splits yet"
            body="Create a split to speed up logging."
          />
        )}
      </section>
    </>
  );
}
