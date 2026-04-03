import React from 'react';
import EmptyState from './EmptyState.jsx';

export default function DashboardView({
  exercises,
  splits,
  templates,
  workouts,
  totalSetsLogged,
  dashboardSummary,
  latestWorkout,
  getSplitName,
  getExerciseName,
  formatDisplayDate,
  formatNumber,
  getEntryMetrics,
  dataMessage,
  exportAppData,
  fileInputRef,
  handleImportFile,
  startWorkoutFromSplit,
  repeatLatestWorkout,
  loadWorkoutTemplate,
  lastUsedTemplate,
  startWorkoutFromLastUsedTemplate,
}) {
  const suggestedSplitId =
    latestWorkout?.splitId && latestWorkout.splitId !== ''
      ? latestWorkout.splitId
      : splits[0]?.id ?? '';
  const suggestedSplitName = suggestedSplitId ? getSplitName(suggestedSplitId) : '';
  const latestWorkoutVolume = latestWorkout
    ? latestWorkout.entries.reduce(
        (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
        0,
      )
    : 0;
  const weeklyTrendMax = Math.max(
    ...dashboardSummary.weeklyVolumeTrend.map((day) => day.volume),
    1,
  );
  const heatmapActiveDays = dashboardSummary.trainingHeatmap.filter((day) => day.count > 0).length;
  const mostImprovedExerciseName = dashboardSummary.mostImprovedExercise
    ? getExerciseName(dashboardSummary.mostImprovedExercise.exerciseId)
    : null;

  return (
    <main className="db">
      {/* ---- TOP STATS ROW ---- */}
      <section className="db-stats-row">
        <div className="db-stat">
          <div className="db-stat-header">
            <span className="db-stat-label">Volume this week</span>
            <div className="db-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <strong className="db-stat-value">{formatNumber(dashboardSummary.totalVolumeThisWeek)}</strong>
          <span className="db-stat-delta">
            {dashboardSummary.volumeDeltaVsLastWeek >= 0 ? '+' : ''}
            {formatNumber(dashboardSummary.volumeDeltaVsLastWeek)} vs last week
          </span>
        </div>
        <div className="db-stat">
          <div className="db-stat-header">
            <span className="db-stat-label">Workouts</span>
            <div className="db-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
          </div>
          <strong className="db-stat-value">{dashboardSummary.workoutsThisWeek}</strong>
          <span className="db-stat-delta">{dashboardSummary.workoutsThisMonth} this month</span>
        </div>
        <div className="db-stat">
          <div className="db-stat-header">
            <span className="db-stat-label">Active streak</span>
            <div className="db-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c2.5 0 4-2 4-4a8 8 0 1 0-15 0c0 2 1.5 4 4 4"></path><path d="M12 15v4"></path></svg>
            </div>
          </div>
          <strong className="db-stat-value">{dashboardSummary.activeWeekStreak}</strong>
          <span className="db-stat-delta">
            {dashboardSummary.activeWeekStreak === 1 ? 'week' : 'weeks'} in a row
          </span>
        </div>
        <div className="db-stat">
          <div className="db-stat-header">
            <span className="db-stat-label">Recent PRs</span>
            <div className="db-stat-icon db-stat-icon-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
            </div>
          </div>
          <strong className="db-stat-value">{dashboardSummary.recentPrHits}</strong>
          <span className="db-stat-delta">Last 30 days</span>
        </div>
      </section>

      {/* ---- MAIN CONTENT GRID ---- */}
      <div className="db-grid">

        {/* -- LEFT COLUMN -- */}
        <div className="db-col-primary">

          {/* Weekly Focus */}
          <section className="db-card db-card-hero">
            <div className="db-card-hero-top">
              <div>
                <span className="db-label">Weekly focus</span>
                <h2 className="db-card-hero-title">
                  {dashboardSummary.workoutsThisWeek
                    ? <>{dashboardSummary.workoutsThisWeek} workout{dashboardSummary.workoutsThisWeek === 1 ? '' : 's'} <span>this week</span></>
                    : 'Fresh week ahead'}
                </h2>
              </div>
              {dashboardSummary.bestTrainingDayLabel && (
                <span className="db-badge">
                  Best day: {dashboardSummary.bestTrainingDayLabel}
                </span>
              )}
            </div>
            <p className="db-card-hero-sub">
              {dashboardSummary.totalVolumeThisWeek
                ? `${formatNumber(dashboardSummary.totalVolumeThisWeek)} total volume · avg ${dashboardSummary.workoutsThisWeek ? formatNumber(dashboardSummary.averageVolumeThisWeek) : '--'} per session`
                : 'Log your first session to see your weekly rhythm.'}
            </p>
          </section>

          {/* Weekly Trend Chart */}
          <section className="db-card">
            <div className="db-card-header">
              <div>
                <span className="db-label">Weekly trend</span>
                <h3 className="db-card-title">Volume by day</h3>
              </div>
              <strong className="db-card-header-value">{formatNumber(dashboardSummary.totalVolumeThisWeek)}</strong>
            </div>
            <div className="db-bars" aria-label="Weekly volume trend">
              {dashboardSummary.weeklyVolumeTrend.map((day) => (
                <div key={day.date} className="db-bar-col">
                  <div className="db-bar-track">
                    <div
                      className="db-bar-fill"
                      style={{ height: `${Math.max((day.volume / weeklyTrendMax) * 100, day.volume ? 14 : 4)}%` }}
                    />
                  </div>
                  <span className="db-bar-value">{formatNumber(day.volume)}</span>
                  <span className="db-bar-label">{day.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Heatmap Calendar */}
          <section className="db-card">
            <div className="db-card-header">
              <div>
                <span className="db-label">Training calendar</span>
                <h3 className="db-card-title">Last 28 days</h3>
              </div>
              <span className="db-meta-pill">{heatmapActiveDays} active days</span>
            </div>
            <div className="db-heatmap" aria-label="Training heatmap">
              {dashboardSummary.trainingHeatmap.map((day) => (
                <div
                  key={day.date}
                  className={`db-heatmap-cell level-${day.level}`}
                  title={`${formatDisplayDate(day.date)} · ${day.count} session${day.count === 1 ? '' : 's'} · ${formatNumber(day.volume)} vol`}
                />
              ))}
            </div>
            <div className="db-heatmap-legend">
              <span>Less</span>
              <div className="db-heatmap-scale">
                {[0, 1, 2, 3, 4].map((level) => (
                  <span key={level} className={`db-heatmap-cell level-${level}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </section>

          {/* Performance Records */}
          <section className="db-card">
            <div className="db-card-header">
              <div>
                <span className="db-label">Performance</span>
                <h3 className="db-card-title">Best periods</h3>
              </div>
            </div>
            <div className="db-kpi-grid">
              <div className="db-kpi db-kpi-featured">
                <span>Best week</span>
                <strong>{dashboardSummary.bestWeekLabel || '--'}</strong>
                <p>
                  {dashboardSummary.bestWeek
                    ? `${formatNumber(dashboardSummary.bestWeek.volume)} vol · ${dashboardSummary.bestWeek.count} sessions`
                    : 'No data yet'}
                </p>
              </div>
              <div className="db-kpi">
                <span>Best month</span>
                <strong>{dashboardSummary.bestMonthLabel || '--'}</strong>
                <p>
                  {dashboardSummary.bestMonth
                    ? `${formatNumber(dashboardSummary.bestMonth.volume)} vol · ${dashboardSummary.bestMonth.count} sessions`
                    : 'No data yet'}
                </p>
              </div>
            </div>
            <div className="db-pill-row">
              <span className="db-meta-pill">
                Longest streak: <strong>{dashboardSummary.longestActiveWeekStreak} weeks</strong>
              </span>
              {mostImprovedExerciseName && (
                <span className="db-meta-pill">
                  Most improved: <strong>{mostImprovedExerciseName}</strong>
                </span>
              )}
            </div>
          </section>
        </div>

        {/* -- RIGHT COLUMN -- */}
        <div className="db-col-secondary">

          {/* Quick Start */}
          <section className="db-card db-card-action">
            <div>
              <span className="db-label">Quick start</span>
              <h3 className="db-card-title">
                {latestWorkout ? getSplitName(latestWorkout.splitId) : 'Start training'}
              </h3>
              <p className="db-card-sub">
                {latestWorkout
                  ? `${latestWorkout.entries.length} exercises · ${formatDisplayDate(latestWorkout.date)}`
                  : 'Pick a split or start a custom workout'}
              </p>
            </div>
            <div className="db-quick-stats">
              <div>
                <span>Exercises</span>
                <strong>{exercises.length}</strong>
              </div>
              <div>
                <span>Workouts</span>
                <strong>{workouts.length}</strong>
              </div>
              <div>
                <span>Sets</span>
                <strong>{totalSetsLogged}</strong>
              </div>
            </div>
            <div className="db-action-buttons">
              <button
                type="button"
                className="primary-button"
                onClick={() => startWorkoutFromSplit(suggestedSplitId)}
              >
                {suggestedSplitId ? `Start ${suggestedSplitName}` : 'Start workout'}
              </button>
              {latestWorkout && (
                <button type="button" className="ghost-button" onClick={repeatLatestWorkout}>
                  Repeat last workout
                </button>
              )}
              {lastUsedTemplate && (
                <button type="button" className="ghost-button" onClick={startWorkoutFromLastUsedTemplate}>
                  Start last template
                </button>
              )}
            </div>
          </section>

          {/* Momentum */}
          <section className="db-card">
            <div className="db-card-header">
              <div>
                <span className="db-label">Momentum</span>
                <h3 className="db-card-title">This week vs last</h3>
              </div>
            </div>
            <div className="db-momentum-grid">
              <div className="db-momentum-item db-momentum-primary">
                <span>Volume delta</span>
                <strong>
                  {dashboardSummary.volumeDeltaVsLastWeek >= 0 ? '+' : ''}
                  {formatNumber(dashboardSummary.volumeDeltaVsLastWeek)}
                </strong>
                <p>{formatNumber(dashboardSummary.totalVolumeThisWeek)} vs {formatNumber(dashboardSummary.totalVolumeLastWeek)}</p>
              </div>
              <div className="db-momentum-item">
                <span>Sessions delta</span>
                <strong>
                  {dashboardSummary.workoutDeltaVsLastWeek >= 0 ? '+' : ''}
                  {dashboardSummary.workoutDeltaVsLastWeek}
                </strong>
                <p>{dashboardSummary.workoutsThisWeek} vs {dashboardSummary.workoutsLastWeek}</p>
              </div>
            </div>
            <div className="db-pill-row">
              <span className="db-meta-pill">PRs this week: <strong>{dashboardSummary.currentWeekPrHits}</strong></span>
              <span className="db-meta-pill">Month volume: <strong>{formatNumber(dashboardSummary.totalVolumeThisMonth)}</strong></span>
            </div>
          </section>

          {/* Split Insights */}
          {(dashboardSummary.topSplitThisMonth || dashboardSummary.mostUsedSplit) && (
            <section className="db-card">
              <div className="db-card-header">
                <div>
                  <span className="db-label">Split insights</span>
                  <h3 className="db-card-title">Your go-to splits</h3>
                </div>
              </div>
              <div className="db-split-list">
                {dashboardSummary.topSplitThisMonth && (
                  <div className="db-split-row db-split-primary">
                    <div>
                      <span>Top this month</span>
                      <strong>{getSplitName(dashboardSummary.topSplitThisMonth.splitId)}</strong>
                    </div>
                    <span className="db-meta-pill">
                      {formatNumber(dashboardSummary.topSplitThisMonth.volume)} vol · {dashboardSummary.topSplitThisMonth.count} sessions
                    </span>
                  </div>
                )}
                {dashboardSummary.mostUsedSplit && (
                  <div className="db-split-row">
                    <div>
                      <span>Most used overall</span>
                      <strong>{getSplitName(dashboardSummary.mostUsedSplit.splitId)}</strong>
                    </div>
                    <span className="db-meta-pill">{dashboardSummary.mostUsedSplit.count} sessions</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Templates */}
          <section className="db-card">
            <div className="db-card-header">
              <div>
                <span className="db-label">Templates</span>
                <h3 className="db-card-title">Reuse a session</h3>
              </div>
            </div>
            {templates.length ? (
              <div className="db-template-list">
                {templates.slice(0, 3).map((template) => (
                  <div key={template.id} className="db-template-row">
                    <div>
                      <strong>{template.name}</strong>
                      <p>
                        {template.entries.length} exercise{template.entries.length === 1 ? '' : 's'}
                        {lastUsedTemplate?.id === template.id ? ' · Last used' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      onClick={() => loadWorkoutTemplate(template.id)}
                    >
                      Use template
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No templates" body="Save a workout as template to reuse it here." />
            )}
          </section>

          {/* Recent Wins */}
          <section className="db-card">
            <div className="db-card-header">
              <div>
                <span className="db-label">Recent wins</span>
                <h3 className="db-card-title">Personal records</h3>
              </div>
            </div>
            {dashboardSummary.latestPersonalRecords.length ? (
              <div className="db-wins-list">
                {dashboardSummary.latestPersonalRecords.map((record) => (
                  <div
                    key={`${record.exerciseId}-${record.date}-${record.labels.join('-')}`}
                    className="db-win-row"
                  >
                    <div>
                      <strong>{getExerciseName(record.exerciseId)}</strong>
                      <p>{formatDisplayDate(record.date)}</p>
                    </div>
                    <div className="tag-row">
                      {record.labels.map((label) => (
                        <span key={label} className="tag pr-tag">{label}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No recent PRs" body="Keep logging to surface wins here." />
            )}
          </section>
        </div>
      </div>

      {/* ---- BOTTOM: LATEST SESSION ---- */}
      {latestWorkout && (
        <section className="db-card db-latest">
          <div className="db-card-header">
            <div>
              <span className="db-label">Latest session</span>
              <h3 className="db-card-title">{formatDisplayDate(latestWorkout.date)}</h3>
            </div>
            <div className="db-latest-meta">
              {latestWorkout.splitId && <span className="db-meta-pill db-pill-accent">{getSplitName(latestWorkout.splitId)}</span>}
              <span className="db-meta-pill">{latestWorkout.entries.length} exercises</span>
              <span className="db-meta-pill">{formatNumber(latestWorkoutVolume)} vol</span>
            </div>
          </div>
          <div className="db-latest-entries timeline-container">
            {latestWorkout.entries.map((entry) => {
              const metrics = getEntryMetrics(entry);
              return (
                <div key={`${latestWorkout.id}-${entry.exerciseId}`} className="db-latest-entry timeline-item">
                  <div className="timeline-node"></div>
                  <div className="timeline-content">
                    <strong>{getExerciseName(entry.exerciseId)}</strong>
                    <div className="db-latest-entry-metrics">
                      <span>{formatNumber(metrics.bestWeight)} kg</span>
                      <span className="timeline-pipe">|</span>
                      <span>{formatNumber(metrics.bestReps)} reps</span>
                      <span className="timeline-pipe">|</span>
                      <span>{formatNumber(metrics.totalVolume)} vol</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- DATA ACTIONS ---- */}
      <div className="db-footer-actions">
        <button type="button" className="ghost-button" onClick={exportAppData}>Export JSON</button>
        <button type="button" className="ghost-button" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden-input" onChange={handleImportFile} />
      </div>
      {dataMessage.text && (
        <p
          className={dataMessage.type === 'error' ? 'feedback error' : dataMessage.type === 'warning' ? 'feedback warning' : 'feedback success'}
          role={dataMessage.type === 'error' ? 'alert' : 'status'}
          aria-live={dataMessage.type === 'error' ? 'assertive' : 'polite'}
        >
          {dataMessage.text}
        </p>
      )}
    </main>
  );
}
