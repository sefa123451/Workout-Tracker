import React from 'react';
import SplitManagerSection from './SplitManagerSection.jsx';

export default function ExerciseView({
  editingExerciseId,
  exerciseName,
  setExerciseName,
  exerciseTargetWeight,
  setExerciseTargetWeight,
  exerciseTargetRepMin,
  setExerciseTargetRepMin,
  exerciseTargetRepMax,
  setExerciseTargetRepMax,
  exerciseWeightStep,
  setExerciseWeightStep,
  handleExerciseSubmit,
  resetExerciseForm,
  exerciseMessage,
  exercises,
  formatCalendarDate,
  startEditingExercise,
  deleteExercise,
  moveExercise,
  splits,
  templates,
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
  loadWorkoutTemplate,
  deleteWorkoutTemplate,
  moveWorkoutTemplate,
  renameWorkoutTemplate,
  duplicateWorkoutTemplate,
  createSplitFromTemplate,
  startEditingWorkoutTemplate,
}) {
  function classifyExerciseReadiness(exercise) {
    const hasRepGoal = Boolean(exercise.targetRepMin || exercise.targetRepMax);
    const hasWeightGoal = Boolean(exercise.targetWeight);
    const hasAnyGuidance = hasRepGoal || hasWeightGoal;
    const name = exercise.name?.toLowerCase() ?? '';
    const bodyweightLikely = [
      'pull-up',
      'pull up',
      'chin-up',
      'chin up',
      'dip',
      'push-up',
      'push up',
      'plank',
    ].some((term) => name.includes(term));
    const cardioLikely = ['run', 'walk', 'row', 'bike', 'cycle', 'elliptical', 'sprint'].some(
      (term) => name.includes(term),
    );

    if (!hasAnyGuidance) {
      return {
        tone: 'missing',
        label: 'Needs setup',
        title: 'Next: add target guidance',
        body: 'Add a rep range or target weight so logging and progress feel more guided.',
        actionLabel: 'Finish setup',
        missingLabel: 'What still needs setup: add goal guidance',
        hasRepGoal,
        hasWeightGoal,
      };
    }

    if (hasRepGoal && hasWeightGoal) {
      return {
        tone: 'complete',
        label: 'Fully guided',
        title: 'Ready for logging and progress',
        body: `Goal ${exercise.targetRepMin ?? '--'}-${exercise.targetRepMax ?? '--'} reps with ${exercise.targetWeight} kg target already supports clearer logging cues.`,
        actionLabel: 'Refine guidance',
        missingLabel: '',
        hasRepGoal,
        hasWeightGoal,
      };
    }

    if (hasRepGoal && (bodyweightLikely || cardioLikely)) {
      return {
        tone: 'complete',
        label: 'Well guided',
        title: 'Ready with rep guidance',
        body: 'Rep guidance is already in place, which is enough for this movement to stay clear inside logging and review.',
        actionLabel: 'Refine guidance',
        missingLabel: '',
        hasRepGoal,
        hasWeightGoal,
      };
    }

    return {
      tone: 'partial',
      label: 'Partly guided',
      title: hasRepGoal ? 'Next: add a weight target' : 'Next: add a rep range',
      body: hasRepGoal
        ? 'Rep guidance is already set. Add a target weight to make overload progress easier to read.'
        : 'Weight guidance is already set. Add a rep range so each set has a clearer completion target.',
      actionLabel: 'Finish setup',
      missingLabel: 'One guidance layer is still missing',
      hasRepGoal,
      hasWeightGoal,
    };
  }

  const exerciseReadiness = exercises.map((exercise) => ({
    exercise,
    readiness: classifyExerciseReadiness(exercise),
  }));

  const exercisesWithTargets = exercises.filter(
    (exercise) => exercise.targetRepMin || exercise.targetRepMax || exercise.targetWeight,
  ).length;
  const exercisesFullyGuided = exerciseReadiness.filter(
    ({ readiness }) => readiness.tone === 'complete',
  ).length;
  const exercisesPartlyGuided = exerciseReadiness.filter(
    ({ readiness }) => readiness.tone === 'partial',
  ).length;
  const exercisesMissingTargets = Math.max(0, exercises.length - exercisesWithTargets);
  const setupGaps = [
    !exercises.length ? 'No exercises in your library yet' : null,
    exercisesMissingTargets
      ? `${exercisesMissingTargets} ${exercisesMissingTargets === 1 ? 'exercise is' : 'exercises are'} still missing targets`
      : null,
    !splits.length ? 'No saved splits yet' : null,
    !templates.length ? 'No workout templates yet' : null,
  ].filter(Boolean);

  const nextStep = !exercises.length
    ? {
        title: 'Add your first exercise',
        body: 'Start the library with the movements you log most often, then layer targets and planning on top.',
        href: '#exercise-form',
        cta: 'Open exercise setup',
      }
    : exercisesMissingTargets
      ? {
          title: 'Set targets for your core lifts',
          body: 'A few rep or weight targets make progress tracking and logging cues much clearer.',
          href: '#exercise-library',
          cta: 'Review exercise goals',
        }
      : !splits.length
        ? {
            title: 'Build your first split',
            body: 'Turn your exercise library into a repeatable training structure you can start in one tap.',
            href: '#split-planner',
            cta: 'Open split planner',
          }
        : !templates.length
          ? {
              title: 'Save a workout as a template',
              body: 'Templates help you reuse full sessions once your base library and split structure are in place.',
              href: '#template-library',
              cta: 'Review templates',
            }
          : {
              title: 'Your setup base is ready',
              body: 'You already have exercises, targets, splits, and templates ready for faster logging.',
              href: '#exercise-library',
              cta: 'Review your library',
            };

  const mainGap = !exercises.length
    ? 'Add your first exercise so goals, splits, and templates have something to build on.'
    : exercisesMissingTargets
      ? `${exercisesMissingTargets} ${exercisesMissingTargets === 1 ? 'exercise still needs' : 'exercises still need'} target guidance.`
      : !splits.length
        ? 'Your library is ready for a first repeatable split.'
        : !templates.length
          ? 'Your base setup is ready for reusable workout templates.'
          : 'The core setup pieces are connected and ready to support faster logging.';

  const setupLanes = [
    {
      label: 'Exercises',
      value: exercises.length ? `${exercises.length} ready` : 'Start here',
      description: exercises.length
        ? 'Review your current movement library.'
        : 'Add the lifts you want to log.',
      href: '#exercise-library',
      cta: exercises.length ? 'Review library' : 'Add exercises',
      tone: exercises.length ? 'ready' : 'setup',
    },
    {
      label: 'Goals',
      value: exercises.length
        ? `${exercisesFullyGuided}/${exercises.length} complete`
        : 'Needs library',
      description: exercises.length
        ? exercisesMissingTargets
          ? 'Targets still need to be filled in for part of the library.'
          : 'Targets are in place for the current library.'
        : 'Targets become useful once your first exercise exists.',
      href: exercises.length ? '#exercise-form' : '#exercise-library',
      cta: exercisesMissingTargets ? 'Fix goals' : 'Review goals',
      tone: exercises.length && !exercisesMissingTargets ? 'ready' : 'setup',
    },
    {
      label: 'Splits',
      value: splits.length ? `${splits.length} saved` : 'Not built yet',
      description: splits.length
        ? 'Open saved split structures or refine the planner.'
        : 'Create a repeatable plan from your exercise base.',
      href: '#split-library',
      cta: splits.length ? 'Review splits' : 'Build split',
      tone: splits.length ? 'ready' : 'setup',
    },
    {
      label: 'Templates',
      value: templates.length ? `${templates.length} saved` : 'Still empty',
      description: templates.length
        ? 'Reuse full sessions or turn them into splits.'
        : 'Templates become your quickest way to reload a session.',
      href: '#template-library',
      cta: templates.length ? 'Review templates' : 'Set up templates',
      tone: templates.length ? 'ready' : 'setup',
    },
  ];

  const exerciseEmptyState = {
    title: 'No exercises yet',
    intro: 'Add your first movement to start logging.',
    body: 'This is the base layer for goals, splits, and reusable templates.',
    highlights: ['Exercises come first', 'Goals and splits build on top'],
    primaryHref: '#exercise-form',
    primaryLabel: 'Open exercise setup',
    secondaryHref: '#split-planner',
    secondaryLabel: 'Preview split planner',
    tone: 'primary',
  };

  const templateEmptyState = !exercises.length
    ? {
        title: 'No templates yet',
        intro: 'Templates unlock after you have a few core movements in place.',
        body: 'Build the library first so saved sessions have something useful to reuse later.',
        highlights: ['Library first', 'Templates follow saved sessions'],
        primaryHref: '#exercise-form',
        primaryLabel: 'Add exercises',
        secondaryHref: '#exercise-library',
        secondaryLabel: 'Review library',
      }
    : !splits.length
      ? {
          title: 'No templates yet',
          intro: 'Your exercise base is ready for a reusable session layer.',
          body: 'Once you save a repeatable workout, templates become the fastest way to restart it.',
          highlights: [`${exercises.length} exercises ready`, 'Templates pin full sessions'],
          primaryHref: '#split-planner',
          primaryLabel: 'Build a split',
          secondaryHref: '#exercise-library',
          secondaryLabel: 'Review exercises',
        }
      : {
          title: 'No templates yet',
          intro: 'Your setup base is in place, but reusable sessions are still missing.',
          body: 'Save one repeatable workout and it will live here beside your exercises and splits.',
          highlights: [`${splits.length} splits ready`, 'Templates speed up repeat starts'],
          primaryHref: '#split-library',
          primaryLabel: 'Review splits',
          secondaryHref: '#exercise-library',
          secondaryLabel: 'Review exercises',
        };

  function scrollToExerciseForm() {
    const formElement = document.getElementById('exercise-form');

    if (!formElement || typeof formElement.scrollIntoView !== 'function') {
      return;
    }

    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openExerciseEditor(exerciseId) {
    startEditingExercise(exerciseId);
    scrollToExerciseForm();
  }

  function isInteractiveTarget(target) {
    return (
      target instanceof Element &&
      Boolean(target.closest('button, a, input, select, textarea, label'))
    );
  }

  function handleExerciseCardClick(exerciseId, event) {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    openExerciseEditor(exerciseId);
  }

  return (
    <main className="content-grid library-layout">
      <section className="library-setup-surface" aria-label="Library overview">
        <article className="library-setup-hero library-setup-hero-compact">
          <div className="library-setup-copy">
            <p className="section-label">Setup surface</p>
            <h2>Build a cleaner setup path</h2>
            <p>
              See what is ready, what still needs setup, and where to go next without scanning the
              whole screen.
            </p>
          </div>
          <div className="library-summary-grid" aria-label="Library status">
            <div className="library-summary-card library-summary-card-primary">
              <span className="section-label">Current state</span>
              <strong>{exercises.length} exercises across one setup system</strong>
              <p>
                {exercisesFullyGuided} fully guided • {exercisesPartlyGuided} partly guided •{' '}
                {splits.length} splits • {templates.length} templates
              </p>
            </div>
            <div className="library-summary-card">
              <span className="section-label">Still needs setup</span>
              <strong>{setupGaps.length ? 'Main gap' : 'In good shape'}</strong>
              <p>{mainGap}</p>
            </div>
            <div className="library-summary-card library-summary-card-action">
              <span className="section-label">Recommended next step</span>
              <strong>{nextStep.title}</strong>
              <p>{nextStep.body}</p>
              <a className="primary-button action-button setup-link-button" href={nextStep.href}>
                {nextStep.cta}
              </a>
            </div>
          </div>
        </article>

        <div className="library-action-rail" aria-label="Setup entry points">
          {setupLanes.map((lane) => (
            <a
              key={lane.label}
              className={`library-action-card library-action-card-${lane.tone}`}
              href={lane.href}
            >
              <div className="library-action-card-copy">
                <span className="section-label">{lane.label}</span>
                <strong>{lane.value}</strong>
                <p>{lane.cta}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section id="exercise-library" className="panel panel-highlight library-panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Saved exercises</p>
            <h2>Library</h2>
            <p className="section-body">
              Review what is ready to log and which movements still need guidance.
            </p>
          </div>
        </div>
        {exercises.length ? (
          <div className="exercise-grid library-grid">
            {exerciseReadiness.map(({ exercise, readiness }) => {
              const readinessTone = readiness.tone;
              const hasRepGoal = readiness.hasRepGoal;
              const hasWeightGoal = readiness.hasWeightGoal;

              return (
                <article
                  key={exercise.id}
                  className={`exercise-card library-card library-card-asset ${
                    readinessTone === 'complete'
                      ? 'library-card-ready'
                      : readinessTone === 'partial'
                        ? 'library-card-partial'
                        : 'library-card-needs-setup'
                  } library-card-interactive`}
                  onClick={(event) => handleExerciseCardClick(exercise.id, event)}
                >
                  <div className="exercise-card-header">
                    <div>
                      <span
                        className={`library-card-status ${
                          readinessTone === 'complete'
                            ? 'library-card-status-ready'
                            : readinessTone === 'partial'
                              ? 'library-card-status-partial'
                              : 'library-card-status-setup'
                        }`}
                      >
                        {readiness.label}
                      </span>
                      <h3>{exercise.name}</h3>
                      <p>Created {formatCalendarDate(exercise.createdAt)}</p>
                    </div>
                    <div className="history-actions">
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Move ${exercise.name} up`}
                        onClick={() => moveExercise(exercise.id, 'up')}
                        disabled={exercises[0]?.id === exercise.id}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Move ${exercise.name} down`}
                        onClick={() => moveExercise(exercise.id, 'down')}
                        disabled={exercises[exercises.length - 1]?.id === exercise.id}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button danger-button"
                        aria-label={`Delete ${exercise.name}`}
                        onClick={() => deleteExercise(exercise.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="library-card-story-shell">
                    <div className="library-card-story">
                      <strong>{readiness.title}</strong>
                      <p>{readiness.body}</p>
                    </div>
                    <button
                      type="button"
                      className={`ghost-button action-button library-card-story-action ${
                        readinessTone === 'complete' ? '' : 'library-card-story-action-primary'
                      }`}
                      onClick={() => openExerciseEditor(exercise.id)}
                    >
                      {readiness.actionLabel}
                    </button>
                  </div>
                  <div className="library-card-meta">
                    {readinessTone === 'missing' ? (
                      <span className="library-meta-pill library-meta-pill-warning">
                        {readiness.missingLabel}
                      </span>
                    ) : null}
                    {readinessTone === 'partial' ? (
                      <span className="library-meta-pill library-meta-pill-caution">
                        {readiness.missingLabel}
                      </span>
                    ) : null}
                    {hasRepGoal ? (
                      <span className="library-meta-pill">
                        Goal {exercise.targetRepMin ?? '--'}-{exercise.targetRepMax ?? '--'} reps
                      </span>
                    ) : null}
                    {hasWeightGoal ? (
                      <span className="library-meta-pill">Target {exercise.targetWeight} kg</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className={`library-state-card library-state-card-${exerciseEmptyState.tone}`}>
            <div className="library-state-copy">
              <p className="section-label">Start here</p>
              <h3>{exerciseEmptyState.title}</h3>
              <p>{exerciseEmptyState.intro}</p>
              <p>{exerciseEmptyState.body}</p>
            </div>
            <div className="library-state-highlights" aria-label="Exercise setup cues">
              {exerciseEmptyState.highlights.map((highlight) => (
                <span key={highlight} className="library-state-highlight">
                  {highlight}
                </span>
              ))}
            </div>
            <div className="library-state-actions">
              <a
                className="primary-button action-button setup-link-button"
                href={exerciseEmptyState.primaryHref}
              >
                {exerciseEmptyState.primaryLabel}
              </a>
              <a
                className="ghost-button action-button setup-link-button"
                href={exerciseEmptyState.secondaryHref}
              >
                {exerciseEmptyState.secondaryLabel}
              </a>
            </div>
          </article>
        )}
      </section>

      <section id="template-library" className="panel panel-highlight library-panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout templates</p>
            <h2>Templates</h2>
            <p className="section-body">
              Keep reusable sessions beside exercises and splits as part of one setup system.
            </p>
          </div>
        </div>
        {templates.length ? (
          <div className="exercise-grid library-grid">
            {templates.map((template) => (
              <article
                key={template.id}
                className="exercise-card library-card library-card-asset library-card-ready"
              >
                <div className="exercise-card-header">
                  <div>
                    <span className="library-card-status library-card-status-ready">
                      Reusable session
                    </span>
                    <h3>{template.name}</h3>
                    <p>
                      {template.entries.length}{' '}
                      {template.entries.length === 1 ? 'exercise' : 'exercises'}
                    </p>
                  </div>
                  <div className="history-actions">
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Use template ${template.name}`}
                      onClick={() => loadWorkoutTemplate(template.id)}
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button danger-button"
                      aria-label={`Delete template ${template.name}`}
                      onClick={() => deleteWorkoutTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="library-card-story">
                  <strong>{template.splitId ? 'Linked to a split' : 'Ready to reuse'}</strong>
                  <p>
                    {template.splitId
                      ? 'This template already supports a split-based setup path.'
                      : 'Use it to start a saved session quickly or turn it into a split later.'}
                  </p>
                </div>
                <div className="library-card-meta">
                  <span className="library-meta-pill">
                    {template.splitId ? 'Split linked' : 'Custom template'}
                  </span>
                </div>
                <div className="library-card-action-row">
                  <button
                    type="button"
                    className="ghost-button action-button"
                    aria-label={`Edit template ${template.name}`}
                    onClick={() => startEditingWorkoutTemplate(template.id)}
                  >
                    Edit template
                  </button>
                  <button
                    type="button"
                    className="ghost-button action-button"
                    aria-label={`Duplicate template ${template.name}`}
                    onClick={() => duplicateWorkoutTemplate(template.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="ghost-button action-button"
                    aria-label={`Use template ${template.name} as a split template`}
                    onClick={() => createSplitFromTemplate(template.id)}
                  >
                    Turn into split
                  </button>
                </div>
                <div className="library-card-action-row library-card-action-row-secondary">
                  <button
                    type="button"
                    className="ghost-button action-button"
                    aria-label={`Move template ${template.name} up`}
                    onClick={() => moveWorkoutTemplate(template.id, 'up')}
                    disabled={templates[0]?.id === template.id}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="ghost-button action-button"
                    aria-label={`Move template ${template.name} down`}
                    onClick={() => moveWorkoutTemplate(template.id, 'down')}
                    disabled={templates[templates.length - 1]?.id === template.id}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="ghost-button action-button"
                    aria-label={`Rename template ${template.name}`}
                    onClick={() => renameWorkoutTemplate(template.id)}
                  >
                    Rename
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="library-state-card library-state-card-subtle">
            <div className="library-state-copy">
              <p className="section-label">Reusable layer</p>
              <h3>{templateEmptyState.title}</h3>
              <p>{templateEmptyState.intro}</p>
              <p>{templateEmptyState.body}</p>
            </div>
            <div className="library-state-highlights" aria-label="Template setup cues">
              {templateEmptyState.highlights.map((highlight) => (
                <span key={highlight} className="library-state-highlight">
                  {highlight}
                </span>
              ))}
            </div>
            <div className="library-state-actions">
              <a
                className="primary-button action-button setup-link-button"
                href={templateEmptyState.primaryHref}
              >
                {templateEmptyState.primaryLabel}
              </a>
              <a
                className="ghost-button action-button setup-link-button"
                href={templateEmptyState.secondaryHref}
              >
                {templateEmptyState.secondaryLabel}
              </a>
            </div>
          </article>
        )}
      </section>

      <section id="exercise-form" className="panel panel-form library-panel library-builder-panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Next setup</p>
            <h2>{editingExerciseId ? 'Edit exercise' : 'Exercises'}</h2>
            <p className="section-body">
              Add a movement or tighten its guidance so logging and progress stay useful.
            </p>
          </div>
        </div>
        <div className="library-builder-intro">
          <div className="library-builder-intro-copy">
            <strong>
              {editingExerciseId ? 'Refine one exercise' : 'Add the next useful movement'}
            </strong>
            <p>
              Start with the name, then add the guidance that makes the movement feel complete
              inside logging and progress.
            </p>
          </div>
          <div className="library-builder-intro-rail">
            <span className="library-builder-chip">Name</span>
            <span className="library-builder-chip">Rep range</span>
            <span className="library-builder-chip">Weight target</span>
          </div>
        </div>
        <form className="stack form-stack" onSubmit={handleExerciseSubmit}>
          <label className="field">
            <span>Exercise name</span>
            <input
              type="text"
              value={exerciseName}
              onChange={(event) => setExerciseName(event.target.value)}
              placeholder="e.g. Barbell squat"
            />
          </label>
          <div className="exercise-goal-grid">
            <label className="field field-compact">
              <span>Target reps min</span>
              <input
                type="number"
                min="1"
                step="1"
                value={exerciseTargetRepMin}
                onChange={(event) => setExerciseTargetRepMin(event.target.value)}
                placeholder="6"
              />
            </label>
            <label className="field field-compact">
              <span>Target reps max</span>
              <input
                type="number"
                min="1"
                step="1"
                value={exerciseTargetRepMax}
                onChange={(event) => setExerciseTargetRepMax(event.target.value)}
                placeholder="8"
              />
            </label>
            <label className="field field-compact">
              <span>Target weight</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={exerciseTargetWeight}
                onChange={(event) => setExerciseTargetWeight(event.target.value)}
                placeholder="100"
              />
            </label>
            <label className="field field-compact">
              <span>Weight step</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={exerciseWeightStep}
                onChange={(event) => setExerciseWeightStep(event.target.value)}
                placeholder="2.5"
              />
            </label>
          </div>
          <div className="library-builder-actions">
            <button type="submit" className="primary-button">
              {editingExerciseId ? 'Save exercise' : 'Add exercise'}
            </button>
            {editingExerciseId ? (
              <div className="library-builder-actions-secondary">
                <button type="button" className="ghost-button" onClick={() => resetExerciseForm()}>
                  Cancel editing
                </button>
              </div>
            ) : null}
          </div>
          {exerciseMessage.text && (
            <p
              className={exerciseMessage.type === 'error' ? 'feedback error' : 'feedback success'}
              role={exerciseMessage.type === 'error' ? 'alert' : 'status'}
              aria-live={exerciseMessage.type === 'error' ? 'assertive' : 'polite'}
            >
              {exerciseMessage.text}
            </p>
          )}
        </form>
      </section>

      <SplitManagerSection
        exercises={exercises}
        splits={splits}
        splitForm={splitForm}
        setSplitForm={setSplitForm}
        editingSplitId={editingSplitId}
        splitMessage={splitMessage}
        handleSplitSubmit={handleSplitSubmit}
        resetSplitForm={resetSplitForm}
        startEditingSplit={startEditingSplit}
        deleteSplit={deleteSplit}
        moveSavedSplit={moveSavedSplit}
        createSplitExercise={createSplitExercise}
        getExerciseName={getExerciseName}
      />
    </main>
  );
}
