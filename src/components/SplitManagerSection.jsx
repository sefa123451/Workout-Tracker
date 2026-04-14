import React from 'react';

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
      if (toIndex < 0 || toIndex >= current.exercises.length || fromIndex === toIndex) {
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

  const splitEmptyState = !exercises.length
    ? {
        title: 'No splits yet',
        intro: 'Splits work best once you have a few core exercises ready.',
        body: 'Build the movement library first, then turn it into a repeatable weekly structure.',
        highlights: ['Exercises first', 'Splits organize the week'],
        primaryHref: '#exercise-form',
        primaryLabel: 'Add exercises',
        secondaryHref: '#split-planner',
        secondaryLabel: 'Preview planner',
        tone: 'subtle',
      }
    : {
        title: 'No splits yet',
        intro: 'Your library is ready for a repeatable weekly plan.',
        body: 'Shape the first split so workout starts feel faster and more consistent.',
        highlights: [`${exercises.length} exercises ready`, 'Splits shorten workout setup'],
        primaryHref: '#split-planner',
        primaryLabel: 'Open split planner',
        secondaryHref: '#exercise-library',
        secondaryLabel: 'Review exercises',
        tone: 'primary',
      };

  return (
    <>
      <section id="split-library" className="panel panel-wide panel-highlight library-panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Saved splits</p>
            <h2>Saved splits</h2>
            <p className="section-body">
              Keep repeatable weekly structures beside exercises and templates in the same setup
              system.
            </p>
          </div>
        </div>
        {splits.length ? (
          <div className="split-grid split-library-grid">
            {splits.map((split) => (
              <article
                key={split.id}
                className="exercise-card split-card library-card library-card-asset library-card-ready"
              >
                <div className="exercise-card-header">
                  <div>
                    <span className="library-card-status library-card-status-ready">
                      Repeatable plan
                    </span>
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
                <div className="library-card-story">
                  <strong>
                    {split.exercises.length ? 'Weekly structure ready' : 'Needs exercises'}
                  </strong>
                  <p>
                    {split.exercises.length
                      ? `Built for ${split.weeklyTarget ?? 1} ${Number(split.weeklyTarget ?? 1) === 1 ? 'session' : 'sessions'} per week with default set guidance.`
                      : 'Add exercises to make this split useful for fast workout starts.'}
                  </p>
                </div>
                <div className="split-card-summary">
                  <div className="split-card-kpi">
                    <span>Exercises</span>
                    <strong>{split.exercises.length}</strong>
                  </div>
                  <div className="split-card-kpi">
                    <span>Default sets</span>
                    <strong>
                      {split.exercises.reduce(
                        (sum, splitExercise) => sum + splitExercise.defaultSets,
                        0,
                      )}
                    </strong>
                  </div>
                  <div className="split-card-kpi">
                    <span>Weekly target</span>
                    <strong>{split.weeklyTarget ?? 1}x</strong>
                  </div>
                </div>
                <div className="library-card-action-row library-card-action-row-secondary">
                  <button
                    type="button"
                    className="ghost-button action-button"
                    aria-label={`Move split ${split.name} up`}
                    onClick={() => moveSavedSplit(split.id, 'up')}
                    disabled={splits[0]?.id === split.id}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="ghost-button action-button"
                    aria-label={`Move split ${split.name} down`}
                    onClick={() => moveSavedSplit(split.id, 'down')}
                    disabled={splits[splits.length - 1]?.id === split.id}
                  >
                    Move down
                  </button>
                </div>
                {split.exercises.length ? (
                  <ul className="set-list">
                    {split.exercises.map((splitExercise) => (
                      <li key={splitExercise.id}>
                        {getExerciseName(splitExercise.exerciseId)} • {splitExercise.defaultSets}{' '}
                        default
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
          <article className={`library-state-card library-state-card-${splitEmptyState.tone}`}>
            <div className="library-state-copy">
              <p className="section-label">Weekly structure</p>
              <h3>{splitEmptyState.title}</h3>
              <p>{splitEmptyState.intro}</p>
              <p>{splitEmptyState.body}</p>
            </div>
            <div className="library-state-highlights" aria-label="Split setup cues">
              {splitEmptyState.highlights.map((highlight) => (
                <span key={highlight} className="library-state-highlight">
                  {highlight}
                </span>
              ))}
            </div>
            <div className="library-state-actions">
              <a
                className="primary-button action-button setup-link-button"
                href={splitEmptyState.primaryHref}
              >
                {splitEmptyState.primaryLabel}
              </a>
              <a
                className="ghost-button action-button setup-link-button"
                href={splitEmptyState.secondaryHref}
              >
                {splitEmptyState.secondaryLabel}
              </a>
            </div>
          </article>
        )}
      </section>

      <section
        id="split-planner"
        className="panel panel-wide panel-form library-panel library-builder-panel"
      >
        <div className="section-heading">
          <div>
            <p className="section-label">Next setup</p>
            <h2>{editingSplitId ? 'Edit split' : 'Split planner'}</h2>
            <p className="section-body">
              Turn the current exercise base into a repeatable weekly structure.
            </p>
          </div>
        </div>
        {!exercises.length ? (
          <article className="library-state-card library-state-card-inline">
            <div className="library-state-copy">
              <p className="section-label">Planner unlocked next</p>
              <h3>Create exercises first</h3>
              <p>Add exercises first, then build a split.</p>
              <p>The planner becomes much clearer once your core movements already exist.</p>
            </div>
            <div className="library-state-actions">
              <a className="primary-button action-button setup-link-button" href="#exercise-form">
                Open exercise setup
              </a>
            </div>
          </article>
        ) : (
          <form className="stack split-builder-form" onSubmit={handleSplitSubmit}>
            <div className="library-builder-intro">
              <div className="library-builder-intro-copy">
                <strong>
                  {editingSplitId ? 'Tighten the current split' : 'Shape the next repeatable plan'}
                </strong>
                <p>
                  Define the split name, weekly rhythm, and exercise order so workout starts stay
                  consistent.
                </p>
              </div>
              <div className="library-builder-intro-rail">
                <span className="library-builder-chip">Split name</span>
                <span className="library-builder-chip">Weekly target</span>
                <span className="library-builder-chip">Exercise order</span>
              </div>
            </div>
            <div className="split-builder-summary split-builder-summary-compact">
              <div className="split-builder-summary-card split-builder-summary-card-primary">
                <span className="section-label">Planner</span>
                <strong>{splitForm.exercises.length}</strong>
                <p>
                  {splitForm.exercises.length
                    ? 'Exercises in this split'
                    : 'Build a split from scratch'}
                </p>
              </div>
              <div className="split-builder-summary-card">
                <span className="section-label">Weekly target</span>
                <strong>{splitForm.weeklyTarget || '1'}x</strong>
                <p>Current weekly rhythm for this split.</p>
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
            <label className="field field-compact">
              <span>Weekly target</span>
              <select
                value={splitForm.weeklyTarget}
                onChange={(event) =>
                  setSplitForm((current) => ({ ...current, weeklyTarget: event.target.value }))
                }
              >
                {Array.from({ length: 7 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={String(value)}>
                    {value}x per week
                  </option>
                ))}
              </select>
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

            <div className="library-builder-actions">
              <button type="submit" className="primary-button">
                {editingSplitId ? 'Save split' : 'Add split'}
              </button>
              <div className="library-builder-actions-secondary">
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
                {editingSplitId ? (
                  <button type="button" className="ghost-button" onClick={resetSplitForm}>
                    Cancel editing
                  </button>
                ) : null}
              </div>
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
    </>
  );
}
