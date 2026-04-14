import React, { useState } from 'react';
import { getTodayInputValue } from '../lib/workoutData.js';

export default function SettingsView({
  bodyweightEntries,
  bodyweightSummary,
  saveBodyweightEntry,
  themeMode,
  setThemeMode,
  themeOptions,
  weeklyWorkoutGoal,
  setWeeklyWorkoutGoal,
  dataMessage,
  storageWarning,
  pendingImport,
  exportAppData,
  exportWorkoutHistoryCsv,
  fileInputRef,
  handleImportFile,
  applyPendingImport,
  clearPendingImport,
}) {
  const [bodyweightDate, setBodyweightDate] = useState(getTodayInputValue);
  const [bodyweightValue, setBodyweightValue] = useState('');
  const bodyweightDeltaLabel =
    bodyweightSummary.deltaInRange !== null
      ? `${bodyweightSummary.deltaInRange > 0 ? '+' : ''}${bodyweightSummary.deltaInRange} kg in 30 days`
      : 'Log your first check-in to start a trend.';
  const latestBodyweightValue =
    bodyweightSummary.latestWeight !== null
      ? `${bodyweightSummary.latestWeight} kg`
      : 'No check-ins yet';
  const importCounts = pendingImport
    ? [
        {
          label: 'Bodyweight',
          value: pendingImport.value.bodyweightEntries?.length ?? 0,
          body: 'Check-ins found in this import.',
        },
        {
          label: 'Exercises',
          value: pendingImport.value.exercises.length,
          body: 'Library items ready to import.',
        },
        {
          label: 'Splits',
          value: pendingImport.value.splits.length,
          body: 'Planner templates included.',
        },
        {
          label: 'Templates',
          value: pendingImport.value.templates?.length ?? 0,
          body: 'Reusable workout blueprints in this import.',
        },
        {
          label: 'Workouts',
          value: pendingImport.value.workouts.length,
          body: 'Logged sessions included in this backup.',
        },
      ]
    : [];

  return (
    <main className="content-grid settings-layout">
      <section className="settings-control-surface" aria-label="Settings control center">
        <article className="settings-control-hero">
          <div className="settings-control-copy">
            <p className="section-label">Control center</p>
            <h2>
              Change the app, your training defaults, and your local backup flow from one calm
              surface.
            </h2>
          </div>
          <div className="settings-overview-grid" aria-label="Settings overview">
            <a
              className="settings-overview-card settings-overview-card-primary settings-overview-link"
              href="#settings-experience"
            >
              <span className="section-label">Appearance</span>
              <strong>{themeMode}</strong>
              <p>Theme and display mode</p>
            </a>
            <a className="settings-overview-card settings-overview-link" href="#settings-training">
              <span className="section-label">Training</span>
              <strong>{weeklyWorkoutGoal} sessions</strong>
              <p>
                {latestBodyweightValue}. {bodyweightDeltaLabel}
              </p>
            </a>
            <a className="settings-overview-card settings-overview-link" href="#settings-data">
              <span className="section-label">Data safety</span>
              <strong>{pendingImport ? 'Import ready' : 'Backup tools ready'}</strong>
              <p>
                {pendingImport
                  ? 'Preview first, then choose replace or merge.'
                  : 'Export or restore local data without surprises.'}
              </p>
            </a>
          </div>
        </article>
      </section>

      <section className="settings-main-grid" aria-label="Settings sections">
        <section id="settings-experience" className="panel panel-highlight settings-panel">
          <div className="section-heading">
            <div>
              <p className="section-label">App experience</p>
              <h2>Appearance</h2>
              <p className="section-body">Choose how the product should look.</p>
            </div>
          </div>
          <article className="settings-card">
            <div className="settings-card-intro">
              <strong>Pick one appearance mode for the whole app.</strong>
              <p>System follows your device. Light and dark stay fixed.</p>
            </div>
            <div
              className="theme-switcher settings-switcher"
              role="group"
              aria-label="Theme preferences"
            >
              {themeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    option === themeMode
                      ? 'view-button active theme-button'
                      : 'view-button theme-button'
                  }
                  onClick={() => setThemeMode(option)}
                  aria-pressed={option === themeMode}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="settings-note-card">
              <span className="section-label">Current mode</span>
              <strong>{themeMode}</strong>
              <p>
                {themeMode === 'system'
                  ? 'Follows your device setting automatically.'
                  : `Always use ${themeMode} mode.`}
              </p>
            </div>
          </article>
        </section>

        <section id="settings-training" className="panel panel-highlight settings-panel">
          <div className="section-heading">
            <div>
              <p className="section-label">Training defaults</p>
              <h2>Training defaults</h2>
              <p className="section-body">Set weekly pace and bodyweight check-ins together.</p>
            </div>
          </div>
          <article className="settings-card settings-card-training">
            <div className="settings-card-intro">
              <strong>Keep weekly pace and bodyweight check-ins in one preference flow.</strong>
              <p>Set the target week once, then keep quick check-ins close to it.</p>
            </div>
            <div className="settings-training-summary settings-training-summary-compact">
              <div className="settings-note-card">
                <span className="section-label">Weekly target</span>
                <strong>{weeklyWorkoutGoal} sessions</strong>
                <p>Used as the weekly pace target across the product.</p>
              </div>
              <div className="settings-note-card">
                <span className="section-label">Latest check-in</span>
                <strong>{latestBodyweightValue}</strong>
                <p>
                  {bodyweightSummary.deltaInRange !== null
                    ? `${bodyweightSummary.deltaInRange > 0 ? '+' : ''}${bodyweightSummary.deltaInRange} kg over the last 30 days`
                    : 'Add at least two check-ins to compare your trend.'}
                </p>
              </div>
            </div>
            <div className="settings-training-flow settings-training-flow-unified">
              <div className="settings-preference-block">
                <div className="settings-preference-copy">
                  <span className="section-label">Weekly target</span>
                  <strong>Set what a normal training week should aim for.</strong>
                  <p>The dashboard and recovery pacing use this as your baseline.</p>
                </div>
                <label className="field field-compact">
                  <span>Target sessions</span>
                  <select
                    value={String(weeklyWorkoutGoal)}
                    onChange={(event) => setWeeklyWorkoutGoal(Number(event.target.value))}
                  >
                    {Array.from({ length: 7 }, (_, index) => index + 1).map((value) => (
                      <option key={value} value={value}>
                        {value} {value === 1 ? 'session' : 'sessions'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </article>
        </section>

        <section id="settings-bodyweight" className="panel panel-highlight settings-panel">
          <div className="section-heading">
            <div>
              <p className="section-label">Bodyweight check-ins</p>
              <h2>Bodyweight check-ins</h2>
              <p className="section-body">
                Keep an ongoing log of your bodyweight to compare against performance.
              </p>
            </div>
          </div>
          <article className="settings-card">
            <div className="settings-preference-block settings-preference-block-bodyweight">
              <div className="settings-preference-copy">
                <span className="section-label">Log a check-in</span>
                <strong>Save a quick check-in.</strong>
                <p>Recent entries stay beside the form so the trend is always easy to read.</p>
              </div>
              <form
                className="stack settings-bodyweight-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const didSave = saveBodyweightEntry(bodyweightDate, bodyweightValue);

                  if (didSave) {
                    setBodyweightValue('');
                  }
                }}
              >
                <div className="settings-bodyweight-grid">
                  <label className="field field-compact">
                    <span>Check-in date</span>
                    <input
                      type="date"
                      value={bodyweightDate}
                      onChange={(event) => setBodyweightDate(event.target.value)}
                    />
                  </label>
                  <label className="field field-compact">
                    <span>Bodyweight (kg)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={bodyweightValue}
                      onChange={(event) => setBodyweightValue(event.target.value)}
                      placeholder="82.4"
                    />
                  </label>
                </div>
                <div className="actions settings-training-actions">
                  <button type="submit" className="primary-button">
                    Save bodyweight
                  </button>
                </div>
              </form>
              <div className="settings-bodyweight-list">
                {(bodyweightEntries ?? []).slice(0, 5).map((entry) => (
                  <div key={entry.id} className="settings-bodyweight-item">
                    <span>{entry.date}</span>
                    <strong>{entry.weight} kg</strong>
                  </div>
                ))}
                {!bodyweightEntries?.length && (
                  <div className="settings-bodyweight-item settings-bodyweight-item-empty">
                    <span>No check-ins yet</span>
                    <strong>Start with today</strong>
                  </div>
                )}
              </div>
            </div>
          </article>
        </section>

        <section
          id="settings-data"
          className="panel panel-highlight settings-panel settings-panel-data"
        >
          <div className="section-heading">
            <div>
              <p className="section-label">Data safety</p>
              <h2>Data safety</h2>
              <p className="section-body">Back up and restore local data from one calm place.</p>
            </div>
          </div>
          <article className="settings-card">
            <div className="settings-card-intro">
              <strong>
                Review every import before you apply it and keep exports easy to trust.
              </strong>
              <p>
                Your local data stays exactly as it is until you choose what should happen next.
              </p>
            </div>
            <div
              className="settings-trust-strip settings-trust-strip-prominent"
              aria-label="Data safety cues"
            >
              <span className="settings-trust-pill">Stored locally</span>
              <span className="settings-trust-pill">Preview before apply</span>
              <span className="settings-trust-pill">
                {pendingImport ? 'Import decision pending' : 'Nothing changes on export'}
              </span>
            </div>
            <div className="settings-data-surface">
              <div className="settings-data-grid">
                <div className="settings-action-card settings-action-card-primary">
                  <div>
                    <span className="section-label">Export</span>
                    <h3>Back up all data</h3>
                    <p>
                      Create a full JSON backup or save workout history as CSV without changing
                      anything in the app.
                    </p>
                  </div>
                  <div className="settings-action-buttons">
                    <button type="button" className="secondary-button" onClick={exportAppData}>
                      Export JSON
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={exportWorkoutHistoryCsv}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                <div className="settings-action-card">
                  <div>
                    <span className="section-label">Import</span>
                    <h3>Restore from file</h3>
                    <p>
                      Open a backup, review its contents, then choose whether it should replace or
                      merge into current local data.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Import JSON
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden-input"
                    onChange={handleImportFile}
                  />
                </div>
              </div>
            </div>
            {pendingImport && (
              <div className="settings-import-preview" role="status" aria-live="polite">
                <div className="settings-import-preview-header">
                  <div>
                    <span className="section-label">Import preview</span>
                    <h3>{pendingImport.fileName}</h3>
                    <p>
                      Review the backup first. Current local data stays untouched until you choose
                      replace or merge.
                    </p>
                  </div>
                </div>
                <div className="settings-import-reassurance">
                  <strong>Nothing changes yet.</strong>
                  <p>
                    Replace switches fully to this backup. Merge keeps current local data and only
                    adds what is new.
                  </p>
                </div>
                <div className="settings-import-decision-grid">
                  <div className="settings-import-decision-card settings-import-decision-card-primary">
                    <span className="section-label">Replace</span>
                    <strong>Replace current local data</strong>
                    <p>Use this when the backup should become the new source of truth.</p>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => applyPendingImport('replace')}
                    >
                      Replace data
                    </button>
                  </div>
                  <div className="settings-import-decision-card">
                    <span className="section-label">Merge</span>
                    <strong>Keep current data and add what is new</strong>
                    <p>
                      Use this when you want to keep what is already here and bring in only the
                      extra items from the backup.
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => applyPendingImport('merge')}
                    >
                      Merge data
                    </button>
                  </div>
                </div>
                <div className="settings-import-preview-grid">
                  {importCounts.map((item) => (
                    <div key={item.label} className="settings-note-card">
                      <span className="section-label">{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </div>
                <div className="settings-import-actions">
                  <button type="button" className="ghost-button" onClick={clearPendingImport}>
                    Cancel import
                  </button>
                </div>
              </div>
            )}
            {dataMessage.text && (
              <p
                className={
                  dataMessage.type === 'error'
                    ? 'feedback error'
                    : dataMessage.type === 'warning'
                      ? 'feedback warning'
                      : 'feedback success'
                }
                role={dataMessage.type === 'error' ? 'alert' : 'status'}
                aria-live={dataMessage.type === 'error' ? 'assertive' : 'polite'}
              >
                {dataMessage.text}
              </p>
            )}
            {storageWarning && (
              <p className="feedback warning" role="status" aria-live="polite">
                {storageWarning}
              </p>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
