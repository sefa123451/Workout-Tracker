import React from 'react';

export default function SettingsView({
  themeMode,
  setThemeMode,
  themeOptions,
  dataMessage,
  storageWarning,
  exportAppData,
  fileInputRef,
  handleImportFile,
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
          <p>Export backups any time and restore them when needed.</p>
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
                <p>Create a JSON snapshot of exercises, splits, and workouts.</p>
              </div>
              <button type="button" className="secondary-button" onClick={exportAppData}>
                Export JSON
              </button>
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
