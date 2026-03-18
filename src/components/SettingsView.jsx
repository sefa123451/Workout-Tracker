import React from 'react';

export default function SettingsView({
  themeMode,
  setThemeMode,
  themeOptions,
  dataMessage,
  storageWarning,
  pendingImport,
  exportAppData,
  exportWorkoutHistoryCsv,
  templates,
  fileInputRef,
  handleImportFile,
  applyPendingImport,
  clearPendingImport,
}) {
  return (
    <main className="content-grid settings-layout">
      <section className="settings-overview-grid" aria-label="Settings overview">
        <article className="settings-overview-card settings-overview-card-primary">
          <span className="section-label">Theme mode</span>
          <strong>{themeMode}</strong>
          <p>Keep the dashboard in sync with your preferred appearance.</p>
        </article>
        <article className="settings-overview-card">
          <span className="section-label">Data safety</span>
          <strong>Local-first</strong>
          <p>{templates.length} templates ready to reuse and back up.</p>
        </article>
      </section>

      <section className="panel panel-highlight settings-grid">
        <article className="settings-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="section-label">Appearance</p>
              <h2>Theme</h2>
            </div>
          </div>
          <p className="settings-copy">Choose how the dashboard should look across your sessions.</p>
          <div className="theme-switcher settings-switcher" role="group" aria-label="Theme preferences">
            {themeOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={option === themeMode ? 'view-button active theme-button' : 'view-button theme-button'}
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

        <article className="settings-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="section-label">Data</p>
              <h2>Backup</h2>
            </div>
          </div>
          <p className="settings-copy">Export or restore your local workout data without leaving the app.</p>
          <div className="settings-data-grid">
            <div className="settings-action-card settings-action-card-primary">
              <div>
                <span className="section-label">Export</span>
                <h3>Backup all data</h3>
                <p>Save a full JSON backup or export your workout history as CSV.</p>
              </div>
              <div className="settings-action-buttons">
                <button type="button" className="secondary-button" onClick={exportAppData}>
                  Export JSON
                </button>
                <button type="button" className="ghost-button" onClick={exportWorkoutHistoryCsv}>
                  Export CSV
                </button>
              </div>
            </div>
            <div className="settings-action-card">
              <div>
                <span className="section-label">Import</span>
                <h3>Restore from file</h3>
                <p>Replace your current local data with a previously exported backup.</p>
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
          {pendingImport && (
            <div className="settings-import-preview" role="status" aria-live="polite">
              <div className="settings-import-preview-header">
                <div>
                  <span className="section-label">Import preview</span>
                  <h3>{pendingImport.fileName}</h3>
                  <p>Choose whether to replace everything or merge new items into your current local data.</p>
                </div>
              </div>
              <div className="settings-import-preview-grid">
                <div className="settings-note-card">
                  <span className="section-label">Exercises</span>
                  <strong>{pendingImport.value.exercises.length}</strong>
                  <p>Library items ready to import.</p>
                </div>
                <div className="settings-note-card">
                  <span className="section-label">Splits</span>
                  <strong>{pendingImport.value.splits.length}</strong>
                  <p>Planner templates included.</p>
                </div>
                <div className="settings-note-card">
                  <span className="section-label">Templates</span>
                  <strong>{pendingImport.value.templates?.length ?? 0}</strong>
                  <p>Reusable workout blueprints in this import.</p>
                </div>
                <div className="settings-note-card">
                  <span className="section-label">Workouts</span>
                  <strong>{pendingImport.value.workouts.length}</strong>
                  <p>Logged sessions that will replace current history.</p>
                </div>
              </div>
              <div className="actions">
                <button type="button" className="primary-button" onClick={() => applyPendingImport('replace')}>
                  Replace data
                </button>
                <button type="button" className="secondary-button" onClick={() => applyPendingImport('merge')}>
                  Merge data
                </button>
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
    </main>
  );
}
