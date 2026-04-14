import React from 'react';
import AppDialog from './components/AppDialog.jsx';
import DashboardView from './components/DashboardView.jsx';
import ExerciseView from './components/ExerciseView.jsx';
import HistoryView from './components/HistoryView.jsx';
import ProgressView from './components/ProgressView.jsx';
import SettingsView from './components/SettingsView.jsx';
import WorkoutFormView from './components/WorkoutFormView.jsx';
import { formatCalendarDate } from './lib/workoutData.js';
import { THEME_OPTIONS } from './hooks/useThemeMode.js';
import { useAppController } from './hooks/useAppController.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', a11yLabel: 'dashboard', icon: 'dashboard' },
  { id: 'exercises', label: 'Exercises', a11yLabel: 'exercises', icon: 'exercises' },
  { id: 'log', label: 'Log workout', a11yLabel: 'Log workout', icon: 'log' },
  { id: 'history', label: 'History', a11yLabel: 'history', icon: 'history' },
  { id: 'progress', label: 'Progress', a11yLabel: 'progress', icon: 'progress' },
  { id: 'settings', label: 'Settings', a11yLabel: 'settings', icon: 'settings' },
];
const PROGRESS_WINDOWS = [7, 30, 90];

function SidebarIcon({ icon }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  switch (icon) {
    case 'dashboard':
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2.2" />
          <rect x="13.5" y="3.5" width="7" height="11" rx="2.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2.2" />
          <rect x="13.5" y="17.5" width="7" height="3" rx="1.5" />
        </svg>
      );
    case 'exercises':
      return (
        <svg {...commonProps}>
          <path d="M4 10.5h2.4" />
          <path d="M17.6 10.5H20" />
          <path d="M6.4 8.3v4.4" />
          <path d="M17.6 8.3v4.4" />
          <path d="M8.6 9.4v2.2" />
          <path d="M15.4 9.4v2.2" />
          <path d="M8.6 10.5h6.8" />
          <path d="M11.1 8.1h1.8" />
          <path d="M11.1 12.9h1.8" />
        </svg>
      );
    case 'log':
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
        </svg>
      );
    case 'history':
      return (
        <svg {...commonProps}>
          <path d="M4 12a8 8 0 118 8" />
          <path d="M4 4v5h5" />
          <path d="M12 8v5l3 2" />
        </svg>
      );
    case 'progress':
      return (
        <svg {...commonProps}>
          <path d="M4 18l5-6 4 3 7-9" />
          <path d="M4 20h16" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="2.9" />
          <path d="M12 3.8v2.1" />
          <path d="M12 18.1v2.1" />
          <path d="M20.2 12h-2.1" />
          <path d="M5.9 12H3.8" />
          <path d="M17.8 6.2l-1.5 1.5" />
          <path d="M7.7 16.3l-1.5 1.5" />
          <path d="M17.8 17.8l-1.5-1.5" />
          <path d="M7.7 7.7L6.2 6.2" />
          <circle cx="12" cy="12" r="6.2" />
        </svg>
      );
    default:
      return null;
  }
}

function App() {
  const controller = useAppController();
  const {
    activeView,
    setActiveView,
    activeViewMeta,
    sidebarSummary,
    themeMode,
    setThemeMode,
    workouts,
    latestWorkout,
    dashboardSummary,
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
    bodyweightSummary,
    exercises,
    splits,
    templates,
    weeklyWorkoutGoal,
    totalSetsLogged,
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
    startEditingExercise,
    deleteExercise,
    moveExercise,
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
    deleteWorkoutTemplate,
    moveWorkoutTemplate,
    renameWorkoutTemplate,
    duplicateWorkoutTemplate,
    createSplitFromTemplate,
    startEditingWorkoutTemplate,
    workoutForm,
    selectedWorkoutTemplateId,
    editingTemplateId,
    templateDraftName,
    editingWorkoutId,
    workoutMessage,
    setWorkoutForm,
    setSelectedWorkoutTemplateId,
    setTemplateDraftName,
    updateWorkoutEntry,
    applyLatestWorkoutToEntry,
    handleWorkoutSplitChange,
    saveCurrentWorkoutAsTemplate,
    updateSelectedWorkoutTemplate,
    handleTemplateEditorSubmit,
    handleWorkoutSubmit,
    resetWorkoutForm,
    createSet,
    createSetFromValues,
    createWorkoutEntry,
    sortedWorkouts,
    historyHeatmap,
    historyPrTimeline,
    startEditingWorkout,
    duplicateWorkout,
    saveWorkoutAsTemplate,
    createSplitFromWorkout,
    deleteWorkout,
    selectedProgressView,
    setSelectedProgressView,
    selectedExerciseId,
    setSelectedExerciseId,
    selectedSplitProgressId,
    setSelectedSplitProgressId,
    selectedProgressWindow,
    setSelectedProgressWindow,
    selectedProgressMetric,
    setSelectedProgressMetric,
    selectedExerciseHistory,
    selectedExerciseWindowHistory,
    selectedExerciseWindowSummary,
    selectedSplitHistory,
    selectedSplitWindowHistory,
    selectedSplitWindowSummary,
    formatDelta,
    hasPersonalRecord,
    hasImprovement,
    bodyweightEntries,
    saveBodyweightEntry,
    setWeeklyWorkoutGoal,
    storageWarning,
    pendingImport,
    exportWorkoutHistoryCsv,
    applyPendingImport,
    clearPendingImport,
    undoNotice,
    handleUndoDelete,
    clearUndoNotice,
    activeDialog,
    handleDialogConfirm,
    handleDialogCancel,
  } = controller;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-main-content">
        Skip to content
      </a>
      <div className="app-layout">
        <aside className="app-sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-hidden="true">
              <span />
            </div>
            <div className="sidebar-brand-copy">
              <p>Your training</p>
              <strong>Workout tracker</strong>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.a11yLabel}
                aria-pressed={item.id === activeView}
                className={item.id === activeView ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
                onClick={() => setActiveView(item.id)}
              >
                <span className={`sidebar-nav-icon sidebar-nav-icon-${item.icon}`}>
                  <SidebarIcon icon={item.icon} />
                </span>
                <span className="sidebar-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer sidebar-footer-graphic">
            <div className="sidebar-footer-illustration">
              <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="40" r="15" fill="var(--accent)" opacity="0.1" />
                <circle cx="100" cy="40" r="15" fill="var(--accent)" opacity="0.1" />
                <path
                  d="M35 40 H85"
                  stroke="var(--accent)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d="M45 25 V55 M75 25 V55"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <circle cx="60" cy="40" r="6" fill="var(--accent)" />
              </svg>
            </div>
            <div className="sidebar-footer-top">
              <p className="sidebar-footer-label">Your Journey</p>
              <span className="sidebar-footer-pulse" aria-hidden="true" />
            </div>
            <div className="sidebar-footer-value-row">
              <strong>{workouts.length}</strong>
              <span>sessions</span>
            </div>
            <p className="sidebar-footer-note">{sidebarSummary}</p>
          </div>
        </aside>

        <div id="app-main-content" className="app-main" tabIndex={-1}>
          <header className="topbar">
            <span className="topbar-title">{activeViewMeta.title}</span>
            <div className="topbar-actions">
              <div className="topbar-chip">
                <span>{formatCalendarDate(new Date())}</span>
              </div>
              <div className="theme-switcher topbar-theme-switcher" role="group" aria-label="Theme">
                {THEME_OPTIONS.map((option) => (
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
            </div>
          </header>

          {storageWarning && (
            <p className="feedback warning" role="status" aria-live="polite">
              {storageWarning}
            </p>
          )}

          {undoNotice && (
            <div className="feedback warning undo-banner" role="status" aria-live="polite">
              <span>{undoNotice.text}</span>
              <div className="undo-banner-actions">
                <button type="button" className="ghost-button" onClick={handleUndoDelete}>
                  Undo delete
                </button>
                <button type="button" className="ghost-button" onClick={clearUndoNotice}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {activeView === 'dashboard' && (
            <DashboardView
              bodyweightSummary={bodyweightSummary}
              exercises={exercises}
              splits={splits}
              templates={templates}
              workouts={workouts}
              weeklyWorkoutGoal={weeklyWorkoutGoal}
              totalSetsLogged={totalSetsLogged}
              dashboardSummary={dashboardSummary}
              latestWorkout={latestWorkout}
              getSplitName={getSplitName}
              getExerciseName={getExerciseName}
              formatDisplayDate={formatDisplayDate}
              formatNumber={formatNumber}
              getEntryMetrics={getEntryMetrics}
              dataMessage={dataMessage}
              exportAppData={exportAppData}
              fileInputRef={fileInputRef}
              handleImportFile={handleImportFile}
              startWorkoutFromSplit={startWorkoutFromSplit}
              repeatLatestWorkout={repeatLatestWorkout}
              loadWorkoutTemplate={loadWorkoutTemplate}
              lastUsedTemplate={lastUsedTemplate}
              startWorkoutFromLastUsedTemplate={startWorkoutFromLastUsedTemplate}
            />
          )}

          {activeView === 'exercises' && (
            <ExerciseView
              editingExerciseId={editingExerciseId}
              exerciseName={exerciseName}
              setExerciseName={setExerciseName}
              exerciseTargetWeight={exerciseTargetWeight}
              setExerciseTargetWeight={setExerciseTargetWeight}
              exerciseTargetRepMin={exerciseTargetRepMin}
              setExerciseTargetRepMin={setExerciseTargetRepMin}
              exerciseTargetRepMax={exerciseTargetRepMax}
              setExerciseTargetRepMax={setExerciseTargetRepMax}
              exerciseWeightStep={exerciseWeightStep}
              setExerciseWeightStep={setExerciseWeightStep}
              handleExerciseSubmit={handleExerciseSubmit}
              resetExerciseForm={resetExerciseForm}
              exerciseMessage={exerciseMessage}
              exercises={exercises}
              formatCalendarDate={formatCalendarDate}
              startEditingExercise={startEditingExercise}
              deleteExercise={deleteExercise}
              moveExercise={moveExercise}
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
              templates={templates}
              loadWorkoutTemplate={loadWorkoutTemplate}
              deleteWorkoutTemplate={deleteWorkoutTemplate}
              moveWorkoutTemplate={moveWorkoutTemplate}
              renameWorkoutTemplate={renameWorkoutTemplate}
              duplicateWorkoutTemplate={duplicateWorkoutTemplate}
              createSplitFromTemplate={createSplitFromTemplate}
              startEditingWorkoutTemplate={startEditingWorkoutTemplate}
            />
          )}

          {activeView === 'log' && (
            <WorkoutFormView
              exercises={exercises}
              splits={splits}
              templates={templates}
              workouts={workouts}
              workoutForm={workoutForm}
              selectedWorkoutTemplateId={selectedWorkoutTemplateId}
              editingTemplateId={editingTemplateId}
              templateDraftName={templateDraftName}
              editingWorkoutId={editingWorkoutId}
              workoutMessage={workoutMessage}
              setWorkoutForm={setWorkoutForm}
              setSelectedWorkoutTemplateId={setSelectedWorkoutTemplateId}
              setTemplateDraftName={setTemplateDraftName}
              updateWorkoutEntry={updateWorkoutEntry}
              applyLatestWorkoutToEntry={applyLatestWorkoutToEntry}
              handleWorkoutSplitChange={handleWorkoutSplitChange}
              loadWorkoutTemplate={loadWorkoutTemplate}
              saveCurrentWorkoutAsTemplate={saveCurrentWorkoutAsTemplate}
              updateSelectedWorkoutTemplate={updateSelectedWorkoutTemplate}
              handleTemplateEditorSubmit={handleTemplateEditorSubmit}
              handleWorkoutSubmit={handleWorkoutSubmit}
              resetWorkoutForm={resetWorkoutForm}
              createSet={createSet}
              createSetFromValues={createSetFromValues}
              createWorkoutEntry={createWorkoutEntry}
              formatDisplayDate={formatDisplayDate}
              formatNumber={formatNumber}
              getSplitName={getSplitName}
            />
          )}

          {activeView === 'history' && (
            <HistoryView
              sortedWorkouts={sortedWorkouts}
              historyHeatmap={historyHeatmap}
              historyPrTimeline={historyPrTimeline}
              getExerciseName={getExerciseName}
              getSplitName={getSplitName}
              formatDisplayDate={formatDisplayDate}
              formatNumber={formatNumber}
              getEntryMetrics={getEntryMetrics}
              startEditingWorkout={startEditingWorkout}
              duplicateWorkout={duplicateWorkout}
              saveWorkoutAsTemplate={saveWorkoutAsTemplate}
              createSplitFromWorkout={createSplitFromWorkout}
              deleteWorkout={deleteWorkout}
            />
          )}

          {activeView === 'progress' && (
            <ProgressView
              exercises={exercises}
              splits={splits}
              selectedProgressView={selectedProgressView}
              setSelectedProgressView={setSelectedProgressView}
              selectedExerciseId={selectedExerciseId}
              setSelectedExerciseId={setSelectedExerciseId}
              selectedSplitProgressId={selectedSplitProgressId}
              setSelectedSplitProgressId={setSelectedSplitProgressId}
              progressWindows={PROGRESS_WINDOWS}
              selectedProgressWindow={selectedProgressWindow}
              setSelectedProgressWindow={setSelectedProgressWindow}
              selectedProgressMetric={selectedProgressMetric}
              setSelectedProgressMetric={setSelectedProgressMetric}
              selectedExerciseHistory={selectedExerciseHistory}
              selectedExerciseWindowHistory={selectedExerciseWindowHistory}
              selectedExerciseWindowSummary={selectedExerciseWindowSummary}
              selectedSplitHistory={selectedSplitHistory}
              selectedSplitWindowHistory={selectedSplitWindowHistory}
              selectedSplitWindowSummary={selectedSplitWindowSummary}
              getSplitName={getSplitName}
              formatDisplayDate={formatDisplayDate}
              formatDelta={formatDelta}
              formatNumber={formatNumber}
              hasPersonalRecord={hasPersonalRecord}
              hasImprovement={hasImprovement}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              bodyweightEntries={bodyweightEntries}
              bodyweightSummary={bodyweightSummary}
              saveBodyweightEntry={saveBodyweightEntry}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              themeOptions={THEME_OPTIONS}
              weeklyWorkoutGoal={weeklyWorkoutGoal}
              setWeeklyWorkoutGoal={setWeeklyWorkoutGoal}
              dataMessage={dataMessage}
              storageWarning={storageWarning}
              pendingImport={pendingImport}
              exportAppData={exportAppData}
              exportWorkoutHistoryCsv={exportWorkoutHistoryCsv}
              fileInputRef={fileInputRef}
              handleImportFile={handleImportFile}
              applyPendingImport={applyPendingImport}
              clearPendingImport={clearPendingImport}
            />
          )}
        </div>
      </div>
      <AppDialog
        dialog={activeDialog}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  );
}

export default App;
