import React, { useState } from 'react';
import { getTodayInputValue, MAX_WEEKLY_WORKOUT_GOAL } from '../lib/workoutData.js';

const IMPORT_PREVIEW_TEXT =
  'Review the import preview below before replacing or merging your current data.';

export default function SettingsView({
  bodyweightSummary,
  saveBodyweightEntry,
  weeklyWorkoutGoal,
  setWeeklyWorkoutGoal,
  dataMessage,
  pendingImport,
  exportWorkoutHistoryCsv,
  fileInputRef,
  handleImportFile,
  applyPendingImport,
  clearPendingImport,
}) {
  const [bodyweightDate, setBodyweightDate] = useState(getTodayInputValue);
  const [bodyweightValue, setBodyweightValue] = useState('');

  const handleLogWeight = () => {
    if (!bodyweightValue) return;
    const didSave = saveBodyweightEntry(bodyweightDate, bodyweightValue);
    if (didSave) {
      setBodyweightValue('');
    }
  };

  const latestBodyweight = bodyweightSummary.latestWeight ?? '0.0';
  const deltaLabel =
    bodyweightSummary.deltaInRange !== null
      ? `${bodyweightSummary.deltaInRange > 0 ? '↑' : '↓'} ${Math.abs(bodyweightSummary.deltaInRange)}kg this week`
      : 'No recent trend';
  const showDataMessage = dataMessage?.text && dataMessage.text !== IMPORT_PREVIEW_TEXT;

  return (
    <>
      {showDataMessage ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            dataMessage.type === 'error'
              ? 'border-error/40 bg-error-container/30 text-error'
              : 'border-outline-variant bg-surface-container-high text-on-surface'
          }`}
          role="status"
          aria-live="polite"
        >
          {dataMessage.text}
        </p>
      ) : null}

      {/* Profile Bento Card */}
      <section className="grid grid-cols-6 gap-3">
        <div className="col-span-6 bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
            <img
              className="w-full h-full object-cover"
              alt="Profile"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAw2PvQCMZxBi8XDit9O5Xlgygcg8hu6TPDjFwS5R7h6BtgO-U44NxGXilgRAF8H6W0Nja32VzP6-xs14T6DSWPSDcjDtuxjMzba3fmQIcE1M3eqNL6XkznhSg7V5WC7BZ1U_Z0GmHhBx4QLGZvBgmmWpTB1t8Ut_Qg3qjbNy1m6aZ2TL7m5NZC7rInrOQlE2JsId-pnVz6Fb5hFdsS8OS0qP2O0CImdB-pVuPigDxbxPkvKZL9HNdQBVofZaCitYCRo9yHQp0G-sc"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Alex Rivera</h2>
            <p className="text-sm text-on-surface-variant">Elite Member since 2023</p>
          </div>
          <div className="ml-auto">
            <span className="material-symbols-outlined text-primary">edit</span>
          </div>
        </div>
      </section>

      {/* Bodyweight Log Entry */}
      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold px-2">
          Metric Tracker
        </h3>
        <div className="bg-surface-container-high border border-outline-variant rounded-xl p-5">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm text-on-surface-variant mb-1">Current Bodyweight</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-on-surface">{latestBodyweight}</span>
                <span className="text-primary font-bold">kg</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-tertiary font-medium">{deltaLabel}</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <label className="sr-only" htmlFor="bodyweight-date">
              Check-in date
            </label>
            <input
              id="bodyweight-date"
              aria-label="Check-in date"
              className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
              type="date"
              value={bodyweightDate}
              onChange={(event) => setBodyweightDate(event.target.value)}
            />
            <label className="sr-only" htmlFor="bodyweight-kg-input">
              Bodyweight (kg)
            </label>
            <input
              id="bodyweight-kg-input"
              aria-label="Bodyweight (kg)"
              className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-secondary"
              placeholder="Enter weight..."
              type="number"
              min="0"
              step="0.1"
              value={bodyweightValue}
              onChange={(e) => setBodyweightValue(e.target.value)}
            />
            <button
              className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold transition-all active:scale-95"
              onClick={handleLogWeight}
            >
              Save bodyweight
            </button>
          </div>
        </div>
      </section>

      {/* General Settings */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold px-2">
          General
        </h3>
        <div className="flex flex-col gap-2">
          <label className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-on-surface">Weekly Goal</p>
              <p className="text-xs text-on-surface-variant">Target sessions per week</p>
            </div>
            <input
              aria-label="Target sessions"
              className="w-24 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface text-right"
              min="1"
              max={MAX_WEEKLY_WORKOUT_GOAL}
              step="1"
              type="number"
              value={weeklyWorkoutGoal}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed)) {
                  const nextGoal = Math.min(
                    MAX_WEEKLY_WORKOUT_GOAL,
                    Math.max(1, Math.round(parsed)),
                  );
                  setWeeklyWorkoutGoal(nextGoal);
                }
              }}
            />
          </label>

          {/* Theme Toggle Item */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">dark_mode</span>
              </div>
              <div>
                <p className="font-bold text-on-surface">Dark Mode</p>
                <p className="text-xs text-on-surface-variant">Optimized for low light</p>
              </div>
            </div>
            <div className="w-12 h-6 bg-primary rounded-full relative flex items-center px-1">
              <div className="w-4 h-4 bg-on-primary rounded-full ml-auto"></div>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">notifications_active</span>
              </div>
              <div>
                <p className="font-bold text-on-surface">Notifications</p>
                <p className="text-xs text-on-surface-variant">Manage alerts and sounds</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">health_and_safety</span>
              </div>
              <div>
                <p className="font-bold text-on-surface">Privacy &amp; Security</p>
                <p className="text-xs text-on-surface-variant">Data permissions and biometrics</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold px-2">
          Data Management
        </h3>
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 border-b border-outline-variant hover:bg-surface-container-high transition-colors group"
            onClick={exportWorkoutHistoryCsv}
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                cloud_download
              </span>
              <span className="font-bold text-on-surface">Export Workout History</span>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">.CSV / .JSON</span>
          </button>

          <button
            className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary transition-colors">
                cloud_upload
              </span>
              <span className="font-bold text-on-surface">Import Data</span>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">FROM WEARABLES</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        <p className="text-[10px] text-center text-on-secondary-fixed-variant px-4">
          Last synced with Apple Health today at 08:42 AM
        </p>

        {pendingImport && (
          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-4 space-y-4">
            <h4 className="font-bold text-on-surface">Import Ready: {pendingImport.fileName}</h4>
            <p className="text-xs text-on-surface-variant">{IMPORT_PREVIEW_TEXT}</p>
            <div className="flex gap-2">
              <button
                onClick={() => applyPendingImport('replace')}
                className="flex-1 bg-primary text-on-primary py-2 rounded-lg font-bold text-sm"
              >
                Replace data
              </button>
              <button
                onClick={() => applyPendingImport('merge')}
                className="flex-1 bg-surface-variant border border-outline-variant py-2 rounded-lg font-bold text-sm"
              >
                Merge data
              </button>
            </div>
            <button
              onClick={clearPendingImport}
              className="w-full py-2 text-xs text-on-surface-variant"
            >
              Cancel import
            </button>
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="pb-10">
        <button className="w-full bg-error-container/20 border border-error/30 text-error rounded-xl py-4 font-bold active:bg-error/10 transition-colors">
          Sign Out
        </button>
      </section>
    </>
  );
}
