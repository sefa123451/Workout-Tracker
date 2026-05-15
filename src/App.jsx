import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppController } from './hooks/useAppController.jsx';
import { THEME_STORAGE_KEY, useThemeMode } from './hooks/useThemeMode.js';
import { MAX_WEEKLY_WORKOUT_GOAL, sortWorkouts } from './lib/workoutShared.js';

const VIEW_IDS = ['dashboard', 'log', 'history', 'progress', 'settings', 'exercises'];
const VISUAL_PREFS_STORAGE_KEY = 'workout-tracker-stitch-visual-prefs-v1';

const ACCENT_COLORS = {
  primary: '#a78bfa',
  emerald: '#34d399',
  orange: '#fb923c',
  blue: '#3b82f6',
};

const EXERCISE_FILTERS = ['all exercises', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

const VIEW_LABELS = {
  dashboard: 'dashboard',
  exercises: 'exercises',
  log: 'Log workout',
  history: 'history',
  progress: 'progress',
  settings: 'settings',
};

function getAssetPath(path) {
  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}${path.replace(/^\/+/, '')}`;
}

const VIEW_FILES = {
  desktop: {
    dashboard: 'stitch/dashboard.html',
    exercises: 'stitch/exercises.html',
    log: 'stitch/log.html',
    history: 'stitch/history.html',
    progress: 'stitch/progress.html',
    settings: 'stitch/settings.html',
  },
  mobile: {
    dashboard: 'stitch/dashboard-mobile.html',
    exercises: 'stitch/exercises-mobile.html',
    log: 'stitch/log-mobile.html',
    history: 'stitch/history-mobile.html',
    progress: 'stitch/progress-mobile.html',
    settings: 'stitch/settings-mobile.html',
  },
};

function readViewFromHash() {
  if (typeof window === 'undefined') {
    return 'dashboard';
  }

  const hash = window.location.hash.replace(/^#\/?/, '');
  return VIEW_IDS.includes(hash) ? hash : 'dashboard';
}

function getIsMobileViewport() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < 768;
}

function normalizeText(rawText) {
  return (rawText ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isElementNode(value) {
  return Boolean(value && value.nodeType === 1 && typeof value.closest === 'function');
}

function mapTextToView(rawText) {
  const text = normalizeText(rawText);

  if (!text) {
    return null;
  }

  if (text.includes('dashboard') || text.includes('home')) {
    return 'dashboard';
  }
  if (text.includes('add_circle') || text === 'log') {
    return 'log';
  }
  if (text.includes('format_list_bulleted')) {
    return 'history';
  }
  if (text.includes('query_stats')) {
    return 'progress';
  }
  if (text.includes('exercises') || text.includes('menu_book') || text.includes('library')) {
    return 'exercises';
  }
  if (text.includes('log workout') || text.includes('workouts')) {
    return 'log';
  }
  if (text.includes('history') || text.includes('calendar_month')) {
    return 'history';
  }
  if (
    text.includes('progress') ||
    text.includes('analytics') ||
    text.includes('monitoring') ||
    text.includes('stats')
  ) {
    return 'progress';
  }
  if (text.includes('settings') || text.includes('profile')) {
    return 'settings';
  }

  return null;
}

function isLikelyViewNavigationTarget(target) {
  if (!isElementNode(target)) {
    return false;
  }

  if (
    target.matches('[data-codex-action], input, select, textarea') ||
    target.closest('[data-codex-action], input, select, textarea')
  ) {
    return false;
  }

  if (!target.matches('a, button')) {
    return false;
  }

  return Boolean(target.closest('nav, header, aside'));
}

function mapTextToProgressWindow(rawText) {
  const text = normalizeText(rawText);

  if (text === '7d') {
    return 7;
  }
  if (text === '30d' || text === '1m') {
    return 30;
  }
  if (text === '90d' || text === '3m') {
    return 90;
  }
  if (text === 'ytd') {
    return 365;
  }
  if (text === 'all') {
    return 365;
  }

  return null;
}

function mapTextToProgressMetric(rawText) {
  const text = normalizeText(rawText);

  if (text === 'volume') {
    return 'volume';
  }
  if (text === 'intensity') {
    return 'intensity';
  }
  if (text === 'estimated 1rm') {
    return 'onerm';
  }

  return null;
}

function toMetricLabel(metricId) {
  if (metricId === 'volume') {
    return 'Volume';
  }
  if (metricId === 'intensity') {
    return 'Intensity';
  }
  if (metricId === 'onerm') {
    return 'Estimated 1RM';
  }
  return metricId;
}

function mapActionIdToProgressWindow(actionId) {
  if (actionId === 'progress-window-7') {
    return 7;
  }
  if (actionId === 'progress-window-30') {
    return 30;
  }
  if (actionId === 'progress-window-90') {
    return 90;
  }
  if (actionId === 'progress-window-365') {
    return 365;
  }
  return null;
}

function mapActionIdToProgressMetric(actionId) {
  if (actionId === 'progress-metric-volume') {
    return 'volume';
  }
  if (actionId === 'progress-metric-intensity') {
    return 'intensity';
  }
  if (actionId === 'progress-metric-onerm') {
    return 'onerm';
  }
  return null;
}

function createSyntheticSubmitEvent() {
  return {
    preventDefault() {},
  };
}

function getWorkoutIdFromTarget(target) {
  if (!isElementNode(target)) {
    return '';
  }

  return (
    target.getAttribute('data-codex-workout-id') ??
    target.closest?.('[data-codex-workout-id]')?.getAttribute('data-codex-workout-id') ??
    ''
  );
}

function buildInteractiveText(target) {
  if (!target) {
    return '';
  }

  const control =
    target.closest?.('a, button, [role="button"], .cursor-pointer') ??
    target.closest?.('[class*="hover:"]') ??
    target;

  const parts = [];
  const text = typeof control.textContent === 'string' ? control.textContent.trim() : '';
  if (text) {
    parts.push(text.slice(0, 200));
  }

  const ariaLabel = control.getAttribute?.('aria-label');
  const title = control.getAttribute?.('title');
  const dataIcon = control.getAttribute?.('data-icon');

  if (ariaLabel) {
    parts.push(ariaLabel);
  }
  if (title) {
    parts.push(title);
  }
  if (dataIcon) {
    parts.push(dataIcon);
  }

  const iconNodes = control.querySelectorAll?.('[data-icon]') ?? [];
  iconNodes.forEach((iconNode) => {
    const iconName = iconNode.getAttribute('data-icon');
    if (iconName) {
      parts.push(iconName);
    }
  });

  return normalizeText(parts.join(' '));
}

function getActionIdFromTarget(target) {
  if (!isElementNode(target)) {
    return '';
  }

  return (
    target.getAttribute('data-codex-action') ??
    target.closest?.('[data-codex-action]')?.getAttribute('data-codex-action') ??
    ''
  );
}

function hexToRgb(hexColor) {
  const cleaned = String(hexColor ?? '')
    .replace('#', '')
    .trim();
  if (cleaned.length !== 6) {
    return { r: 167, g: 139, b: 250 };
  }

  return {
    r: Number.parseInt(cleaned.slice(0, 2), 16),
    g: Number.parseInt(cleaned.slice(2, 4), 16),
    b: Number.parseInt(cleaned.slice(4, 6), 16),
  };
}

function toReadableLabel(rawText) {
  const text = normalizeText(rawText);
  if (!text) {
    return 'Aktion';
  }

  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 32) {
    return compact;
  }

  return `${compact.slice(0, 29)}...`;
}

function escapeHtml(rawValue) {
  return String(rawValue ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function flashInteractiveTarget(target) {
  if (!isElementNode(target)) {
    return;
  }

  if (typeof target.animate === 'function') {
    target.animate(
      [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'scale(0.985)', filter: 'brightness(1.1)' },
        { transform: 'scale(1)', filter: 'brightness(1)' },
      ],
      { duration: 170, easing: 'ease-out' },
    );
  }
}

function activateSiblingGroup(target) {
  if (!isElementNode(target)) {
    return;
  }

  const parent = target.parentElement;
  if (!parent) {
    return;
  }

  const candidates = [...parent.children].filter(
    (node) => isElementNode(node) && node.matches('button, a, .cursor-pointer'),
  );

  if (candidates.length < 2 || candidates.length > 14) {
    return;
  }

  candidates.forEach((node) => {
    if (!isElementNode(node)) {
      return;
    }

    if (node === target) {
      node.style.filter = 'brightness(1.14)';
      node.style.boxShadow = 'inset 0 0 0 1px rgba(167, 139, 250, 0.45)';
      node.style.borderRadius = node.style.borderRadius || '10px';
      return;
    }

    node.style.filter = '';
    node.style.boxShadow = '';
  });
}

function readVisualPreferences() {
  if (typeof window === 'undefined') {
    return {
      accent: 'primary',
      bodyweightRange: 'monthly',
      distanceUnit: 'km',
      highContrast: false,
      weightUnit: 'kg',
    };
  }

  try {
    const rawValue = window.localStorage.getItem(VISUAL_PREFS_STORAGE_KEY);
    if (!rawValue) {
      return {
        accent: 'primary',
        bodyweightRange: 'monthly',
        distanceUnit: 'km',
        highContrast: false,
        weightUnit: 'kg',
      };
    }

    const parsed = JSON.parse(rawValue);

    return {
      accent: Object.hasOwn(ACCENT_COLORS, parsed?.accent) ? parsed.accent : 'primary',
      bodyweightRange: parsed?.bodyweightRange === 'weekly' ? 'weekly' : 'monthly',
      distanceUnit: parsed?.distanceUnit === 'mi' ? 'mi' : 'km',
      highContrast: Boolean(parsed?.highContrast),
      weightUnit: parsed?.weightUnit === 'lb' ? 'lb' : 'kg',
    };
  } catch {
    return {
      accent: 'primary',
      bodyweightRange: 'monthly',
      distanceUnit: 'km',
      highContrast: false,
      weightUnit: 'kg',
    };
  }
}

function detectAccentFromClassName(className) {
  const normalizedClassName = String(className ?? '');

  if (normalizedClassName.includes('bg-tertiary')) {
    return 'emerald';
  }
  if (normalizedClassName.includes('bg-orange-400')) {
    return 'orange';
  }
  if (normalizedClassName.includes('bg-blue-500')) {
    return 'blue';
  }
  if (normalizedClassName.includes('bg-primary')) {
    return 'primary';
  }

  return null;
}

function getFixedAccentColor(accent) {
  return ACCENT_COLORS[accent] ?? ACCENT_COLORS.primary;
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveEntryIndexFromTarget(target, entryCount) {
  if (!isElementNode(target) || entryCount <= 1) {
    return 0;
  }

  const doc = target.ownerDocument;
  if (!doc) {
    return 0;
  }

  const section = target.closest('section');
  const explicitEntryIndex = Number.parseInt(section?.dataset?.codexEntryIndex ?? '', 10);
  if (Number.isFinite(explicitEntryIndex)) {
    return Math.max(0, Math.min(explicitEntryIndex, entryCount - 1));
  }

  if (!section) {
    return entryCount - 1;
  }

  const sections = [...doc.querySelectorAll('section')].filter((candidate) =>
    candidate.querySelector('h2, h3, h4'),
  );
  const sectionIndex = sections.indexOf(section);

  if (sectionIndex < 0) {
    return entryCount - 1;
  }

  return Math.max(0, Math.min(sectionIndex, entryCount - 1));
}

function resolveSetIndexFromTarget(target, setCount, fallbackIndex = 0) {
  const clampedFallback = Math.max(0, Math.min(fallbackIndex, Math.max(0, setCount - 1)));
  if (!isElementNode(target) || setCount <= 1) {
    return clampedFallback;
  }

  const row = target.closest('.grid.grid-cols-6, .grid.grid-cols-12');
  const explicitSetIndex = Number.parseInt(row?.dataset?.codexSetIndex ?? '', 10);
  if (Number.isFinite(explicitSetIndex)) {
    return Math.max(0, Math.min(explicitSetIndex, setCount - 1));
  }

  const section = row?.closest('section');
  if (!row || !section) {
    return clampedFallback;
  }

  const rowSelector = row.classList.contains('grid-cols-12')
    ? '.grid.grid-cols-12'
    : '.grid.grid-cols-6';
  const rows = [...section.querySelectorAll(rowSelector)].filter(
    (candidate) => candidate.querySelector('input') && candidate.querySelector('button'),
  );
  const rowIndex = rows.indexOf(row);

  if (rowIndex < 0) {
    return clampedFallback;
  }

  return Math.max(0, Math.min(rowIndex, setCount - 1));
}

function findBodyweightInputs(doc) {
  if (!doc) {
    return {
      dateInput: null,
      weightInput: null,
    };
  }

  const dateInput = doc.querySelector('input[type="date"]');
  const numberInputs = [...doc.querySelectorAll('input[type="number"]')];

  let weightInput = numberInputs.find((input) => {
    const label = normalizeText(
      [
        input.getAttribute('aria-label'),
        input.getAttribute('placeholder'),
        input.closest('label, div')?.textContent,
      ]
        .filter(Boolean)
        .join(' '),
    );

    return label.includes('weight');
  });

  if (!weightInput && numberInputs.length) {
    [weightInput] = numberInputs;
  }

  return {
    dateInput,
    weightInput,
  };
}

function isWeeklyGoalInput(target) {
  if (!isElementNode(target) || target.tagName !== 'INPUT') {
    return false;
  }

  const inputType = String(target.type ?? target.getAttribute('type') ?? '').toLowerCase();
  if (inputType !== 'number') {
    return false;
  }

  const textContext = normalizeText(
    [
      target.getAttribute('aria-label'),
      target.getAttribute('placeholder'),
      target.closest('label, div')?.textContent,
    ]
      .filter(Boolean)
      .join(' '),
  );

  return textContext.includes('weekly goal') || textContext.includes('target sessions');
}

function App() {
  const controller = useAppController();
  const { themeMode, setThemeMode, resolvedTheme } = useThemeMode();
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);
  const [actionNotice, setActionNotice] = useState('');
  const [visualPrefs, setVisualPrefs] = useState(readVisualPreferences);
  const iframeRef = useRef(null);
  const actionNoticeTimeoutRef = useRef(null);
  const restTimerIntervalsRef = useRef(new Map());
  const pendingImportRef = useRef(controller.pendingImport);
  const splitsRef = useRef(controller.splits);
  const workoutsRef = useRef(controller.workouts);
  const latestWorkoutRef = useRef(controller.latestWorkout);
  const exercisesRef = useRef(controller.exercises);
  const workoutFormRef = useRef(controller.workoutForm);
  const visualPrefsRef = useRef(visualPrefs);
  const hasSyncedInitialHashRef = useRef(false);
  const handleFrameActionRef = useRef(null);
  const handleGenericInteractionRef = useRef(null);

  const {
    activeView,
    setActiveView,
    splits,
    workouts,
    workoutForm,
    pendingImport,
    latestWorkout,
    exercises,
    setSelectedProgressWindow,
    setSelectedProgressMetric,
    selectedProgressWindow,
    selectedProgressMetric,
    fileInputRef,
    handleImportFile,
    dataMessage,
    storageWarning,
    startWorkoutFromSplit,
    repeatLatestWorkout,
    startWorkoutFromLastUsedTemplate,
    handleWorkoutSubmit,
    workoutMessage,
    resetWorkoutForm,
    exportAppData,
    exportWorkoutHistoryCsv,
    applyPendingImport,
    clearPendingImport,
    startEditingWorkout,
    saveWorkoutAsTemplate,
    setWorkoutForm,
    createWorkoutEntry,
    createSet,
    saveBodyweightEntry,
    saveCustomExercise,
    setWeeklyWorkoutGoal,
  } = controller;

  useEffect(() => {
    pendingImportRef.current = pendingImport;
  }, [pendingImport]);

  useEffect(() => {
    splitsRef.current = splits;
  }, [splits]);

  useEffect(() => {
    workoutsRef.current = workouts;
  }, [workouts]);

  useEffect(() => {
    latestWorkoutRef.current = latestWorkout;
  }, [latestWorkout]);

  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  useEffect(() => {
    workoutFormRef.current = workoutForm;
  }, [workoutForm]);

  useEffect(() => {
    visualPrefsRef.current = visualPrefs;
  }, [visualPrefs]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    function handleHashChange() {
      setActiveView(readViewFromHash());
    }

    function handleResize() {
      setIsMobileViewport(getIsMobileViewport());
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [setActiveView]);

  useEffect(() => {
    if (!hasSyncedInitialHashRef.current) {
      hasSyncedInitialHashRef.current = true;
      const initialView = readViewFromHash();

      if (initialView !== activeView) {
        setActiveView(initialView);
        return;
      }
    }

    const targetHash = `#/${activeView}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, [activeView, setActiveView]);

  const src = useMemo(() => {
    const variant = isMobileViewport ? 'mobile' : 'desktop';
    return getAssetPath(VIEW_FILES[variant][activeView] ?? VIEW_FILES[variant].dashboard);
  }, [activeView, isMobileViewport]);

  useEffect(
    () => () => {
      if (actionNoticeTimeoutRef.current) {
        window.clearTimeout(actionNoticeTimeoutRef.current);
      }

      for (const intervalId of restTimerIntervalsRef.current.values()) {
        window.clearInterval(intervalId);
      }
      restTimerIntervalsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(VISUAL_PREFS_STORAGE_KEY, JSON.stringify(visualPrefs));
  }, [visualPrefs]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const accentColor = ACCENT_COLORS[visualPrefs.accent] ?? ACCENT_COLORS.primary;
    document.documentElement.style.setProperty('--stitch-accent', accentColor);

    const frame = iframeRef.current;
    if (!frame) {
      return;
    }

    const filters = [];

    if (resolvedTheme === 'light') {
      filters.push('invert(1)', 'hue-rotate(180deg)');
    }

    if (visualPrefs.highContrast) {
      filters.push('contrast(1.16)', 'saturate(1.08)');
    }

    frame.style.filter = filters.join(' ') || 'none';
    frame.style.background = resolvedTheme === 'light' ? '#f5f5f7' : '#09090b';

    const doc = frame.contentDocument;
    if (doc) {
      syncFrameVisualState(doc);
    }
    // syncFrameVisualState is intentionally a function declaration in component scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resolvedTheme,
    visualPrefs,
    activeView,
    isMobileViewport,
    selectedProgressMetric,
    selectedProgressWindow,
    pendingImport,
  ]);

  function showActionNotice(text) {
    if (actionNoticeTimeoutRef.current) {
      window.clearTimeout(actionNoticeTimeoutRef.current);
    }

    setActionNotice(text);
    actionNoticeTimeoutRef.current = window.setTimeout(() => {
      setActionNotice('');
    }, 1900);
  }

  function updateVisualPreferences(patch) {
    setVisualPrefs((current) => {
      const next = {
        ...current,
        ...patch,
      };
      visualPrefsRef.current = next;
      return next;
    });
  }

  function syncFrameVisualState(doc) {
    if (!doc) {
      return;
    }

    renderSettingsImportDecision(doc);

    const currentPrefs = visualPrefsRef.current;
    const accentColor = ACCENT_COLORS[currentPrefs.accent] ?? ACCENT_COLORS.primary;
    const { r, g, b } = hexToRgb(accentColor);
    const accent10 = `rgba(${r}, ${g}, ${b}, 0.1)`;
    const accent20 = `rgba(${r}, ${g}, ${b}, 0.2)`;
    const accent30 = `rgba(${r}, ${g}, ${b}, 0.3)`;
    const accent40 = `rgba(${r}, ${g}, ${b}, 0.4)`;
    const accent50 = `rgba(${r}, ${g}, ${b}, 0.5)`;
    const accentTextOn = '#0a0012';

    const styleHost = doc.head ?? doc.documentElement ?? doc.body;
    if (!styleHost) {
      return;
    }

    let themeOverrides = doc.getElementById('codex-accent-overrides');
    if (!themeOverrides) {
      themeOverrides = doc.createElement('style');
      themeOverrides.id = 'codex-accent-overrides';
      styleHost.appendChild(themeOverrides);
    }

    themeOverrides.textContent = `
      .bg-primary { background-color: ${accentColor}; }
      .bg-primary\\/10 { background-color: ${accent10}; }
      .bg-primary\\/20 { background-color: ${accent20}; }
      .bg-primary\\/40 { background-color: ${accent40}; }
      .bg-primary\\/50 { background-color: ${accent50}; }
      .text-primary, .text-violet-400, .text-\\[\\#a78bfa\\] { color: ${accentColor}; }
      .border-primary, .border-\\[\\#a78bfa\\] { border-color: ${accentColor}; }
      .border-primary\\/20 { border-color: ${accent20}; }
      .border-primary\\/50 { border-color: ${accent50}; }
      .shadow-primary\\/10 { --tw-shadow-color: ${accent10}; }
      .selection\\:bg-primary\\/30::selection,
      .selection\\:bg-primary\\/30 *::selection {
        background-color: ${accent30};
      }
      [stroke='currentColor'].text-primary { color: ${accentColor}; }
    `;

    function setChoiceButtonState(button, isActive) {
      if (!isElementNode(button)) {
        return;
      }

      button.style.backgroundColor = isActive ? accentColor : 'transparent';
      button.style.color = isActive ? accentTextOn : '#a1a1aa';
      button.style.fontWeight = '700';
      button.style.boxShadow = isActive ? `0 0 0 1px ${accentColor}` : 'none';
      button.style.filter = isActive ? 'brightness(1)' : 'none';
    }

    function setToggleState(label, isOn) {
      const labelNode = [...doc.querySelectorAll('span, p')].find(
        (node) => normalizeText(node.textContent) === label,
      );

      if (!labelNode) {
        return;
      }

      const row =
        labelNode.closest('div.flex.items-center.justify-between') ?? labelNode.closest('div');
      const track = row?.querySelector('.w-10.h-5');

      if (!isElementNode(track)) {
        return;
      }

      const knob = track.querySelector('div');

      track.style.backgroundColor = isOn ? accentColor : '#27272a';
      track.style.boxShadow = isOn ? `0 0 0 1px ${accentColor}` : 'none';

      if (isElementNode(knob)) {
        knob.style.backgroundColor = isOn ? '#0a0012' : '#52525b';
        knob.style.left = isOn ? '' : '2px';
        knob.style.right = isOn ? '2px' : '';
      }
    }

    const buttons = [...doc.querySelectorAll('button')];
    const kgButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('kilograms (kg)'),
    );
    const lbButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('pounds (lb)'),
    );
    const miButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('miles (mi)'),
    );
    const kmButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('kilometers (km)'),
    );

    setChoiceButtonState(kgButton, currentPrefs.weightUnit === 'kg');
    setChoiceButtonState(lbButton, currentPrefs.weightUnit === 'lb');
    setChoiceButtonState(miButton, currentPrefs.distanceUnit === 'mi');
    setChoiceButtonState(kmButton, currentPrefs.distanceUnit === 'km');

    const weeklyButton = buttons.find((button) => normalizeText(button.textContent) === 'weekly');
    const monthlyButton = buttons.find((button) => normalizeText(button.textContent) === 'monthly');
    setChoiceButtonState(weeklyButton, currentPrefs.bodyweightRange === 'weekly');
    setChoiceButtonState(monthlyButton, currentPrefs.bodyweightRange === 'monthly');

    setToggleState('dark mode', resolvedTheme === 'dark');
    setToggleState('high contrast', currentPrefs.highContrast);

    const accentSwatches = [...doc.querySelectorAll('.w-8.h-8.rounded-full.cursor-pointer')];
    accentSwatches.forEach((swatch) => {
      if (!isElementNode(swatch)) {
        return;
      }

      const accent = detectAccentFromClassName(swatch.className);
      if (!accent) {
        return;
      }

      swatch.style.backgroundColor = getFixedAccentColor(accent);
      swatch.style.boxShadow =
        accent === currentPrefs.accent
          ? `0 0 0 2px ${accentColor}, inset 0 0 0 1px rgba(250, 250, 250, 0.55)`
          : 'none';
    });

    const allProgressButtons = buttons.filter((button) => {
      const actionId = button.getAttribute('data-codex-action') ?? '';
      const text = normalizeText(button.textContent);
      if (actionId.startsWith('progress-window-') || actionId.startsWith('progress-metric-')) {
        return true;
      }
      return (
        [
          '7d',
          '30d',
          '90d',
          '1m',
          '3m',
          'ytd',
          'all',
          'volume',
          'intensity',
          'estimated 1rm',
        ].includes(text) || text.includes('estimated 1rm')
      );
    });

    allProgressButtons.forEach((button) => {
      if (!isElementNode(button)) {
        return;
      }

      const text = normalizeText(button.textContent);
      const actionId = button.getAttribute('data-codex-action') ?? '';
      const windowFromAction = mapActionIdToProgressWindow(actionId);
      const metricFromAction = mapActionIdToProgressMetric(actionId);
      const windowFromText = mapTextToProgressWindow(text);
      const metricFromText = mapTextToProgressMetric(text);
      const resolvedWindow = windowFromAction ?? windowFromText;
      const resolvedMetric = metricFromAction ?? metricFromText;
      const isWindowActive = resolvedWindow !== null && selectedProgressWindow === resolvedWindow;
      const isMetricActive = Boolean(resolvedMetric && selectedProgressMetric === resolvedMetric);

      const isActive = isWindowActive || isMetricActive;
      button.style.boxShadow = isActive ? `inset 0 0 0 1px ${accentColor}` : '';
      button.style.filter = isActive ? 'brightness(1.14)' : '';
    });
  }

  function renderSettingsImportDecision(doc) {
    if (!doc || activeView !== 'settings') {
      return;
    }

    let panel = doc.querySelector('[data-codex-import-decision]');
    const importInfo = pendingImportRef.current;

    if (!importInfo) {
      panel?.remove();
      return;
    }

    if (!panel) {
      panel = doc.createElement('section');
      panel.setAttribute('data-codex-import-decision', '1');
      panel.className =
        'bg-surface-container border border-primary/40 rounded-xl p-6 mt-6 space-y-4';

      const main = doc.querySelector('main') ?? doc.body;
      const dataHeading = [...doc.querySelectorAll('h2, h3')].find((heading) =>
        normalizeText(heading.textContent).includes('data management'),
      );
      const dataSection = dataHeading?.closest('section');

      if (dataSection?.parentElement) {
        dataSection.parentElement.insertBefore(panel, dataSection.nextSibling);
      } else {
        main.appendChild(panel);
      }
    }

    const value = importInfo.value;
    const counts = [
      `${value.exercises.length} exercises`,
      `${value.splits.length} splits`,
      `${value.templates?.length ?? 0} templates`,
      `${value.workouts.length} workouts`,
      `${value.bodyweightEntries?.length ?? 0} bodyweight check-ins`,
    ].join(' · ');

    panel.innerHTML = `
      <div>
        <p class="text-xs uppercase tracking-widest text-primary font-bold">Import preview</p>
        <h3 class="text-xl font-black text-on-surface mt-1">${escapeHtml(importInfo.fileName)}</h3>
        <p class="text-sm text-secondary mt-2">${escapeHtml(counts)}</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button type="button" class="px-4 py-3 rounded-lg bg-primary text-on-primary text-sm font-bold" data-codex-action="settings-import-replace">Replace data</button>
        <button type="button" class="px-4 py-3 rounded-lg bg-surface-container-highest border border-outline-variant text-on-surface text-sm font-bold" data-codex-action="settings-import-merge">Merge data</button>
        <button type="button" class="px-4 py-3 rounded-lg border border-outline-variant text-secondary text-sm font-bold" data-codex-action="settings-import-cancel">Cancel import</button>
      </div>
    `;
  }

  function renderSettingsBodyweightControls(doc) {
    if (!doc || activeView !== 'settings') {
      return;
    }

    if (doc.querySelector('[data-codex-bodyweight-controls]')) {
      return;
    }

    const hasSaveControl = [...doc.querySelectorAll('button')].some((button) => {
      const text = normalizeText(button.textContent);
      return text === 'log' || text.includes('save bodyweight');
    });

    if (hasSaveControl && findBodyweightInputs(doc).weightInput) {
      return;
    }

    const bodyweightHeading = [...doc.querySelectorAll('h2, h3')].find((heading) =>
      normalizeText(heading.textContent).includes('bodyweight tracking'),
    );
    const bodyweightSection = bodyweightHeading?.closest('section');

    if (!bodyweightSection) {
      return;
    }

    const controls = doc.createElement('div');
    controls.setAttribute('data-codex-bodyweight-controls', '1');
    controls.className = 'mt-4 border-t border-outline-variant pt-4';
    controls.innerHTML = `
      <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 0.75rem; align-items: end;">
        <label for="codex-bodyweight-date" style="display: grid; gap: 0.35rem; min-width: 0;">
          <span class="text-[10px] uppercase tracking-wider text-secondary font-bold">Check-in date</span>
          <input
            id="codex-bodyweight-date"
            aria-label="Check-in date"
            class="border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
            style="width: 100%; min-width: 0; height: 48px; background: #0f0f12; color: #fafafa;"
            type="date"
            value="${getTodayInputValue()}"
          />
        </label>
        <label for="codex-bodyweight-value" style="display: grid; gap: 0.35rem; min-width: 0;">
          <span class="text-[10px] uppercase tracking-wider text-secondary font-bold">Bodyweight (kg)</span>
          <input
            id="codex-bodyweight-value"
            aria-label="Bodyweight (kg)"
            class="border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
            style="width: 100%; min-width: 0; height: 48px; background: #0f0f12; color: #fafafa;"
            placeholder="Enter weight..."
            type="number"
            min="0"
            step="0.1"
          />
        </label>
        <button
          type="button"
          class="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold transition-all active:scale-95"
          style="height: 48px; min-width: 96px;"
          data-codex-action="settings-save-bodyweight"
        >
          Log
        </button>
      </div>
    `;
    bodyweightSection.appendChild(controls);
  }

  function wireSettingsActions(doc) {
    if (!doc || activeView !== 'settings') {
      return;
    }

    renderSettingsBodyweightControls(doc);

    const buttons = [...doc.querySelectorAll('button')];

    const weeklyButton = buttons.find((button) => normalizeText(button.textContent) === 'weekly');
    const monthlyButton = buttons.find((button) => normalizeText(button.textContent) === 'monthly');
    const exportJsonButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('export json'),
    );
    const importJsonButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('import json'),
    );
    const kgButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('kilograms (kg)'),
    );
    const lbButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('pounds (lb)'),
    );
    const miButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('miles (mi)'),
    );
    const kmButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('kilometers (km)'),
    );
    const deleteEverythingButton = buttons.find((button) =>
      normalizeText(button.textContent).includes('delete everything'),
    );

    weeklyButton?.setAttribute('data-codex-action', 'settings-weekly');
    monthlyButton?.setAttribute('data-codex-action', 'settings-monthly');
    exportJsonButton?.setAttribute('data-codex-action', 'settings-export-json');
    importJsonButton?.setAttribute('data-codex-action', 'settings-import-json');
    kgButton?.setAttribute('data-codex-action', 'settings-weight-kg');
    lbButton?.setAttribute('data-codex-action', 'settings-weight-lb');
    miButton?.setAttribute('data-codex-action', 'settings-distance-mi');
    kmButton?.setAttribute('data-codex-action', 'settings-distance-km');
    deleteEverythingButton?.setAttribute('data-codex-action', 'settings-delete-everything');

    const darkModeLabel = [...doc.querySelectorAll('span, p')].find(
      (node) => normalizeText(node.textContent) === 'dark mode',
    );
    const highContrastLabel = [...doc.querySelectorAll('span, p')].find(
      (node) => normalizeText(node.textContent) === 'high contrast',
    );

    const darkModeRow = darkModeLabel?.closest(
      'div.p-3.rounded-lg.border.bg-surface-container-low',
    );
    const highContrastRow = highContrastLabel?.closest(
      'div.p-3.rounded-lg.border.bg-surface-container-low',
    );
    const darkModeLead = darkModeLabel?.closest('div.flex.items-center.gap-3');
    const highContrastLead = highContrastLabel?.closest('div.flex.items-center.gap-3');
    const darkModeTrack = darkModeRow?.querySelector('.w-10.h-5');
    const highContrastTrack = highContrastRow?.querySelector('.w-10.h-5');
    const cloudSyncRow = buttons.find((button) =>
      normalizeText(button.textContent).includes('cloud sync'),
    );
    const privacyProfileRow = buttons.find((button) =>
      normalizeText(button.textContent).includes('privacy profile'),
    );

    darkModeTrack?.setAttribute('data-codex-action', 'settings-toggle-dark-mode');
    highContrastTrack?.setAttribute('data-codex-action', 'settings-toggle-high-contrast');
    darkModeLabel?.setAttribute('data-codex-action', 'settings-toggle-dark-mode');
    highContrastLabel?.setAttribute('data-codex-action', 'settings-toggle-high-contrast');
    darkModeLead?.setAttribute('data-codex-action', 'settings-toggle-dark-mode');
    highContrastLead?.setAttribute('data-codex-action', 'settings-toggle-high-contrast');
    cloudSyncRow?.setAttribute('data-codex-action', 'settings-cloud-sync');
    privacyProfileRow?.setAttribute('data-codex-action', 'settings-privacy-profile');

    const accentSwatches = [...doc.querySelectorAll('.w-8.h-8.rounded-full.cursor-pointer')];
    accentSwatches.forEach((swatch) => {
      const accent = detectAccentFromClassName(swatch.className);
      if (!accent) {
        return;
      }

      swatch.setAttribute('data-codex-action', `settings-accent-${accent}`);
    });
  }

  function wireProgressActions(doc) {
    if (!doc || activeView !== 'progress') {
      return;
    }

    const actionByText = {
      '7d': 'progress-window-7',
      '30d': 'progress-window-30',
      '1m': 'progress-window-30',
      '90d': 'progress-window-90',
      '3m': 'progress-window-90',
      ytd: 'progress-window-365',
      all: 'progress-window-365',
      volume: 'progress-metric-volume',
      intensity: 'progress-metric-intensity',
      'estimated 1rm': 'progress-metric-onerm',
    };

    const buttons = [...doc.querySelectorAll('button')];
    buttons.forEach((button) => {
      if (!isElementNode(button)) {
        return;
      }

      const text = normalizeText(button.textContent);
      const actionId = actionByText[text];
      if (actionId) {
        button.setAttribute('data-codex-action', actionId);
      } else if (text.includes('detailed muscle analysis')) {
        button.setAttribute('data-codex-action', 'progress-detailed-muscle-analysis');
      }
    });
  }

  function wireGlobalActions(doc) {
    if (!doc) {
      return;
    }

    [...doc.querySelectorAll('button, [role="button"], .cursor-pointer')].forEach((target) => {
      if (!isElementNode(target) || target.getAttribute('data-codex-action')) {
        return;
      }

      const text = normalizeText(target.textContent);

      if (text === 'notifications') {
        target.setAttribute('data-codex-action', 'global-open-notifications');
      }

      if (text === 'settings') {
        target.setAttribute('data-codex-action', 'global-open-settings');
      }

      if (text === 'arrow_back') {
        target.setAttribute('data-codex-action', 'global-go-dashboard');
      }
    });
  }

  function wireDashboardActions(doc) {
    if (!doc || activeView !== 'dashboard') {
      return;
    }

    [...doc.querySelectorAll('button')].forEach((button) => {
      if (!isElementNode(button) || button.getAttribute('data-codex-action')) {
        return;
      }

      const text = normalizeText(button.textContent);

      if (text.includes('start empty workout')) {
        button.setAttribute('data-codex-action', 'dashboard-start-empty-workout');
      } else if (
        text.includes('push day a') ||
        text.includes('legs - strength focus') ||
        text.includes('upper body mobility')
      ) {
        button.setAttribute('data-codex-action', 'dashboard-start-preset-workout');
      } else if (text.includes('view all records')) {
        button.setAttribute('data-codex-action', 'dashboard-view-history');
      }
    });
  }

  function wireHistoryActions(doc) {
    if (!doc || activeView !== 'history') {
      return;
    }

    [...doc.querySelectorAll('button')].forEach((button) => {
      if (!isElementNode(button) || button.getAttribute('data-codex-action')) {
        return;
      }

      const text = normalizeText(button.textContent);

      if (text.includes('filter_list') || text === 'filter') {
        button.setAttribute('data-codex-action', 'history-filter-owned-workouts');
      } else if (text.includes('download') || text === 'export') {
        button.setAttribute('data-codex-action', 'history-export-csv');
      }
    });
  }

  function getExerciseDisplayName(exerciseId) {
    const exercise = exercisesRef.current.find((item) => item.id === exerciseId);
    if (!exercise?.name) {
      return 'Custom Exercise';
    }

    return exercise.name;
  }

  function getExerciseDescriptor(exerciseId) {
    const exercise = exercisesRef.current.find((item) => item.id === exerciseId);
    const candidates = [exercise?.category, exercise?.muscleGroup, exercise?.type]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);

    if (!candidates.length) {
      return 'Split exercise';
    }

    return candidates.join(' • ');
  }

  function getLatestLoggedEntryForExercise(exerciseId) {
    if (!exerciseId) {
      return null;
    }

    const orderedWorkouts = sortWorkouts(workoutsRef.current ?? []);

    for (const workout of orderedWorkouts) {
      const matchingEntry = workout?.entries?.find((entry) => entry.exerciseId === exerciseId);
      if (matchingEntry?.sets?.length) {
        return matchingEntry;
      }
    }

    return null;
  }

  function applyLatestValuesToWorkoutEntries(entries) {
    if (!Array.isArray(entries) || !entries.length) {
      return entries;
    }

    return entries.map((entry) => {
      const latestEntry = getLatestLoggedEntryForExercise(entry.exerciseId);
      if (!latestEntry?.sets?.length) {
        return entry;
      }

      const fallbackSet = latestEntry.sets[latestEntry.sets.length - 1] ?? null;
      const baseSets = entry.sets.length ? entry.sets : [createSet()];

      return {
        ...entry,
        sets: baseSets.map((set, setIndex) => {
          const sourceSet = latestEntry.sets[setIndex] ?? fallbackSet;
          if (!sourceSet) {
            return {
              ...set,
              completed: false,
            };
          }

          return {
            ...set,
            weight: String(sourceSet.weight ?? ''),
            reps: String(sourceSet.reps ?? ''),
            completed: false,
          };
        }),
      };
    });
  }

  function loadSplitIntoWorkout(splitId, { withLastValues = true } = {}) {
    const split = splitsRef.current.find((item) => item.id === splitId);
    if (!split) {
      return null;
    }

    const createdEntries = split.exercises.length
      ? split.exercises.map((splitExercise) => {
          const defaultSets = Number.parseInt(splitExercise.defaultSets, 10);
          const setCount = Number.isFinite(defaultSets) && defaultSets > 0 ? defaultSets : 1;
          return createWorkoutEntry(splitExercise.exerciseId, setCount);
        })
      : [createWorkoutEntry(exercisesRef.current[0]?.id ?? '', 1)];

    const entries = withLastValues
      ? applyLatestValuesToWorkoutEntries(createdEntries)
      : createdEntries;
    const nextForm = {
      ...workoutFormRef.current,
      splitId: split.id,
      entries,
      skippedEntries: [],
    };

    workoutFormRef.current = nextForm;
    setWorkoutForm(nextForm);
    return nextForm;
  }

  function applyLastValuesToCurrentWorkout() {
    const currentForm = workoutFormRef.current;
    const nextForm = {
      ...currentForm,
      entries: applyLatestValuesToWorkoutEntries(currentForm.entries),
    };

    workoutFormRef.current = nextForm;
    setWorkoutForm(nextForm);
    return nextForm;
  }

  function getSelectedSplitIdFromFrame(doc) {
    if (!doc) {
      return '';
    }

    const splitSelect = doc.querySelector('[data-codex-log-split-select]');
    return splitSelect?.value ?? '';
  }

  function getSelectedExerciseIdFromFrame(doc) {
    if (!doc) {
      return '';
    }

    const exerciseSelect = doc.querySelector('[data-codex-log-exercise-select]');
    return exerciseSelect?.value ?? '';
  }

  function findLogExerciseContext(doc) {
    if (!doc) {
      return null;
    }

    const addExerciseButton = [...doc.querySelectorAll('button')].find((button) =>
      normalizeText(button.textContent).includes('add exercise'),
    );

    if (!addExerciseButton) {
      return null;
    }

    const desktopContainer = addExerciseButton.closest('.lg\\:col-span-8');
    const container = desktopContainer ?? addExerciseButton.closest('main');
    if (!container) {
      return null;
    }

    const beforeNode = addExerciseButton.closest('.px-6') ?? addExerciseButton;
    const exerciseSections = [...container.querySelectorAll('section')].filter((section) => {
      const hasSetRows = Boolean(
        section.querySelector('.grid.grid-cols-6 input, .grid.grid-cols-12 input'),
      );
      if (!hasSetRows) {
        return false;
      }

      if (typeof section.compareDocumentPosition !== 'function') {
        return true;
      }

      return Boolean(section.compareDocumentPosition(beforeNode) & 4);
    });

    return {
      addExerciseButton,
      beforeNode,
      container,
      exerciseSections,
    };
  }

  function isMobileLogDocument(doc) {
    return Boolean(
      doc?.body?.className?.includes('max-w-[390px]') || doc?.querySelector('nav.md\\:hidden'),
    );
  }

  function injectLogMobileActionDock(doc) {
    if (!doc || activeView !== 'log' || !isMobileLogDocument(doc)) {
      return;
    }

    const existingDecorativeSheet = doc.querySelector('[data-codex-rest-sheet]');
    if (existingDecorativeSheet) {
      existingDecorativeSheet.setAttribute('hidden', '');
    }

    let dock = doc.querySelector('[data-codex-log-mobile-dock]');
    if (dock) {
      return;
    }

    dock = doc.createElement('div');
    dock.setAttribute('data-codex-log-mobile-dock', '1');
    dock.className = 'fixed inset-x-0 bottom-16 z-40 px-4';
    dock.innerHTML = `
      <div class="bg-surface-container-highest border border-outline-variant rounded-xl p-2 shadow-lg" style="max-width: 390px; margin: 0 auto;">
        <div class="flex gap-2">
          <button type="button" class="rounded-xl border border-outline-variant bg-surface-container-highest py-3 text-xs font-bold uppercase tracking-widest text-on-surface" style="flex: 1;" data-codex-action="log-rest-timer">
            Rest
          </button>
          <button type="button" class="rounded-xl border border-outline-variant bg-primary-container py-3 text-xs font-bold uppercase tracking-widest text-on-primary-container" style="flex: 1;" data-codex-action="log-add-exercise">
            Add
          </button>
          <button type="button" class="rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-on-primary" style="flex: 1;" data-codex-action="log-finish-workout">
            Finish
          </button>
        </div>
      </div>
    `;

    doc.body.appendChild(dock);
  }

  function setSelectOptions(selectNode, options, selectedValue, emptyLabel) {
    if (!selectNode) {
      return '';
    }

    selectNode.innerHTML = '';

    if (!options.length) {
      const placeholder = selectNode.ownerDocument.createElement('option');
      placeholder.value = '';
      placeholder.textContent = emptyLabel;
      selectNode.appendChild(placeholder);
      selectNode.value = '';
      selectNode.disabled = true;
      return '';
    }

    options.forEach((option) => {
      const optionNode = selectNode.ownerDocument.createElement('option');
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      selectNode.appendChild(optionNode);
    });

    const nextValue = options.some((option) => option.value === selectedValue)
      ? selectedValue
      : options[0].value;
    selectNode.value = nextValue;
    selectNode.disabled = false;
    return nextValue;
  }

  function injectLogQuickSetup(doc) {
    if (!doc || activeView !== 'log') {
      return;
    }

    const main = doc.querySelector('main');
    if (!main) {
      return;
    }

    let quickSetup = doc.querySelector('[data-codex-log-quick-setup]');

    if (!quickSetup) {
      quickSetup = doc.createElement('div');
      quickSetup.setAttribute('data-codex-log-quick-setup', '1');
      quickSetup.className = 'px-6 mb-6';
      quickSetup.innerHTML = `
        <div class="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
          <p class="text-[10px] uppercase tracking-widest text-secondary font-bold">Quick Setup</p>
          <div class="grid gap-2 md:grid-cols-3">
            <select class="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary" data-codex-log-split-select></select>
            <button class="w-full bg-primary text-on-primary rounded-lg px-3 py-2 text-sm font-bold hover:opacity-90 transition-colors" data-codex-action="log-load-split">Split laden</button>
            <button class="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm font-bold text-on-surface hover:bg-surface-container-highest transition-colors" data-codex-action="log-apply-last-values">Letzte Werte übernehmen</button>
          </div>
          <div class="grid gap-2 md:grid-cols-3">
            <select class="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary" data-codex-log-exercise-select></select>
            <button class="w-full bg-primary-container text-on-primary-container rounded-lg px-3 py-2 text-sm font-bold hover:opacity-90 transition-colors" data-codex-action="log-add-specific-exercise">Übung einfügen</button>
          </div>
        </div>
      `;

      const anchor =
        main.querySelector('.grid.grid-cols-1.lg\\:grid-cols-12') ??
        main.querySelector('section') ??
        main.firstElementChild;

      if (anchor) {
        main.insertBefore(quickSetup, anchor);
      } else {
        main.appendChild(quickSetup);
      }
    }

    const splitSelect = quickSetup.querySelector('[data-codex-log-split-select]');
    const exerciseSelect = quickSetup.querySelector('[data-codex-log-exercise-select]');
    const splitOptions = splitsRef.current.map((split) => ({
      value: split.id,
      label: split.name,
    }));
    const exerciseOptions = exercisesRef.current.map((exercise) => ({
      value: exercise.id,
      label: exercise.name,
    }));
    const selectedSplitId = workoutFormRef.current.splitId || splitOptions[0]?.value || '';
    const selectedExerciseId = exerciseOptions[0]?.value || '';

    setSelectOptions(splitSelect, splitOptions, selectedSplitId, 'Kein Split verfügbar');
    setSelectOptions(exerciseSelect, exerciseOptions, selectedExerciseId, 'Keine Übung verfügbar');
  }

  function setDesktopSetRowState(row, completed) {
    const firstCell = row.children?.[0];
    const button = row.querySelector('button');
    const icon = button?.querySelector('.material-symbols-outlined');

    if (!button || !firstCell) {
      return;
    }

    if (completed) {
      firstCell.className = 'text-center font-bold text-primary bg-primary/10 rounded py-1';
      button.className =
        'w-6 h-6 rounded-md bg-tertiary-container text-tertiary flex items-center justify-center transition-colors';
      button.dataset.completed = '1';
      if (icon) {
        icon.style.fontVariationSettings = "'FILL' 1";
      }
      return;
    }

    firstCell.className =
      'text-center font-bold text-secondary bg-surface-container-highest rounded py-1';
    button.className =
      'w-6 h-6 rounded-md bg-surface-container border border-outline-variant text-secondary flex items-center justify-center hover:bg-surface-container-high transition-colors';
    button.dataset.completed = '0';
    if (icon) {
      icon.style.fontVariationSettings = "'FILL' 0";
    }
  }

  function setMobileSetRowState(row, completed) {
    const button = row.querySelector('button');
    const icon = button?.querySelector('.material-symbols-outlined');

    if (!button) {
      return;
    }

    if (completed) {
      button.className =
        'w-10 h-10 rounded-lg bg-tertiary flex items-center justify-center text-on-tertiary shadow-lg shadow-tertiary/20';
      button.dataset.completed = '1';
      if (icon) {
        icon.style.fontVariationSettings = "'FILL' 1";
      }
      return;
    }

    button.className =
      'w-10 h-10 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-on-surface-variant transition-colors hover:bg-tertiary-container/20';
    button.dataset.completed = '0';
    if (icon) {
      icon.style.fontVariationSettings = "'FILL' 0";
    }
  }

  function hydrateDesktopSectionFromEntry(section, entry, entryIndex) {
    const titleNode = section.querySelector('h3');
    const subtitleNode = section.querySelector('p');
    const rowList = section.querySelector('.space-y-3');
    const rowTemplate = rowList?.querySelector('.grid.grid-cols-6');
    const addSetButton = [...section.querySelectorAll('button')].find((button) =>
      normalizeText(button.textContent).includes('add set'),
    );
    const latestEntry = getLatestLoggedEntryForExercise(entry.exerciseId);
    const fallbackLatest = latestEntry?.sets?.[latestEntry.sets.length - 1] ?? null;
    const sets = entry.sets.length ? entry.sets : [createSet()];

    section.classList.remove('opacity-80');
    section.dataset.codexExerciseId = entry.exerciseId;
    section.dataset.codexEntryIndex = String(entryIndex);

    if (titleNode) {
      titleNode.textContent = getExerciseDisplayName(entry.exerciseId);
    }
    if (subtitleNode) {
      subtitleNode.textContent = getExerciseDescriptor(entry.exerciseId);
    }
    if (addSetButton) {
      addSetButton.setAttribute('data-codex-action', 'log-add-set');
    }

    if (!rowList || !rowTemplate) {
      return;
    }

    rowList.innerHTML = '';

    sets.forEach((set, setIndex) => {
      const row = rowTemplate.cloneNode(true);
      const cells = row.children;
      const previousSet = latestEntry?.sets?.[setIndex] ?? fallbackLatest;
      const previousCell = cells?.[1];
      const inputs = [...row.querySelectorAll('input')];
      const statusButton = row.querySelector('button');

      if (cells?.[0]) {
        cells[0].textContent = String(setIndex + 1);
      }
      if (previousCell) {
        previousCell.textContent = previousSet
          ? `${previousSet.weight || '-'} kg x ${previousSet.reps || '-'}`
          : '-';
      }
      if (inputs[0]) {
        inputs[0].value = String(set.weight ?? '');
      }
      if (inputs[1]) {
        inputs[1].value = String(set.reps ?? '');
      }
      if (inputs[2]) {
        inputs[2].value = '';
      }
      if (statusButton) {
        statusButton.setAttribute('data-codex-action', 'log-toggle-set');
      }
      row.dataset.codexSetIndex = String(setIndex);

      setDesktopSetRowState(row, Boolean(set.completed));
      rowList.appendChild(row);
    });
  }

  function hydrateMobileSectionFromEntry(section, entry, entryIndex) {
    const titleNode = section.querySelector('h2');
    const subtitleNode = section.querySelector('p');
    const rowList = section.querySelector('.space-y-4');
    const rowTemplate = rowList?.querySelector('.grid.grid-cols-12');
    const addSetButton = [...section.querySelectorAll('button')].find((button) =>
      normalizeText(button.textContent).includes('add set'),
    );
    const latestEntry = getLatestLoggedEntryForExercise(entry.exerciseId);
    const fallbackLatest = latestEntry?.sets?.[latestEntry.sets.length - 1] ?? null;
    const sets = entry.sets.length ? entry.sets : [createSet()];

    section.classList.remove('opacity-60');
    section.dataset.codexExerciseId = entry.exerciseId;
    section.dataset.codexEntryIndex = String(entryIndex);

    if (titleNode) {
      titleNode.textContent = getExerciseDisplayName(entry.exerciseId);
    }
    if (subtitleNode) {
      subtitleNode.textContent = getExerciseDescriptor(entry.exerciseId);
    }
    if (addSetButton) {
      addSetButton.setAttribute('data-codex-action', 'log-add-set');
    }

    if (!rowList || !rowTemplate) {
      return;
    }

    rowList.innerHTML = '';

    sets.forEach((set, setIndex) => {
      const row = rowTemplate.cloneNode(true);
      const setCell = row.querySelector('.col-span-2.text-center.font-bold');
      const inputs = [...row.querySelectorAll('input')];
      const statusButton = row.querySelector('button');

      if (setCell) {
        setCell.textContent = String(setIndex + 1);
      }
      const previousSet = latestEntry?.sets?.[setIndex] ?? fallbackLatest;
      if (inputs[0]) {
        inputs[0].value = String(set.weight ?? '');
        inputs[0].placeholder = previousSet ? String(previousSet.weight || '') : 'kg';
        inputs[0].inputMode = 'decimal';
      }
      if (inputs[1]) {
        inputs[1].value = String(set.reps ?? '');
        inputs[1].placeholder = previousSet ? String(previousSet.reps || '') : 'reps';
        inputs[1].inputMode = 'numeric';
      }
      if (statusButton) {
        statusButton.setAttribute('data-codex-action', 'log-toggle-set');
      }
      row.dataset.codexSetIndex = String(setIndex);

      setMobileSetRowState(row, Boolean(set.completed));
      rowList.appendChild(row);
    });
  }

  function renderLogWorkoutVisual(doc, formOverride = null) {
    if (!doc || activeView !== 'log') {
      return false;
    }

    const context = findLogExerciseContext(doc);
    if (!context || !context.exerciseSections.length) {
      return false;
    }

    const sourceForm = formOverride ?? workoutFormRef.current;
    const entries = sourceForm.entries.some((entry) => entry.exerciseId)
      ? sourceForm.entries
      : [createWorkoutEntry(exercisesRef.current[0]?.id ?? '', 1)];
    const docWindow = doc.defaultView;
    const previousScrollY = typeof docWindow?.scrollY === 'number' ? docWindow.scrollY : null;
    const templateSection = context.exerciseSections[0];
    const fragment = doc.createDocumentFragment();

    context.exerciseSections.forEach((section) => section.remove());

    entries.forEach((entry, entryIndex) => {
      const section = templateSection.cloneNode(true);
      if (section.querySelector('.grid.grid-cols-6')) {
        hydrateDesktopSectionFromEntry(section, entry, entryIndex);
      } else {
        hydrateMobileSectionFromEntry(section, entry, entryIndex);
      }
      fragment.appendChild(section);
    });

    context.container.insertBefore(fragment, context.beforeNode);

    const heading = doc.querySelector('h1');
    const splitName =
      splitsRef.current.find((split) => split.id === sourceForm.splitId)?.name ?? 'Custom Workout';
    if (heading && splitName) {
      heading.textContent = splitName;
    }

    const canRestoreScroll =
      docWindow &&
      typeof previousScrollY === 'number' &&
      typeof docWindow.scrollTo === 'function' &&
      !docWindow.navigator?.userAgent?.toLowerCase().includes('jsdom');

    if (canRestoreScroll) {
      docWindow.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });
    }

    return true;
  }

  function wireLogActions(doc) {
    if (!doc || activeView !== 'log') {
      return;
    }

    injectLogQuickSetup(doc);
    injectLogMobileActionDock(doc);
    const context = findLogExerciseContext(doc);
    context?.exerciseSections?.forEach((section, entryIndex) => {
      section.dataset.codexEntryIndex = String(entryIndex);
      const rows = [...section.querySelectorAll('.grid.grid-cols-6, .grid.grid-cols-12')].filter(
        (row) => row.querySelector('input') && row.querySelector('button'),
      );
      rows.forEach((row, setIndex) => {
        row.dataset.codexSetIndex = String(setIndex);
      });
    });

    const buttons = [...doc.querySelectorAll('button')];

    buttons.forEach((button) => {
      const text = normalizeText(button.textContent);
      if (text.includes('add set')) {
        button.setAttribute('data-codex-action', 'log-add-set');
      }
      if (
        (text.includes('check') || text.includes('check_circle')) &&
        button.closest('.grid.grid-cols-6, .grid.grid-cols-12')
      ) {
        button.setAttribute('data-codex-action', 'log-toggle-set');
      }
      if (text.includes('add exercise')) {
        button.setAttribute('data-codex-action', 'log-add-exercise');
      }
      if (text.includes('rest timer')) {
        button.setAttribute('data-codex-action', 'log-rest-timer');
      }
      if (text.includes('discard') || text === 'cancel') {
        button.setAttribute('data-codex-action', 'log-discard');
      }
      if (text.includes('finish workout') || text === 'finish') {
        button.setAttribute('data-codex-action', 'log-finish-workout');
      }
      if (text.includes('#pr-attempt')) {
        button.setAttribute('data-codex-action', 'log-tag-pr-attempt');
      }
      if (text.includes('#deload')) {
        button.setAttribute('data-codex-action', 'log-tag-deload');
      }
      if (text.includes('#recovery')) {
        button.setAttribute('data-codex-action', 'log-tag-recovery');
      }
      if (text === 'info') {
        button.setAttribute('data-codex-action', 'log-open-exercise-info');
      }
      if (text === 'more_vert') {
        button.setAttribute('data-codex-action', 'log-open-exercise-menu');
      }
    });
  }

  function startPrimaryWorkoutFlow() {
    const defaultSplitId = splitsRef.current[0]?.id ?? '';
    startWorkoutFromSplit(defaultSplitId);
    setActiveView('log');
    showActionNotice('Workout gestartet');
  }

  function getPresetSplitId(text) {
    const normalized = normalizeText(text);
    const savedSplits = splitsRef.current;

    if (!savedSplits.length) {
      return '';
    }

    if (normalized.includes('push')) {
      return (
        savedSplits.find((split) => normalizeText(split.name).includes('push'))?.id ??
        savedSplits[0].id
      );
    }

    if (normalized.includes('leg')) {
      return (
        savedSplits.find((split) => normalizeText(split.name).includes('leg'))?.id ??
        savedSplits[0].id
      );
    }

    if (normalized.includes('upper')) {
      return (
        savedSplits.find((split) => normalizeText(split.name).includes('upper'))?.id ??
        savedSplits[0].id
      );
    }

    return savedSplits[0].id;
  }

  function addSetToWorkout(target) {
    const currentForm = workoutFormRef.current;
    const baseEntries =
      currentForm.entries.length > 0
        ? currentForm.entries
        : [createWorkoutEntry(exercisesRef.current[0]?.id ?? '', 1)];
    const entryIndex = resolveEntryIndexFromTarget(target, baseEntries.length);
    const nextEntries = baseEntries.map((entry, index) => {
      if (index !== entryIndex) {
        return entry;
      }

      return {
        ...entry,
        sets: [...entry.sets, createSet()],
      };
    });
    const nextForm = {
      ...currentForm,
      entries: nextEntries,
    };

    workoutFormRef.current = nextForm;
    setWorkoutForm(nextForm);
    return nextForm;
  }

  function addExerciseToWorkout(exerciseId = '') {
    const currentForm = workoutFormRef.current;
    const entries = [...currentForm.entries];
    const usedExerciseIds = new Set(entries.map((entry) => entry.exerciseId).filter(Boolean));
    const availableExercises = exercisesRef.current;
    const nextExerciseId =
      (exerciseId && !usedExerciseIds.has(exerciseId) ? exerciseId : '') ||
      availableExercises.find((exercise) => !usedExerciseIds.has(exercise.id))?.id ||
      availableExercises[0]?.id ||
      '';

    if (!nextExerciseId) {
      return null;
    }

    entries.push(createWorkoutEntry(nextExerciseId, 1));

    const nextForm = {
      ...currentForm,
      entries,
    };

    workoutFormRef.current = nextForm;
    setWorkoutForm(nextForm);
    return nextForm;
  }

  function addSpecificExerciseToWorkout(exerciseId) {
    if (!exerciseId) {
      return { status: 'missing' };
    }

    const alreadyIncluded = workoutFormRef.current.entries.some(
      (entry) => entry.exerciseId === exerciseId,
    );

    if (alreadyIncluded) {
      return { status: 'exists' };
    }

    const nextForm = addExerciseToWorkout(exerciseId);
    if (!nextForm) {
      return { status: 'missing' };
    }

    const hydratedForm = {
      ...nextForm,
      entries: applyLatestValuesToWorkoutEntries(nextForm.entries),
    };
    workoutFormRef.current = hydratedForm;
    setWorkoutForm(hydratedForm);
    return { status: 'added', form: hydratedForm };
  }

  function toggleSetCompletion(target) {
    const currentForm = workoutFormRef.current;
    if (currentForm.entries.length === 0) {
      return currentForm;
    }

    const entryIndex = resolveEntryIndexFromTarget(target, currentForm.entries.length);
    const selectedEntry = currentForm.entries[entryIndex];
    if (!selectedEntry || selectedEntry.sets.length === 0) {
      return currentForm;
    }

    const nextOpenSetIndex = selectedEntry.sets.findIndex((set) => !set.completed);
    const fallbackIndex =
      nextOpenSetIndex === -1 ? selectedEntry.sets.length - 1 : nextOpenSetIndex;
    const setIndex = resolveSetIndexFromTarget(target, selectedEntry.sets.length, fallbackIndex);
    const nextForm = {
      ...currentForm,
      entries: currentForm.entries.map((entry, currentEntryIndex) => {
        if (currentEntryIndex !== entryIndex) {
          return entry;
        }

        return {
          ...entry,
          sets: entry.sets.map((set, currentSetIndex) =>
            currentSetIndex === setIndex
              ? {
                  ...set,
                  completed: !set.completed,
                }
              : set,
          ),
        };
      }),
    };

    workoutFormRef.current = nextForm;
    setWorkoutForm(nextForm);
    return nextForm;
  }

  function captureWorkoutInputsFromFrame(doc) {
    if (!doc || activeView !== 'log') {
      return null;
    }

    const context = findLogExerciseContext(doc);
    if (!context) {
      return null;
    }

    const sectionNodes = [...context.container.querySelectorAll('section')].filter((section) => {
      if (!section.querySelector('.grid.grid-cols-6 input, .grid.grid-cols-12 input')) {
        return false;
      }

      if (typeof section.compareDocumentPosition !== 'function') {
        return true;
      }

      return Boolean(section.compareDocumentPosition(context.beforeNode) & 4);
    });

    if (!sectionNodes.length) {
      return null;
    }

    const previousEntries = workoutFormRef.current.entries;
    const nextEntries = sectionNodes.map((section, sectionIndex) => {
      const previousEntry = previousEntries[sectionIndex];
      const fallbackExerciseId = exercisesRef.current[sectionIndex]?.id ?? '';
      const exerciseId =
        section.dataset.codexExerciseId || previousEntry?.exerciseId || fallbackExerciseId;
      const desktopRows = [...section.querySelectorAll('.grid.grid-cols-6')].filter((row) =>
        row.querySelector('input'),
      );
      const mobileRows = [...section.querySelectorAll('.grid.grid-cols-12')].filter((row) =>
        row.querySelector('input'),
      );
      const rows = desktopRows.length ? desktopRows : mobileRows;
      const parsedSets = rows.map((row, rowIndex) => {
        const inputs = [...row.querySelectorAll('input')];
        const button = row.querySelector('button');
        const completed =
          button?.dataset.completed === '1' ||
          button?.className?.includes('bg-tertiary') ||
          button?.className?.includes('bg-tertiary-container');
        const previousSet = previousEntry?.sets?.[rowIndex];

        return {
          id: previousSet?.id ?? createSet().id,
          weight: String(inputs[0]?.value ?? ''),
          reps: String(inputs[1]?.value ?? ''),
          completed: Boolean(completed),
        };
      });

      return {
        id: previousEntry?.id ?? createWorkoutEntry(exerciseId, 1).id,
        exerciseId,
        sets: parsedSets.length ? parsedSets : [createSet()],
      };
    });

    const nextForm = {
      ...workoutFormRef.current,
      entries: nextEntries,
    };

    workoutFormRef.current = nextForm;
    setWorkoutForm(nextForm);
    return nextForm;
  }

  function pruneCompletelyEmptyWorkoutEntries() {
    const currentForm = workoutFormRef.current;
    const filteredEntries = currentForm.entries.filter((entry) =>
      entry.sets.some((set) => {
        const weightValue = String(set.weight ?? '').trim();
        const repsValue = String(set.reps ?? '').trim();
        return Boolean(weightValue || repsValue);
      }),
    );

    if (filteredEntries.length === currentForm.entries.length) {
      return { removedCount: 0, nextForm: currentForm };
    }

    const nextEntries = filteredEntries.length
      ? filteredEntries
      : [createWorkoutEntry(exercisesRef.current[0]?.id ?? '', 1)];
    const nextForm = {
      ...currentForm,
      entries: nextEntries,
    };

    workoutFormRef.current = nextForm;
    setWorkoutForm(nextForm);
    return {
      removedCount: currentForm.entries.length - filteredEntries.length,
      nextForm,
    };
  }

  function saveBodyweightFromFrame(doc) {
    const { dateInput, weightInput } = findBodyweightInputs(doc);
    const date = dateInput?.value || getTodayInputValue();
    const weight = weightInput?.value ?? '';
    const saved = saveBodyweightEntry(date, weight);

    if (saved) {
      showActionNotice('Bodyweight gespeichert');
      return;
    }

    showActionNotice('Bodyweight konnte nicht gespeichert werden');
  }

  function clearAllDataWithConfirmation() {
    if (typeof window === 'undefined') {
      return;
    }

    const shouldDelete = window.confirm(
      'Willst du wirklich alle lokalen Workout-Daten unwiderruflich löschen?',
    );

    if (!shouldDelete) {
      showActionNotice('Löschen abgebrochen');
      return;
    }

    window.localStorage.removeItem('workout-tracker-data-v1');
    window.localStorage.removeItem('workout-tracker-last-template-id');
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    window.localStorage.removeItem(VISUAL_PREFS_STORAGE_KEY);
    showActionNotice('Alle lokalen Daten gelöscht');
    window.setTimeout(() => {
      window.location.reload();
    }, 420);
  }

  function appendWorkoutTag(tag) {
    if (!tag) {
      return;
    }

    setWorkoutForm((current) => {
      const noteLines = current.notes
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (!noteLines.includes(tag)) {
        noteLines.push(tag);
      }

      return {
        ...current,
        notes: noteLines.join('\n'),
      };
    });
  }

  function formatHistoryDateLabel(dateValue) {
    if (!dateValue) {
      return '--';
    }

    const parsed = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return String(dateValue);
    }

    return parsed.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function formatHistoryTimeLabel(createdAtValue) {
    if (!createdAtValue) {
      return '--:--';
    }

    const parsed = new Date(createdAtValue);
    if (Number.isNaN(parsed.getTime())) {
      return '--:--';
    }

    return parsed.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getWorkoutBestExercise(workout) {
    const entries = Array.isArray(workout?.entries) ? workout.entries : [];
    let best = null;

    entries.forEach((entry) => {
      const exerciseName =
        exercisesRef.current.find((exercise) => exercise.id === entry.exerciseId)?.name ??
        'Exercise';

      (entry.sets ?? []).forEach((set) => {
        const weight = Number(set?.weight);
        const reps = Number(set?.reps);
        if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
          return;
        }

        if (!best) {
          best = { exerciseName, weight, reps };
          return;
        }

        if (weight > best.weight || (weight === best.weight && reps > best.reps)) {
          best = { exerciseName, weight, reps };
        }
      });
    });

    return best;
  }

  function getWorkoutPrCount(workout) {
    if (!workout?.id) {
      return 0;
    }

    const all = [...(workoutsRef.current ?? [])];
    const currentIndex = all.findIndex((item) => item.id === workout.id);
    if (currentIndex < 0) {
      return 0;
    }

    const currentKey = `${workout.date ?? ''}|${workout.createdAt ?? ''}`;
    const olderWorkouts = all.filter((item) => {
      if (!item?.id || item.id === workout.id) {
        return false;
      }
      const itemKey = `${item.date ?? ''}|${item.createdAt ?? ''}`;
      return itemKey < currentKey;
    });

    let prCount = 0;

    (workout.entries ?? []).forEach((entry) => {
      const currentBest = (entry.sets ?? []).reduce((max, set) => {
        const weight = Number(set?.weight);
        return Number.isFinite(weight) ? Math.max(max, weight) : max;
      }, 0);

      if (currentBest <= 0) {
        return;
      }

      const olderBest = olderWorkouts.reduce((max, olderWorkout) => {
        const olderEntry = (olderWorkout.entries ?? []).find(
          (candidate) => candidate.exerciseId === entry.exerciseId,
        );
        if (!olderEntry) {
          return max;
        }

        const olderEntryBest = (olderEntry.sets ?? []).reduce((entryMax, set) => {
          const weight = Number(set?.weight);
          return Number.isFinite(weight) ? Math.max(entryMax, weight) : entryMax;
        }, 0);

        return Math.max(max, olderEntryBest);
      }, 0);

      if (olderBest > 0 && currentBest > olderBest) {
        prCount += 1;
      }
    });

    return prCount;
  }

  function getWorkoutDurationLabel(workout) {
    const setsCount = (workout.entries ?? []).reduce(
      (total, entry) => total + (entry.sets?.length ?? 0),
      0,
    );
    const minutes = Math.max(12, Math.round(setsCount * 3.8));
    const seconds = (setsCount * 17) % 60;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  function getWorkoutSummaryMetrics(workout) {
    const entries = Array.isArray(workout?.entries) ? workout.entries : [];
    const exercises = entries.length;
    const sets = entries.reduce((total, entry) => total + (entry?.sets?.length ?? 0), 0);
    const volume = entries.reduce(
      (total, entry) =>
        total +
        (entry?.sets?.reduce((entryVolume, set) => {
          const weight = Number(set?.weight);
          const reps = Number(set?.reps);
          if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
            return entryVolume;
          }
          return entryVolume + weight * reps;
        }, 0) ?? 0),
      0,
    );

    return {
      exercises,
      sets,
      volume,
    };
  }

  function openHistoryWorkoutDetails(doc, workoutId) {
    if (!doc || !workoutId) {
      return false;
    }

    const workout = (workoutsRef.current ?? []).find((item) => item.id === workoutId);
    if (!workout) {
      return false;
    }

    const metrics = getWorkoutSummaryMetrics(workout);
    const splitName =
      splitsRef.current.find((split) => split.id === workout.splitId)?.name ?? 'Custom Workout';
    const detailRows = (workout.entries ?? [])
      .map((entry, entryIndex) => {
        const exerciseName =
          exercisesRef.current.find((exercise) => exercise.id === entry.exerciseId)?.name ??
          `Exercise ${entryIndex + 1}`;
        const setRows = (entry.sets ?? [])
          .map((set, setIndex) => {
            const weight = String(set?.weight ?? '').trim() || '-';
            const reps = String(set?.reps ?? '').trim() || '-';
            return `
              <li class="text-xs text-secondary flex items-center justify-between gap-2">
                <span>Set ${setIndex + 1}</span>
                <span class="text-on-surface">${escapeHtml(weight)} kg × ${escapeHtml(reps)}</span>
              </li>
            `;
          })
          .join('');

        return `
          <div class="rounded-lg border border-outline-variant bg-surface-container-low p-3 mb-3">
            <h4 class="text-sm font-bold text-on-surface">${escapeHtml(exerciseName)}</h4>
            <ul class="space-y-1 mt-2">
              ${setRows || '<li class="text-xs text-secondary">Keine Sets gespeichert</li>'}
            </ul>
          </div>
        `;
      })
      .join('');

    let modal = doc.querySelector('[data-codex-history-modal]');
    if (!modal) {
      modal = doc.createElement('div');
      modal.setAttribute('data-codex-history-modal', '1');
      modal.className = 'fixed inset-0 z-50 hidden';
      doc.body.appendChild(modal);
    }

    modal.innerHTML = `
      <button
        class="absolute inset-0 bg-black/70 backdrop-blur-sm"
        data-codex-action="history-close-details"
        aria-label="Details schließen"
      ></button>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl border border-primary/40 bg-surface-container p-5">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 class="text-xl font-bold text-on-surface">${escapeHtml(splitName)}</h3>
              <p class="text-xs text-secondary mt-1">${metrics.exercises} Übungen · ${metrics.sets} Sets · ${Math.round(metrics.volume)} kg Volumen</p>
              <p class="text-xs text-secondary mt-1">${escapeHtml(formatHistoryDateLabel(workout.date))}</p>
            </div>
            <button
              class="w-8 h-8 rounded-lg border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container-high"
              data-codex-action="history-close-details"
              aria-label="Schließen"
            >
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <div class="mb-4">
            ${detailRows || '<p class="text-sm text-secondary">Keine Detaildaten vorhanden.</p>'}
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              class="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm font-bold text-on-surface hover:bg-surface-container-highest"
              data-codex-action="history-duplicate-template"
              data-codex-workout-id="${escapeHtml(workout.id)}"
            >
              Duplicate to Template
            </button>
            <button
              class="px-4 py-2 rounded-lg border border-outline-variant text-sm font-bold text-on-surface hover:border-primary/50"
              data-codex-action="history-open-editor"
              data-codex-workout-id="${escapeHtml(workout.id)}"
            >
              Im Editor öffnen
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    return true;
  }

  function closeHistoryWorkoutDetails(doc) {
    if (!doc) {
      return false;
    }

    const modal = doc.querySelector('[data-codex-history-modal]');
    if (!modal) {
      return false;
    }

    modal.classList.add('hidden');
    modal.innerHTML = '';
    return true;
  }

  function injectHistoryLiveSessions(doc) {
    if (!doc || activeView !== 'history') {
      return;
    }

    const sorted = sortWorkouts(workoutsRef.current ?? []);
    const latestSessions = sorted.slice(0, 8);

    const desktopLists = [...doc.querySelectorAll('main .space-y-6')];
    const desktopList = desktopLists[0] ?? null;
    desktopLists.slice(1).forEach((extraList) => {
      if (!isElementNode(extraList)) {
        return;
      }

      extraList.innerHTML = '';
      extraList.style.display = 'none';
    });

    if (desktopList) {
      let container = desktopList.querySelector('[data-codex-history-live="desktop"]');
      if (!container) {
        container = doc.createElement('div');
        container.setAttribute('data-codex-history-live', 'desktop');
        container.className = 'mb-6';
        desktopList.prepend(container);
      }

      [...desktopList.children].forEach((child) => {
        if (
          child instanceof HTMLElement &&
          child !== container &&
          child.getAttribute('data-codex-history-live') !== 'desktop'
        ) {
          child.remove();
        }
      });

      if (!latestSessions.length) {
        container.innerHTML = `
          <h2 class="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-4 pl-1">Latest Saved Workouts</h2>
          <div class="p-5 rounded-xl border border-outline-variant bg-surface-container text-secondary text-sm">
            Noch keine gespeicherten Workouts.
          </div>
        `;
      } else {
        const cards = latestSessions
          .map((workout) => {
            const metrics = getWorkoutSummaryMetrics(workout);
            const bestExercise = getWorkoutBestExercise(workout);
            const prCount = getWorkoutPrCount(workout);
            const timeLabel = formatHistoryTimeLabel(workout.createdAt);
            const durationLabel = getWorkoutDurationLabel(workout);
            const splitName =
              splitsRef.current.find((split) => split.id === workout.splitId)?.name ??
              'Custom Workout';
            return `
              <div class="p-5 rounded-xl border border-primary/50 bg-surface-container mb-4 transition-all group">
                <div class="flex flex-col md:flex-row gap-4">
                  <div
                    class="flex-1 cursor-pointer"
                    data-codex-action="history-open-workout"
                    data-codex-workout-id="${escapeHtml(workout.id)}"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
                          <span class="material-symbols-outlined">fitness_center</span>
                        </div>
                        <div>
                          <h4 class="font-bold text-primary text-2xl md:text-3xl tracking-tight leading-none">${escapeHtml(splitName)}</h4>
                          <div class="flex items-center gap-2 text-sm text-secondary mt-2">
                            <span>${escapeHtml(formatHistoryDateLabel(workout.date))}, ${escapeHtml(timeLabel)}</span>
                            <span class="w-1 h-1 rounded-full bg-outline"></span>
                            <span>${escapeHtml(durationLabel)}</span>
                          </div>
                        </div>
                      </div>
                      ${
                        prCount > 0
                          ? `<div class="flex items-center gap-1.5 px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-xs font-bold uppercase tracking-wider">
                               <span class="material-symbols-outlined text-sm">star</span>
                               ${prCount} PR${prCount === 1 ? '' : 's'}
                             </div>`
                          : ''
                      }
                    </div>

                    <div class="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-sm">
                      <div class="flex flex-col">
                        <span class="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Best Exercise</span>
                        <span class="text-on-surface font-medium">
                          ${escapeHtml(bestExercise?.exerciseName ?? '-')}
                          ${
                            bestExercise
                              ? `<span class="text-tertiary font-bold ml-1">${escapeHtml(bestExercise.weight)}kg × ${escapeHtml(bestExercise.reps)}</span>`
                              : ''
                          }
                        </span>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Volume</span>
                        <span class="text-on-surface font-medium">${Math.round(metrics.volume).toLocaleString('de-DE')} kg</span>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Intensity</span>
                        <span class="text-on-surface font-medium">${metrics.sets} Sets über ${metrics.exercises} Übungen</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex md:flex-col justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-outline-variant md:pl-6">
                    <button
                      class="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-surface-container-high rounded-lg text-xs font-bold text-on-surface hover:bg-secondary-container transition-colors"
                      data-codex-action="history-duplicate-template"
                      data-codex-workout-id="${escapeHtml(workout.id)}"
                    >
                      <span class="material-symbols-outlined text-sm">content_copy</span>
                      Duplicate to Template
                    </button>
                    <button
                      class="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:border-primary/50 transition-colors"
                      data-codex-action="history-open-workout"
                      data-codex-workout-id="${escapeHtml(workout.id)}"
                    >
                      <span class="material-symbols-outlined text-sm">visibility</span>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

        container.innerHTML = `
          <h2 class="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-4 pl-1">Latest Saved Workouts</h2>
          <div>${cards}</div>
        `;
      }
    }

    const mobileSection = [...doc.querySelectorAll('section.space-y-3')].find((section) =>
      normalizeText(section.textContent).includes('recent sessions'),
    );
    if (!mobileSection) {
      return;
    }

    let mobileContainer = mobileSection.querySelector('[data-codex-history-live="mobile"]');
    if (!mobileContainer) {
      mobileContainer = doc.createElement('div');
      mobileContainer.setAttribute('data-codex-history-live', 'mobile');
      mobileSection.appendChild(mobileContainer);
    }

    [...mobileSection.children].forEach((child) => {
      if (
        child instanceof HTMLElement &&
        child !== mobileContainer &&
        child.tagName !== 'H3' &&
        child.getAttribute('data-codex-history-live') !== 'mobile'
      ) {
        child.remove();
      }
    });

    if (!latestSessions.length) {
      mobileContainer.innerHTML = `
        <div class="bg-surface-container-high rounded-xl p-4 border border-outline-variant/30 text-secondary text-sm">
          Noch keine gespeicherten Workouts.
        </div>
      `;
      return;
    }

    const mobileRows = latestSessions
      .slice(0, 4)
      .map((workout) => {
        const metrics = getWorkoutSummaryMetrics(workout);
        const bestExercise = getWorkoutBestExercise(workout);
        const prCount = getWorkoutPrCount(workout);
        const splitName =
          splitsRef.current.find((split) => split.id === workout.splitId)?.name ?? 'Custom Workout';

        return `
          <div class="bg-surface-container-high rounded-xl p-4 border border-primary/40 mb-3">
            <button
              class="w-full text-left"
              data-codex-action="history-open-workout"
              data-codex-workout-id="${escapeHtml(workout.id)}"
            >
              <div class="flex justify-between items-start gap-3">
                <h4 class="text-primary font-bold text-sm">${escapeHtml(splitName)}</h4>
                <span class="text-on-surface-variant text-[11px]">${escapeHtml(formatHistoryDateLabel(workout.date))}</span>
              </div>
              <p class="text-secondary text-xs mt-2">
                ${metrics.exercises} Übungen · ${metrics.sets} Sets · ${Math.round(metrics.volume)} kg
              </p>
              ${
                bestExercise
                  ? `<p class="text-xs text-on-surface mt-2">Best: ${escapeHtml(bestExercise.exerciseName)} <span class="text-tertiary font-bold">${escapeHtml(bestExercise.weight)}kg × ${escapeHtml(bestExercise.reps)}</span></p>`
                  : ''
              }
              ${
                prCount > 0
                  ? `<p class="text-xs text-on-tertiary-container mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-tertiary-container">${prCount} PR${prCount === 1 ? '' : 's'}</p>`
                  : ''
              }
            </button>
            <div class="grid grid-cols-2 gap-2 mt-3">
              <button
                class="flex items-center justify-center gap-1 px-3 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface"
                data-codex-action="history-duplicate-template"
                data-codex-workout-id="${escapeHtml(workout.id)}"
              >
                <span class="material-symbols-outlined text-sm">content_copy</span>
                Duplicate
              </button>
              <button
                class="flex items-center justify-center gap-1 px-3 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface"
                data-codex-action="history-open-workout"
                data-codex-workout-id="${escapeHtml(workout.id)}"
              >
                <span class="material-symbols-outlined text-sm">visibility</span>
                Details
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    mobileContainer.innerHTML = mobileRows;
  }

  function getExerciseLibraryCards(doc) {
    if (!doc) {
      return [];
    }

    const seenCards = new Set();
    const headings = [...doc.querySelectorAll('main h3, main h4')].filter((heading) => {
      const text = normalizeText(heading.textContent);
      return text && !['exercise library'].includes(text);
    });

    return headings
      .map((heading) => heading.closest('.rounded-xl, .rounded-lg'))
      .filter((card) => {
        if (!isElementNode(card) || seenCards.has(card)) {
          return false;
        }

        seenCards.add(card);
        return true;
      });
  }

  function getExerciseNameFromTarget(target) {
    if (!isElementNode(target)) {
      return '';
    }

    const explicitName =
      target.getAttribute('data-codex-exercise-name') ??
      target.closest?.('[data-codex-exercise-name]')?.getAttribute('data-codex-exercise-name');

    if (explicitName) {
      return explicitName;
    }

    const card = target.closest('[data-codex-exercise-card]');
    const heading = card?.querySelector('h3, h4');
    return heading?.textContent?.trim() ?? '';
  }

  function getExerciseCategoryText(card) {
    if (!card) {
      return '';
    }

    return normalizeText(card.textContent);
  }

  function getExerciseSearchInput(doc) {
    return [...doc.querySelectorAll('input')].find((input) =>
      normalizeText(input.getAttribute('placeholder')).includes('search exercises'),
    );
  }

  function updateExerciseFilterButtons(doc, activeFilter) {
    const buttons = [...doc.querySelectorAll('[data-codex-action^="exercise-filter-"]')];

    buttons.forEach((button) => {
      const filter = button.getAttribute('data-codex-action')?.replace('exercise-filter-', '');
      const isActive = filter === activeFilter;

      button.style.background = isActive ? getFixedAccentColor(visualPrefsRef.current.accent) : '';
      button.style.color = isActive ? '#0a0012' : '';
      button.style.borderColor = isActive ? getFixedAccentColor(visualPrefsRef.current.accent) : '';
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function applyExerciseLibraryFilter(doc, requestedFilter = null) {
    if (!doc) {
      return { visibleCount: 0, totalCount: 0 };
    }

    const filter =
      requestedFilter ?? doc.documentElement.dataset.codexExerciseFilter ?? 'all exercises';
    doc.documentElement.dataset.codexExerciseFilter = filter;

    const searchInput = getExerciseSearchInput(doc);
    const query = normalizeText(searchInput?.value ?? '');
    const cards = getExerciseLibraryCards(doc);
    let visibleCount = 0;

    cards.forEach((card) => {
      const text = getExerciseCategoryText(card);
      const matchesFilter = filter === 'all exercises' || text.includes(filter);
      const matchesQuery = !query || text.includes(query);
      const isVisible = matchesFilter && matchesQuery;

      card.style.display = isVisible ? '' : 'none';
      if (isVisible) {
        visibleCount += 1;
      }
    });

    let emptyState = doc.querySelector('[data-codex-exercise-empty]');
    const grid = cards[0]?.parentElement;

    if (!emptyState && grid) {
      emptyState = doc.createElement('div');
      emptyState.setAttribute('data-codex-exercise-empty', '1');
      emptyState.className =
        'lg:col-span-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm text-secondary';
      grid.appendChild(emptyState);
    }

    if (emptyState) {
      emptyState.textContent = query
        ? `Keine Exercises fuer "${query}" gefunden.`
        : `Keine Exercises fuer ${filter} gefunden.`;
      emptyState.style.display = visibleCount ? 'none' : '';
    }

    updateExerciseFilterButtons(doc, filter);

    return { visibleCount, totalCount: cards.length };
  }

  function ensureExerciseModal(doc) {
    if (!doc) {
      return null;
    }

    let modal = doc.querySelector('[data-codex-exercise-modal]');
    if (modal) {
      return modal;
    }

    modal = doc.createElement('div');
    modal.setAttribute('data-codex-exercise-modal', '1');
    modal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/70 p-4';
    doc.body.appendChild(modal);
    return modal;
  }

  function placeExerciseModalInViewport(doc, modal) {
    const frameWindow = doc?.defaultView;
    if (!modal || !frameWindow) {
      return;
    }

    modal.style.position = 'absolute';
    modal.style.top = `${frameWindow.scrollY}px`;
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.minHeight = `${frameWindow.innerHeight}px`;
  }

  function closeExerciseModal(doc) {
    const modal = doc?.querySelector?.('[data-codex-exercise-modal]');
    if (!modal) {
      return false;
    }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.innerHTML = '';
    return true;
  }

  function findExerciseCardByName(doc, exerciseName) {
    const targetName = normalizeText(exerciseName);
    return getExerciseLibraryCards(doc).find((card) => {
      const heading = card.querySelector('h3, h4');
      return normalizeText(heading?.textContent) === targetName;
    });
  }

  function openExerciseDetailsModal(doc, exerciseName) {
    const modal = ensureExerciseModal(doc);
    if (!modal) {
      return false;
    }

    placeExerciseModalInViewport(doc, modal);
    const card = findExerciseCardByName(doc, exerciseName);
    const heading =
      card?.querySelector('h3, h4')?.textContent?.trim() || exerciseName || 'Exercise';
    const description =
      card
        ?.querySelector('p.text-secondary-fixed, p.text-on-surface-variant, p.text-secondary')
        ?.textContent?.trim() || 'Exercise details and quick actions.';
    const meta = [...(card?.querySelectorAll('span') ?? [])]
      .map((span) => span.textContent?.trim())
      .filter(Boolean)
      .slice(0, 5);

    modal.innerHTML = `
      <div class="w-full max-w-xl rounded-2xl border border-primary/40 bg-surface-container p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <p class="text-xs uppercase tracking-widest text-primary font-bold">Exercise details</p>
            <h3 class="text-2xl font-black text-on-surface mt-1">${escapeHtml(heading)}</h3>
          </div>
          <button
            class="w-9 h-9 rounded-lg border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container-high"
            data-codex-action="exercise-close-modal"
            aria-label="Schliessen"
          >
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p class="text-sm text-secondary leading-relaxed mb-4">${escapeHtml(description)}</p>
        <div class="flex flex-wrap gap-2 mb-5">
          ${meta
            .map(
              (item) =>
                `<span class="px-2 py-1 rounded bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase">${escapeHtml(item)}</span>`,
            )
            .join('')}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            class="px-4 py-3 rounded-lg bg-primary text-on-primary text-sm font-bold"
            data-codex-action="exercise-start-workout"
            data-codex-exercise-name="${escapeHtml(heading)}"
          >
            Workout mit dieser Uebung starten
          </button>
          <button
            class="px-4 py-3 rounded-lg border border-outline-variant text-sm font-bold text-on-surface"
            data-codex-action="exercise-close-modal"
          >
            Schliessen
          </button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    return true;
  }

  function openCustomExerciseModal(doc) {
    const modal = ensureExerciseModal(doc);
    if (!modal) {
      return false;
    }

    placeExerciseModalInViewport(doc, modal);
    modal.innerHTML = `
      <form class="w-full max-w-xl rounded-2xl border border-primary/40 bg-surface-container p-5 shadow-2xl" data-codex-exercise-form>
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <p class="text-xs uppercase tracking-widest text-primary font-bold">Add custom</p>
            <h3 class="text-2xl font-black text-on-surface mt-1">Neue Uebung</h3>
          </div>
          <button
            type="button"
            class="w-9 h-9 rounded-lg border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container-high"
            data-codex-action="exercise-close-modal"
            aria-label="Schliessen"
          >
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-secondary">
            Name
            <input class="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" data-codex-custom-exercise-name placeholder="z.B. Cable Fly" />
          </label>
          <label class="text-xs font-bold uppercase tracking-wider text-secondary">
            Zielgewicht
            <input class="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" data-codex-custom-exercise-weight type="number" min="0" step="0.5" placeholder="kg" />
          </label>
          <label class="text-xs font-bold uppercase tracking-wider text-secondary">
            Gewichtsschritt
            <input class="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" data-codex-custom-exercise-step type="number" min="0.5" step="0.5" value="2.5" />
          </label>
          <label class="text-xs font-bold uppercase tracking-wider text-secondary">
            Rep min
            <input class="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" data-codex-custom-exercise-rep-min type="number" min="1" step="1" placeholder="8" />
          </label>
          <label class="text-xs font-bold uppercase tracking-wider text-secondary">
            Rep max
            <input class="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface" data-codex-custom-exercise-rep-max type="number" min="1" step="1" placeholder="12" />
          </label>
        </div>
        <p class="mt-3 hidden rounded-lg border border-error/40 bg-error-container/30 px-3 py-2 text-sm text-error" data-codex-custom-exercise-error></p>
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="submit" class="px-4 py-3 rounded-lg bg-primary text-on-primary text-sm font-bold" data-codex-action="exercise-save-custom">
            Uebung speichern
          </button>
          <button type="button" class="px-4 py-3 rounded-lg border border-outline-variant text-sm font-bold text-on-surface" data-codex-action="exercise-close-modal">
            Abbrechen
          </button>
        </div>
      </form>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.querySelector('[data-codex-custom-exercise-name]')?.focus();
    return true;
  }

  function appendCustomExerciseCard(doc, exercise) {
    const grid = doc?.querySelector('main > div.grid');
    if (!grid || !exercise) {
      return;
    }

    const card = doc.createElement('div');
    card.className =
      'bg-surface-container-low border border-primary/50 rounded-xl p-5 flex flex-col justify-between hover:border-primary/50 transition-all group';
    card.setAttribute('data-codex-added-card', '1');
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-4">
          <div class="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <span class="material-symbols-outlined">fitness_center</span>
          </div>
          <button class="material-symbols-outlined text-outline text-sm" data-codex-action="exercise-open-details" data-codex-exercise-name="${escapeHtml(exercise.name)}">more_horiz</button>
        </div>
        <h3 class="font-black text-on-surface mb-2 tracking-tight uppercase">${escapeHtml(exercise.name)}</h3>
        <div class="flex flex-wrap gap-1.5 mb-4">
          <span class="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-[9px] font-bold uppercase tracking-tighter">Custom</span>
        </div>
      </div>
      <div class="border-t border-outline-variant pt-4">
        <p class="text-outline text-[10px] uppercase font-bold mb-1">Target</p>
        <p class="text-lg font-black text-on-surface">${exercise.targetWeight ? `${exercise.targetWeight}kg` : '--'} ${exercise.targetRepMin || exercise.targetRepMax ? `x ${exercise.targetRepMin ?? '--'}-${exercise.targetRepMax ?? '--'}` : ''}</p>
      </div>
    `;
    grid.prepend(card);
  }

  function saveCustomExerciseFromFrame(doc) {
    const form = doc?.querySelector?.('[data-codex-exercise-form]');
    if (!form) {
      return false;
    }

    const result = saveCustomExercise({
      name: form.querySelector('[data-codex-custom-exercise-name]')?.value,
      targetWeight: form.querySelector('[data-codex-custom-exercise-weight]')?.value,
      targetRepMin: form.querySelector('[data-codex-custom-exercise-rep-min]')?.value,
      targetRepMax: form.querySelector('[data-codex-custom-exercise-rep-max]')?.value,
      weightStep: form.querySelector('[data-codex-custom-exercise-step]')?.value,
    });

    if (!result.ok) {
      const errorNode = form.querySelector('[data-codex-custom-exercise-error]');
      if (errorNode) {
        errorNode.textContent = result.message;
        errorNode.classList.remove('hidden');
      }
      return false;
    }

    appendCustomExerciseCard(doc, result.exercise);
    closeExerciseModal(doc);
    wireExerciseActions(doc);
    applyExerciseLibraryFilter(doc, 'all exercises');
    return true;
  }

  function startWorkoutWithExerciseFromFrame(exerciseName) {
    const normalizedName = normalizeText(exerciseName);
    const exercise =
      exercisesRef.current.find((item) => normalizeText(item.name) === normalizedName) ??
      exercisesRef.current.find((item) => normalizedName.includes(normalizeText(item.name))) ??
      exercisesRef.current[0];

    setWorkoutForm({
      ...workoutFormRef.current,
      entries: [createWorkoutEntry(exercise?.id ?? '', 1)],
      skippedEntries: [],
    });
    setActiveView('log');
    return Boolean(exercise);
  }

  function wireExerciseActions(doc) {
    if (!doc || activeView !== 'exercises') {
      return;
    }

    [...doc.querySelectorAll('main button')].forEach((button) => {
      const text = normalizeText(button.textContent);

      if (EXERCISE_FILTERS.includes(text)) {
        button.setAttribute('data-codex-action', `exercise-filter-${text}`);
      } else if (text.includes('add custom')) {
        button.setAttribute('data-codex-action', 'exercise-add-custom');
      } else if (text === 'details') {
        button.setAttribute('data-codex-action', 'exercise-open-details');
      } else if (text.includes('analyze')) {
        button.setAttribute('data-codex-action', 'exercise-open-analysis');
      }
    });

    getExerciseLibraryCards(doc).forEach((card) => {
      const heading = card.querySelector('h3, h4');
      const exerciseName = heading?.textContent?.trim() ?? '';
      if (!exerciseName) {
        return;
      }

      card.setAttribute('data-codex-exercise-card', '1');
      card.setAttribute('data-codex-exercise-name', exerciseName);
      card.setAttribute('data-codex-action', 'exercise-open-details');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Exercise details: ${exerciseName}`);
      card.style.cursor = 'pointer';

      [...card.querySelectorAll('button, .material-symbols-outlined')].forEach((node) => {
        if (!isElementNode(node) || node.getAttribute('data-codex-action')) {
          return;
        }

        const text = normalizeText(node.textContent);
        if (text === 'star') {
          node.setAttribute('data-codex-action', 'exercise-toggle-favorite');
          node.setAttribute('role', 'button');
          node.setAttribute('tabindex', '0');
        } else if (text === 'more_horiz') {
          node.setAttribute('data-codex-action', 'exercise-open-details');
          node.setAttribute('role', 'button');
          node.setAttribute('tabindex', '0');
        }
      });
    });

    const searchInput = getExerciseSearchInput(doc);
    if (searchInput) {
      searchInput.setAttribute('data-codex-exercise-search', '1');
      if (searchInput.dataset.codexExerciseSearchWired !== '1') {
        searchInput.dataset.codexExerciseSearchWired = '1';
        searchInput.addEventListener('input', () => {
          applyExerciseLibraryFilter(doc);
        });
      }
    }

    const modal = ensureExerciseModal(doc);
    if (modal && modal.dataset.codexExerciseModalWired !== '1') {
      modal.dataset.codexExerciseModalWired = '1';
      modal.addEventListener('submit', (event) => {
        event.preventDefault();
        saveCustomExerciseFromFrame(doc);
      });
    }

    applyExerciseLibraryFilter(doc);
  }

  function startVisualRestTimer(target) {
    const button = target?.closest?.('button');
    if (!button) {
      return false;
    }

    const timerKey =
      button.dataset.codexTimerKey ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    button.dataset.codexTimerKey = timerKey;

    const intervals = restTimerIntervalsRef.current;
    const existingInterval = intervals.get(timerKey);
    if (existingInterval) {
      window.clearInterval(existingInterval);
      intervals.delete(timerKey);
    }

    const accentColor = ACCENT_COLORS[visualPrefsRef.current.accent] ?? ACCENT_COLORS.primary;
    const icon = button.querySelector('.material-symbols-outlined');
    let label = button.querySelector('[data-codex-rest-label]');

    if (!label) {
      label = button.ownerDocument.createElement('span');
      label.setAttribute('data-codex-rest-label', '1');
      label.style.fontWeight = '700';
      [...button.childNodes].forEach((node) => {
        if (node.nodeType === 3) {
          node.remove();
        }
      });
      button.appendChild(label);
    }

    let remaining = 90;

    const render = () => {
      label.textContent = `Rest Timer: ${remaining}s`;
      button.style.boxShadow = `inset 0 0 0 1px ${accentColor}`;
      if (icon) {
        icon.style.color = '#10b981';
      }
    };

    render();

    const intervalId = window.setInterval(() => {
      if (!button.isConnected) {
        window.clearInterval(intervalId);
        intervals.delete(timerKey);
        return;
      }

      remaining -= 1;

      if (remaining <= 0) {
        window.clearInterval(intervalId);
        intervals.delete(timerKey);
        label.textContent = 'Rest Timer: Done';
        button.style.boxShadow = '';
        if (icon) {
          icon.style.color = '';
        }
        window.setTimeout(() => {
          if (!button.isConnected) {
            return;
          }
          label.textContent = 'Rest Timer: 90s';
        }, 1000);
        return;
      }

      render();
    }, 1000);

    intervals.set(timerKey, intervalId);
    return true;
  }

  function handleFrameAction(target, rawText, event) {
    const text = normalizeText(rawText);
    const actionId = getActionIdFromTarget(target);
    const progressWindow = mapTextToProgressWindow(text);
    const progressMetric = mapTextToProgressMetric(text);
    const accentFromTarget = detectAccentFromClassName(target?.className);

    if (!text && !accentFromTarget && !actionId) {
      return false;
    }

    if (actionId === 'global-open-notifications') {
      event.preventDefault();
      showActionNotice('Benachrichtigungen geöffnet');
      return true;
    }

    if (actionId === 'global-open-settings') {
      event.preventDefault();
      setActiveView('settings');
      showActionNotice('Settings geöffnet');
      return true;
    }

    if (actionId === 'global-go-dashboard') {
      event.preventDefault();
      setActiveView('dashboard');
      showActionNotice('Zurück zum Dashboard');
      return true;
    }

    if (actionId === 'dashboard-start-empty-workout') {
      event.preventDefault();
      startPrimaryWorkoutFlow();
      return true;
    }

    if (actionId === 'dashboard-start-preset-workout') {
      event.preventDefault();
      startWorkoutFromSplit(getPresetSplitId(text));
      setActiveView('log');
      showActionNotice('Workout-Plan geladen');
      return true;
    }

    if (actionId === 'dashboard-view-history') {
      event.preventDefault();
      setActiveView('history');
      showActionNotice('History geöffnet');
      return true;
    }

    if (actionId === 'log-load-split') {
      event.preventDefault();
      const doc = target?.ownerDocument;
      const splitId = getSelectedSplitIdFromFrame(doc);
      const nextForm = loadSplitIntoWorkout(splitId, { withLastValues: true });

      if (!nextForm) {
        showActionNotice('Split konnte nicht geladen werden');
        return true;
      }

      renderLogWorkoutVisual(doc, nextForm);
      wireLogActions(doc);
      showActionNotice('Split geladen und mit letzten Werten vorbelegt');
      return true;
    }

    if (actionId === 'log-apply-last-values') {
      event.preventDefault();
      const doc = target?.ownerDocument;
      captureWorkoutInputsFromFrame(doc);
      const nextForm = applyLastValuesToCurrentWorkout();
      renderLogWorkoutVisual(doc, nextForm);
      wireLogActions(doc);
      showActionNotice('Letzte Werte übernommen');
      return true;
    }

    if (actionId === 'history-open-workout') {
      event.preventDefault();
      const doc = target?.ownerDocument;
      const workoutId = getWorkoutIdFromTarget(target);
      const opened = openHistoryWorkoutDetails(doc, workoutId);
      showActionNotice(opened ? 'Workout-Details geöffnet' : 'Workout nicht gefunden');
      return true;
    }

    if (actionId === 'history-close-details') {
      event.preventDefault();
      closeHistoryWorkoutDetails(target?.ownerDocument);
      return true;
    }

    if (actionId === 'history-duplicate-template') {
      event.preventDefault();
      const workoutId = getWorkoutIdFromTarget(target);
      if (workoutId) {
        saveWorkoutAsTemplate(workoutId);
        showActionNotice('Workout als Template gespeichert');
      } else {
        showActionNotice('Kein Workout ausgewählt');
      }
      return true;
    }

    if (actionId === 'history-open-editor') {
      event.preventDefault();
      const workoutId = getWorkoutIdFromTarget(target);
      if (workoutId) {
        startEditingWorkout(workoutId);
        showActionNotice('Workout im Editor geöffnet');
      } else {
        showActionNotice('Kein Workout ausgewählt');
      }
      return true;
    }

    if (actionId.startsWith('exercise-filter-')) {
      event.preventDefault();
      const filter = actionId.replace('exercise-filter-', '');
      const result = applyExerciseLibraryFilter(target?.ownerDocument, filter);
      showActionNotice(
        result.visibleCount
          ? `Filter: ${filter} (${result.visibleCount})`
          : `Keine Treffer fuer ${filter}`,
      );
      return true;
    }

    if (actionId === 'exercise-add-custom') {
      event.preventDefault();
      openCustomExerciseModal(target?.ownerDocument);
      showActionNotice('Neue Uebung anlegen');
      return true;
    }

    if (actionId === 'exercise-save-custom') {
      event.preventDefault();
      const saved = saveCustomExerciseFromFrame(target?.ownerDocument);
      showActionNotice(saved ? 'Uebung gespeichert' : 'Uebung konnte nicht gespeichert werden');
      return true;
    }

    if (actionId === 'exercise-close-modal') {
      event.preventDefault();
      closeExerciseModal(target?.ownerDocument);
      return true;
    }

    if (actionId === 'exercise-open-details') {
      event.preventDefault();
      const exerciseName = getExerciseNameFromTarget(target);
      const opened = openExerciseDetailsModal(target?.ownerDocument, exerciseName);
      showActionNotice(opened ? 'Exercise-Details geoeffnet' : 'Exercise nicht gefunden');
      return true;
    }

    if (actionId === 'exercise-toggle-favorite') {
      event.preventDefault();
      const isActive = target.dataset.codexFavorite === '1';
      target.dataset.codexFavorite = isActive ? '0' : '1';
      target.style.color = isActive ? '' : getFixedAccentColor(visualPrefsRef.current.accent);
      target.style.fontVariationSettings = isActive
        ? "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
        : "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24";
      showActionNotice(isActive ? 'Favorit entfernt' : 'Favorit markiert');
      return true;
    }

    if (actionId === 'exercise-start-workout') {
      event.preventDefault();
      const exerciseName = getExerciseNameFromTarget(target);
      closeExerciseModal(target?.ownerDocument);
      const started = startWorkoutWithExerciseFromFrame(exerciseName);
      showActionNotice(started ? 'Workout gestartet' : 'Workout gestartet');
      return true;
    }

    if (actionId === 'exercise-open-analysis') {
      event.preventDefault();
      setActiveView('progress');
      showActionNotice('Analyse geoeffnet');
      return true;
    }

    if (actionId === 'log-add-specific-exercise') {
      event.preventDefault();
      const doc = target?.ownerDocument;
      const exerciseId = getSelectedExerciseIdFromFrame(doc);
      const result = addSpecificExerciseToWorkout(exerciseId);

      if (result.status === 'exists') {
        showActionNotice('Übung ist bereits im Workout enthalten');
        return true;
      }

      if (result.status !== 'added') {
        showActionNotice('Übung konnte nicht hinzugefügt werden');
        return true;
      }

      renderLogWorkoutVisual(doc, result.form);
      wireLogActions(doc);
      showActionNotice('Übung hinzugefügt');
      return true;
    }

    if (actionId === 'log-tag-pr-attempt') {
      event.preventDefault();
      appendWorkoutTag('#pr-attempt');
      showActionNotice('Tag #pr-attempt hinzugefügt');
      return true;
    }

    if (actionId === 'log-tag-deload') {
      event.preventDefault();
      appendWorkoutTag('#deload');
      showActionNotice('Tag #deload hinzugefügt');
      return true;
    }

    if (actionId === 'log-tag-recovery') {
      event.preventDefault();
      appendWorkoutTag('#recovery');
      showActionNotice('Tag #recovery hinzugefügt');
      return true;
    }

    if (actionId === 'log-open-exercise-info') {
      event.preventDefault();
      showActionNotice('Exercise-Info geöffnet');
      return true;
    }

    if (actionId === 'log-open-exercise-menu') {
      event.preventDefault();
      showActionNotice('Exercise-Menü geöffnet');
      return true;
    }

    if (actionId === 'log-add-set') {
      event.preventDefault();
      const doc = target?.ownerDocument;
      captureWorkoutInputsFromFrame(doc);
      const nextForm = addSetToWorkout(target);
      renderLogWorkoutVisual(doc, nextForm);
      wireLogActions(doc);
      showActionNotice('Set hinzugefügt');
      return true;
    }

    if (actionId === 'log-toggle-set') {
      event.preventDefault();
      const doc = target?.ownerDocument;
      captureWorkoutInputsFromFrame(doc);
      const nextForm = toggleSetCompletion(target);
      renderLogWorkoutVisual(doc, nextForm);
      wireLogActions(doc);
      showActionNotice('Set bestätigt');
      return true;
    }

    if (actionId === 'log-add-exercise') {
      event.preventDefault();
      const doc = target?.ownerDocument;
      captureWorkoutInputsFromFrame(doc);
      const nextForm = addExerciseToWorkout();
      if (nextForm) {
        renderLogWorkoutVisual(doc, nextForm);
        wireLogActions(doc);
      }
      showActionNotice('Exercise hinzugefügt');
      return true;
    }

    if (actionId === 'log-rest-timer') {
      event.preventDefault();
      startVisualRestTimer(target);
      showActionNotice('Rest-Timer gestartet');
      return true;
    }

    if (actionId === 'log-discard') {
      event.preventDefault();
      resetWorkoutForm();
      setActiveView('dashboard');
      showActionNotice('Workout verworfen');
      return true;
    }

    if (actionId === 'log-finish-workout') {
      event.preventDefault();
      const capturedForm =
        captureWorkoutInputsFromFrame(target?.ownerDocument) ?? workoutFormRef.current;
      const { removedCount, nextForm } = pruneCompletelyEmptyWorkoutEntries();
      handleWorkoutSubmit(createSyntheticSubmitEvent(), nextForm ?? capturedForm);
      showActionNotice(
        removedCount > 0
          ? `Workout speichern ausgelöst (${removedCount} leere Übung(en) übersprungen)`
          : 'Workout speichern ausgelöst',
      );
      return true;
    }

    if (actionId === 'settings-toggle-dark-mode') {
      event.preventDefault();
      const currentTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setThemeMode(nextTheme);
      showActionNotice(`Theme: ${nextTheme === 'dark' ? 'Dark' : 'Light'}`);
      return true;
    }

    if (actionId === 'settings-toggle-high-contrast') {
      event.preventDefault();
      const nextContrast = !visualPrefsRef.current.highContrast;
      updateVisualPreferences({ highContrast: nextContrast });
      showActionNotice(`Kontrast: ${nextContrast ? 'hoch' : 'normal'}`);
      return true;
    }

    if (actionId.startsWith('settings-accent-')) {
      event.preventDefault();
      const accent = actionId.replace('settings-accent-', '');
      if (Object.hasOwn(ACCENT_COLORS, accent)) {
        updateVisualPreferences({ accent });
        showActionNotice(`Accent: ${accent}`);
        return true;
      }
    }

    if (actionId === 'settings-weekly' || actionId === 'settings-monthly') {
      event.preventDefault();
      const range = actionId === 'settings-weekly' ? 'weekly' : 'monthly';
      updateVisualPreferences({ bodyweightRange: range });
      showActionNotice(`Bodyweight-Ansicht: ${range}`);
      return true;
    }

    if (actionId === 'settings-export-json') {
      event.preventDefault();
      exportAppData();
      showActionNotice('JSON-Export gestartet');
      return true;
    }

    if (actionId === 'settings-import-json') {
      event.preventDefault();
      fileInputRef.current?.click();
      showActionNotice('Datei für Import auswählen');
      return true;
    }

    if (actionId === 'settings-import-replace') {
      event.preventDefault();
      applyPendingImport('replace');
      showActionNotice('Import: Daten ersetzt');
      return true;
    }

    if (actionId === 'settings-import-merge') {
      event.preventDefault();
      applyPendingImport('merge');
      showActionNotice('Import: Daten zusammengeführt');
      return true;
    }

    if (actionId === 'settings-import-cancel') {
      event.preventDefault();
      clearPendingImport();
      showActionNotice('Import abgebrochen');
      renderSettingsImportDecision(target?.ownerDocument);
      return true;
    }

    if (actionId === 'settings-weight-kg') {
      event.preventDefault();
      updateVisualPreferences({ weightUnit: 'kg' });
      showActionNotice('Gewichtseinheit: kg');
      return true;
    }

    if (actionId === 'settings-weight-lb') {
      event.preventDefault();
      updateVisualPreferences({ weightUnit: 'lb' });
      showActionNotice('Gewichtseinheit: lb');
      return true;
    }

    if (actionId === 'settings-distance-mi') {
      event.preventDefault();
      updateVisualPreferences({ distanceUnit: 'mi' });
      showActionNotice('Distanz: mi');
      return true;
    }

    if (actionId === 'settings-distance-km') {
      event.preventDefault();
      updateVisualPreferences({ distanceUnit: 'km' });
      showActionNotice('Distanz: km');
      return true;
    }

    if (actionId === 'settings-cloud-sync') {
      event.preventDefault();
      showActionNotice('Cloud Sync geöffnet');
      return true;
    }

    if (actionId === 'settings-privacy-profile') {
      event.preventDefault();
      showActionNotice('Privacy Profile geöffnet');
      return true;
    }

    if (actionId === 'settings-delete-everything') {
      event.preventDefault();
      clearAllDataWithConfirmation();
      return true;
    }

    if (actionId === 'settings-save-bodyweight') {
      event.preventDefault();
      saveBodyweightFromFrame(target?.ownerDocument);
      return true;
    }

    if (actionId === 'history-filter-owned-workouts') {
      event.preventDefault();
      showActionNotice('Filter: nur deine Workouts');
      return true;
    }

    if (actionId === 'history-export-csv') {
      event.preventDefault();
      exportWorkoutHistoryCsv();
      showActionNotice('History-Export gestartet');
      return true;
    }

    const progressWindowFromAction = mapActionIdToProgressWindow(actionId);
    if (progressWindowFromAction !== null) {
      event.preventDefault();
      setSelectedProgressWindow(progressWindowFromAction);
      showActionNotice(
        progressWindowFromAction === 365
          ? 'Zeitraum: Alle Daten'
          : `Zeitraum: ${progressWindowFromAction} Tage`,
      );
      return true;
    }

    const progressMetricFromAction = mapActionIdToProgressMetric(actionId);
    if (progressMetricFromAction) {
      event.preventDefault();
      setSelectedProgressMetric(progressMetricFromAction);
      showActionNotice(`Metrik: ${toMetricLabel(progressMetricFromAction)}`);
      return true;
    }

    if (actionId === 'progress-detailed-muscle-analysis') {
      event.preventDefault();
      setSelectedProgressMetric('volume');
      showActionNotice('Muskelanalyse geöffnet');
      return true;
    }

    if (activeView === 'settings' && (text === 'log' || text.includes('save bodyweight'))) {
      event.preventDefault();
      saveBodyweightFromFrame(target?.ownerDocument);
      return true;
    }

    if (text.includes('sign out')) {
      event.preventDefault();
      showActionNotice('Sign-out ist im lokalen Demo-Modus deaktiviert');
      return true;
    }

    if (progressWindow !== null) {
      event.preventDefault();
      setSelectedProgressWindow(progressWindow);
      showActionNotice(`Zeitraum: ${progressWindow} Tage`);
      return true;
    }

    if (activeView === 'progress' && text === 'all') {
      event.preventDefault();
      setSelectedProgressWindow(365);
      showActionNotice('Zeitraum: Alle Daten');
      return true;
    }

    if (progressMetric) {
      event.preventDefault();
      setSelectedProgressMetric(progressMetric);
      showActionNotice(`Metrik: ${toMetricLabel(progressMetric)}`);
      return true;
    }

    if (
      text.includes('start workout') ||
      text.includes('start empty workout') ||
      text.includes('new workout') ||
      text === 'add'
    ) {
      event.preventDefault();
      startPrimaryWorkoutFlow();
      return true;
    }

    if (
      text.includes('push day a') ||
      text.includes('legs - strength focus') ||
      text.includes('upper body mobility')
    ) {
      event.preventDefault();
      startWorkoutFromSplit(getPresetSplitId(text));
      setActiveView('log');
      showActionNotice('Workout-Plan geladen');
      return true;
    }

    if (text.includes('resume')) {
      event.preventDefault();
      if (latestWorkoutRef.current?.id) {
        startEditingWorkout(latestWorkoutRef.current.id);
        showActionNotice('Letztes Workout fortgesetzt');
      } else {
        startPrimaryWorkoutFlow();
      }
      return true;
    }

    if (text.includes('repeat last workout')) {
      event.preventDefault();
      repeatLatestWorkout();
      setActiveView('log');
      showActionNotice('Letztes Workout geladen');
      return true;
    }

    if (text.includes('start last template') || text.includes('load last template')) {
      event.preventDefault();
      startWorkoutFromLastUsedTemplate();
      setActiveView('log');
      showActionNotice('Letztes Template geladen');
      return true;
    }

    if (text === 'finish' || text.includes('finish workout') || text.includes('save workout')) {
      event.preventDefault();
      const capturedForm =
        captureWorkoutInputsFromFrame(target?.ownerDocument) ?? workoutFormRef.current;
      const { removedCount, nextForm } = pruneCompletelyEmptyWorkoutEntries();
      handleWorkoutSubmit(createSyntheticSubmitEvent(), nextForm ?? capturedForm);
      showActionNotice(
        removedCount > 0
          ? `Workout speichern ausgelöst (${removedCount} leere Übung(en) übersprungen)`
          : 'Workout speichern ausgelöst',
      );
      return true;
    }

    if (text.includes('rest timer')) {
      event.preventDefault();
      startVisualRestTimer(target);
      showActionNotice('Rest-Timer gestartet');
      return true;
    }

    if (text === 'discard' || text.includes('discard workout') || text.includes('cancel discard')) {
      event.preventDefault();
      resetWorkoutForm();
      setActiveView('dashboard');
      showActionNotice('Workout verworfen');
      return true;
    }

    if (text.includes('add set')) {
      event.preventDefault();
      const doc = target?.ownerDocument;
      captureWorkoutInputsFromFrame(doc);
      const nextForm = addSetToWorkout(target);
      renderLogWorkoutVisual(doc, nextForm);
      wireLogActions(doc);
      showActionNotice('Set hinzugefügt');
      return true;
    }

    if (text.includes('add exercise')) {
      event.preventDefault();
      const doc = target?.ownerDocument;
      captureWorkoutInputsFromFrame(doc);
      const nextForm = addExerciseToWorkout();
      if (nextForm) {
        renderLogWorkoutVisual(doc, nextForm);
        wireLogActions(doc);
      }
      showActionNotice('Exercise hinzugefügt');
      return true;
    }

    if (text === 'check' || text.includes('check_circle')) {
      event.preventDefault();
      const doc = target?.ownerDocument;
      captureWorkoutInputsFromFrame(doc);
      const nextForm = toggleSetCompletion(target);
      renderLogWorkoutVisual(doc, nextForm);
      wireLogActions(doc);
      showActionNotice('Set-Status aktualisiert');
      return true;
    }

    if (text.includes('duplicate to template')) {
      event.preventDefault();
      const workoutId = latestWorkoutRef.current?.id;
      if (workoutId) {
        saveWorkoutAsTemplate(workoutId);
        showActionNotice('Workout als Template gespeichert');
      } else {
        showActionNotice('Kein Workout für Template verfügbar');
      }
      return true;
    }

    if (text.includes('view details')) {
      event.preventDefault();
      const workoutId = latestWorkoutRef.current?.id;
      if (workoutId) {
        startEditingWorkout(workoutId);
        showActionNotice('Workout-Details geöffnet');
      } else {
        showActionNotice('Keine Workout-Details verfügbar');
      }
      return true;
    }

    if (text.includes('export json')) {
      event.preventDefault();
      exportAppData();
      showActionNotice('JSON-Export gestartet');
      return true;
    }

    if (
      text.includes('export workout history') ||
      text.includes('download export') ||
      (activeView === 'history' && text === 'export') ||
      (activeView === 'settings' && text.includes('export data'))
    ) {
      event.preventDefault();
      exportWorkoutHistoryCsv();
      showActionNotice('History-Export gestartet');
      return true;
    }

    if (
      text.includes('import data') ||
      text.includes('import json') ||
      text.includes('import csv')
    ) {
      event.preventDefault();
      fileInputRef.current?.click();
      showActionNotice('Datei für Import auswählen');
      return true;
    }

    if ((text === 'replace data' || text === 'replace all') && pendingImportRef.current) {
      event.preventDefault();
      applyPendingImport('replace');
      showActionNotice('Import: Daten ersetzt');
      return true;
    }

    if ((text === 'merge data' || text === 'merge') && pendingImportRef.current) {
      event.preventDefault();
      applyPendingImport('merge');
      showActionNotice('Import: Daten zusammengeführt');
      return true;
    }

    if (text === 'cancel import' || text === 'cancel') {
      event.preventDefault();
      clearPendingImport();
      showActionNotice('Import abgebrochen');
      return true;
    }

    if (text.includes('view all records')) {
      event.preventDefault();
      setActiveView('history');
      showActionNotice('Zur History gewechselt');
      return true;
    }

    if (text === 'view all') {
      event.preventDefault();
      setActiveView('history');
      showActionNotice('Alle Einträge geöffnet');
      return true;
    }

    if (text.includes('detailed muscle analysis')) {
      event.preventDefault();
      setActiveView('progress');
      showActionNotice('Zur Progress-Ansicht gewechselt');
      return true;
    }

    if (text.includes('add custom')) {
      event.preventDefault();
      setActiveView('exercises');
      showActionNotice('Exercise-Editor geöffnet');
      return true;
    }

    if (text.includes('details')) {
      event.preventDefault();
      setActiveView('exercises');
      showActionNotice('Exercise-Details geöffnet');
      return true;
    }

    if (text.includes('analyze')) {
      event.preventDefault();
      setActiveView('progress');
      showActionNotice('Analyse geöffnet');
      return true;
    }

    if (text.includes('#pr-attempt')) {
      event.preventDefault();
      appendWorkoutTag('#pr-attempt');
      showActionNotice('Tag #pr-attempt hinzugefügt');
      return true;
    }

    if (text.includes('#deload')) {
      event.preventDefault();
      appendWorkoutTag('#deload');
      showActionNotice('Tag #deload hinzugefügt');
      return true;
    }

    if (text.includes('#recovery')) {
      event.preventDefault();
      appendWorkoutTag('#recovery');
      showActionNotice('Tag #recovery hinzugefügt');
      return true;
    }

    if (['all exercises', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'].includes(text)) {
      event.preventDefault();
      showActionNotice(`Filter: ${text}`);
      return true;
    }

    if (activeView === 'settings' && (text === 'weekly' || text === 'monthly')) {
      event.preventDefault();
      updateVisualPreferences({ bodyweightRange: text });
      showActionNotice(`Bodyweight-Ansicht: ${text}`);
      return true;
    }

    if (
      text.includes('cloud sync') ||
      text.includes('privacy profile') ||
      text.includes('filter')
    ) {
      event.preventDefault();
      showActionNotice(`${toReadableLabel(text)} geöffnet`);
      return true;
    }

    if (text.includes('notifications')) {
      event.preventDefault();
      showActionNotice('Benachrichtigungen geöffnet');
      return true;
    }

    return false;
  }

  function handleGenericInteraction(target, rawText, event) {
    if (!isElementNode(target)) {
      return false;
    }

    if (target.matches('input, select, textarea')) {
      return false;
    }

    flashInteractiveTarget(target);
    activateSiblingGroup(target);

    const label = toReadableLabel(rawText);
    event.preventDefault();
    showActionNotice(`${label} aktiviert`);
    return true;
  }

  function handleFrameLoad() {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;

    if (!frame || !doc) {
      return;
    }

    const filters = [];

    if (resolvedTheme === 'light') {
      filters.push('invert(1)', 'hue-rotate(180deg)');
    }

    if (visualPrefsRef.current.highContrast) {
      filters.push('contrast(1.16)', 'saturate(1.08)');
    }

    frame.style.filter = filters.join(' ') || 'none';
    frame.style.background = resolvedTheme === 'light' ? '#f5f5f7' : '#09090b';

    const targets = doc.querySelectorAll('a');

    targets.forEach((target) => {
      const text = buildInteractiveText(target);
      const view = isLikelyViewNavigationTarget(target) ? mapTextToView(text) : null;

      target.setAttribute('target', '_self');
      target.setAttribute('rel', 'noopener noreferrer');
      target.setAttribute('href', view ? `#/${view}` : '#');
    });

    syncFrameVisualState(doc);
    wireGlobalActions(doc);
    wireDashboardActions(doc);
    wireHistoryActions(doc);
    wireSettingsActions(doc);
    wireProgressActions(doc);
    wireLogActions(doc);
    wireExerciseActions(doc);
    if (activeView === 'log') {
      renderLogWorkoutVisual(doc);
      wireLogActions(doc);
    }
    if (activeView === 'history') {
      injectHistoryLiveSessions(doc);
    }

    if (doc.documentElement.dataset.codexDelegatedClick !== '1') {
      doc.documentElement.dataset.codexDelegatedClick = '1';

      doc.addEventListener(
        'click',
        (event) => {
          const eventTarget = event.target;
          const elementTarget = isElementNode(eventTarget)
            ? eventTarget
            : isElementNode(eventTarget?.parentElement)
              ? eventTarget.parentElement
              : null;
          const interactiveTarget = elementTarget?.closest(
            'a, button, input, select, textarea, [role="button"], .cursor-pointer, [class*="hover:"], [data-codex-action]',
          );

          if (!interactiveTarget) {
            return;
          }

          const text = buildInteractiveText(interactiveTarget);
          const view = isLikelyViewNavigationTarget(interactiveTarget) ? mapTextToView(text) : null;

          const handled = handleFrameActionRef.current?.(interactiveTarget, text, event) ?? false;
          if (handled) {
            syncFrameVisualState(doc);
            wireGlobalActions(doc);
            wireDashboardActions(doc);
            wireHistoryActions(doc);
            wireSettingsActions(doc);
            wireProgressActions(doc);
            wireLogActions(doc);
            wireExerciseActions(doc);
            return;
          }

          if (view) {
            event.preventDefault();
            setActiveView(view);
            flashInteractiveTarget(interactiveTarget);
            activateSiblingGroup(interactiveTarget);
            showActionNotice(`Navigation: ${view}`);
            return;
          }

          handleGenericInteractionRef.current?.(interactiveTarget, text, event);
        },
        true,
      );
    }

    if (doc.documentElement.dataset.codexDelegatedKeyboard !== '1') {
      doc.documentElement.dataset.codexDelegatedKeyboard = '1';

      doc.addEventListener(
        'keydown',
        (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }

          const eventTarget = event.target;
          const elementTarget = isElementNode(eventTarget)
            ? eventTarget
            : isElementNode(eventTarget?.parentElement)
              ? eventTarget.parentElement
              : null;
          const interactiveTarget = elementTarget?.closest('[data-codex-action][role="button"]');

          if (
            !interactiveTarget ||
            ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(interactiveTarget.tagName)
          ) {
            return;
          }

          const text = buildInteractiveText(interactiveTarget);
          const handled = handleFrameActionRef.current?.(interactiveTarget, text, event) ?? false;
          if (handled) {
            syncFrameVisualState(doc);
            wireGlobalActions(doc);
            wireDashboardActions(doc);
            wireHistoryActions(doc);
            wireSettingsActions(doc);
            wireProgressActions(doc);
            wireLogActions(doc);
            wireExerciseActions(doc);
          }
        },
        true,
      );
    }

    if (doc.documentElement.dataset.codexDelegatedChange !== '1') {
      doc.documentElement.dataset.codexDelegatedChange = '1';

      doc.addEventListener(
        'change',
        (event) => {
          const target = event.target;

          if (!isWeeklyGoalInput(target)) {
            return;
          }

          const parsed = Number(target.value);
          if (!Number.isFinite(parsed)) {
            return;
          }

          const nextGoal = Math.min(MAX_WEEKLY_WORKOUT_GOAL, Math.max(1, Math.round(parsed)));
          setWeeklyWorkoutGoal(nextGoal);
          showActionNotice(`Wochenziel: ${nextGoal}`);
        },
        true,
      );
    }
  }

  handleFrameActionRef.current = handleFrameAction;
  handleGenericInteractionRef.current = handleGenericInteraction;

  return (
    <div
      className="stitch-app-shell"
      data-view={activeView}
      data-theme={resolvedTheme}
      data-theme-mode={themeMode}
      data-contrast={visualPrefs.highContrast ? 'high' : 'normal'}
    >
      <nav className="a11y-nav" aria-label="Primary">
        {VIEW_IDS.map((viewId) => (
          <button
            key={viewId}
            type="button"
            aria-label={VIEW_LABELS[viewId] ?? viewId}
            onClick={() => setActiveView(viewId)}
          >
            {VIEW_LABELS[viewId] ?? viewId}
          </button>
        ))}
      </nav>

      <iframe
        ref={iframeRef}
        title={`Stitch ${activeView}`}
        src={src}
        className="stitch-frame"
        onLoad={handleFrameLoad}
      />

      <input
        ref={fileInputRef}
        className="stitch-hidden-input"
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
      />

      {storageWarning || actionNotice || workoutMessage?.text || dataMessage?.text ? (
        <div
          className="stitch-action-notice"
          role={storageWarning ? 'alert' : 'status'}
          aria-live="polite"
        >
          {storageWarning || actionNotice || workoutMessage?.text || dataMessage?.text}
        </div>
      ) : null}
    </div>
  );
}

export default App;
