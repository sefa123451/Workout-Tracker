import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_WEEKLY_WORKOUT_GOAL,
  STORAGE_VERSION,
  buildWorkoutHistoryCsv,
  buildWorkoutEntriesFromSplit,
  createId,
  createSet,
  createSetFromValues,
  createSplitExercise,
  createSplitForm,
  createSplitFormFromSplit,
  createWorkoutEntry,
  createWorkoutForm,
  createWorkoutFormFromTemplate,
  createWorkoutFormFromWorkout,
  formatDelta,
  formatDisplayDate,
  formatNumber,
  getTodayInputValue,
  getEntryMetrics,
  mergeImportedData,
  hasImprovement,
  hasPersonalRecord,
  isValidDateInput,
  parseSet,
  readStoredData,
  sortWorkouts,
  validateImportedData,
} from '../lib/workoutData.js';
import { useTrackerDerivedData } from './useTrackerDerivedData.js';
import { useTrackerPersistence } from './useTrackerPersistence.js';

const LAST_TEMPLATE_STORAGE_KEY = 'workout-tracker-last-template-id';
const VIEW_META = {
  dashboard: { title: 'Good morning 👋' },
  exercises: { title: 'Exercises & Splits' },
  log: { title: 'Log workout' },
  history: { title: 'History' },
  progress: { title: 'Progress' },
  settings: { title: 'Settings' },
};

function getInitialLastTemplateId() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(LAST_TEMPLATE_STORAGE_KEY) ?? '';
}

function moveItem(list, fromIndex, toIndex) {
  if (
    !Array.isArray(list) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return list;
  }

  const nextList = [...list];
  const [movedItem] = nextList.splice(fromIndex, 1);
  nextList.splice(toIndex, 0, movedItem);

  return nextList;
}

export function useAppController() {
  const [storedData] = useState(readStoredData);
  const [activeView, setActiveView] = useState('dashboard');
  const [exercises, setExercises] = useState(storedData.exercises);
  const [splits, setSplits] = useState(storedData.splits);
  const [templates, setTemplates] = useState(storedData.templates ?? []);
  const [workouts, setWorkouts] = useState(storedData.workouts);
  const [bodyweightEntries, setBodyweightEntries] = useState(storedData.bodyweightEntries ?? []);
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState(
    storedData.weeklyWorkoutGoal ?? DEFAULT_WEEKLY_WORKOUT_GOAL,
  );
  const fileInputRef = useRef(null);
  const undoRestoreRef = useRef(null);
  const [dataMessage, setDataMessage] = useState({ type: '', text: '' });
  const [undoNotice, setUndoNotice] = useState(null);
  const [activeDialog, setActiveDialog] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseTargetWeight, setExerciseTargetWeight] = useState('');
  const [exerciseTargetRepMin, setExerciseTargetRepMin] = useState('');
  const [exerciseTargetRepMax, setExerciseTargetRepMax] = useState('');
  const [exerciseWeightStep, setExerciseWeightStep] = useState('2.5');
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [exerciseMessage, setExerciseMessage] = useState({ type: '', text: '' });
  const [splitForm, setSplitForm] = useState(createSplitForm);
  const [editingSplitId, setEditingSplitId] = useState(null);
  const [splitMessage, setSplitMessage] = useState({ type: '', text: '' });
  const [workoutMessage, setWorkoutMessage] = useState({ type: '', text: '' });
  const [workoutForm, setWorkoutForm] = useState(createWorkoutForm);
  const [selectedWorkoutTemplateId, setSelectedWorkoutTemplateId] = useState('');
  const [lastUsedTemplateId, setLastUsedTemplateId] = useState(getInitialLastTemplateId);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateDraftName, setTemplateDraftName] = useState('');
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [selectedProgressView, setSelectedProgressView] = useState('exercise');
  const [selectedSplitProgressId, setSelectedSplitProgressId] = useState('');
  const [selectedProgressWindow, setSelectedProgressWindow] = useState(30);
  const [selectedProgressMetric, setSelectedProgressMetric] = useState('volume');
  const storageWarning = useTrackerPersistence({
    bodyweightEntries,
    exercises,
    splits,
    templates,
    workouts,
    weeklyWorkoutGoal,
  });

  useEffect(() => {
    if (!selectedExerciseId && exercises.length > 0) {
      setSelectedExerciseId(exercises[0].id);
    }

    if (selectedExerciseId && !exercises.some((exercise) => exercise.id === selectedExerciseId)) {
      setSelectedExerciseId(exercises[0]?.id ?? '');
    }
  }, [exercises, selectedExerciseId]);

  useEffect(() => {
    if (!selectedSplitProgressId && splits.length > 0) {
      setSelectedSplitProgressId(splits[0].id);
    }

    if (selectedSplitProgressId && !splits.some((split) => split.id === selectedSplitProgressId)) {
      setSelectedSplitProgressId(splits[0]?.id ?? '');
    }
  }, [selectedSplitProgressId, splits]);

  useEffect(() => {
    if (selectedProgressView === 'split' && splits.length === 0) {
      setSelectedProgressView('exercise');
    }
  }, [selectedProgressView, splits.length]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (lastUsedTemplateId) {
      window.localStorage.setItem(LAST_TEMPLATE_STORAGE_KEY, lastUsedTemplateId);
    } else {
      window.localStorage.removeItem(LAST_TEMPLATE_STORAGE_KEY);
    }
  }, [lastUsedTemplateId]);

  useEffect(() => {
    if (lastUsedTemplateId && !templates.some((template) => template.id === lastUsedTemplateId)) {
      setLastUsedTemplateId('');
    }
  }, [lastUsedTemplateId, templates]);
  const {
    bodyweightSummary,
    dashboardSummary,
    getExerciseName,
    getSplitName,
    historyHeatmap,
    historyPrTimeline,
    lastUsedTemplate,
    latestWorkout,
    selectedExerciseHistory,
    selectedExerciseWindowHistory,
    selectedExerciseWindowSummary,
    selectedSplitHistory,
    selectedSplitWindowHistory,
    selectedSplitWindowSummary,
    sortedWorkouts,
    totalSetsLogged,
  } = useTrackerDerivedData({
    exercises,
    splits,
    templates,
    workouts,
    bodyweightEntries,
    weeklyWorkoutGoal,
    lastUsedTemplateId,
    selectedExerciseId,
    selectedSplitProgressId,
    selectedProgressWindow,
  });
  const activeViewMeta = VIEW_META[activeView] ?? VIEW_META.dashboard;
  const sidebarSummary = latestWorkout
    ? `Last log ${formatDisplayDate(latestWorkout.date)}`
    : 'Local-first tracker';

  function exportAppData() {
    const exportPayload = {
      version: STORAGE_VERSION,
      bodyweightEntries,
      exercises,
      splits,
      templates,
      workouts,
      weeklyWorkoutGoal,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);

    downloadLink.href = objectUrl;
    downloadLink.download = `workout-tracker-${timestamp}.json`;
    downloadLink.click();
    window.URL.revokeObjectURL(objectUrl);
    setDataMessage({ type: 'success', text: 'Exported all app data as JSON.' });
  }

  function exportWorkoutHistoryCsv() {
    const csv = buildWorkoutHistoryCsv(sortedWorkouts, exercises, splits);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const objectUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);

    downloadLink.href = objectUrl;
    downloadLink.download = `workout-history-${timestamp}.csv`;
    downloadLink.click();
    window.URL.revokeObjectURL(objectUrl);
    setDataMessage({ type: 'success', text: 'Exported workout history as CSV.' });
  }

  function resetAppEditingState() {
    resetExerciseForm();
    resetSplitForm();
    resetWorkoutForm();
  }

  function clearPendingImport() {
    setPendingImport(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function clearUndoNotice() {
    undoRestoreRef.current = null;
    setUndoNotice(null);
  }

  function showUndoNotice(text, restore) {
    undoRestoreRef.current = restore;
    setUndoNotice({ text });
  }

  function openConfirmDialog({
    title,
    description = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'default',
    onConfirm,
  }) {
    setActiveDialog({
      kind: 'confirm',
      title,
      description,
      confirmLabel,
      cancelLabel,
      tone,
      onConfirm,
    });
  }

  function openPromptDialog({
    title,
    description = '',
    inputLabel = 'Name',
    defaultValue = '',
    confirmLabel = 'Save',
    cancelLabel = 'Cancel',
    tone = 'default',
    onConfirm,
  }) {
    setActiveDialog({
      kind: 'prompt',
      title,
      description,
      inputLabel,
      defaultValue,
      confirmLabel,
      cancelLabel,
      tone,
      onConfirm,
    });
  }

  function handleDialogCancel() {
    setActiveDialog(null);
  }

  function handleDialogConfirm(inputValue = '') {
    setActiveDialog((currentDialog) => {
      if (!currentDialog) {
        return currentDialog;
      }

      const shouldClose = currentDialog.onConfirm?.(inputValue);
      return shouldClose === false ? currentDialog : null;
    });
  }

  function handleUndoDelete() {
    if (!undoRestoreRef.current) {
      return;
    }

    undoRestoreRef.current();
    clearUndoNotice();
    setDataMessage({ type: 'success', text: 'Deletion undone.' });
  }

  function applyPendingImport(mode = 'replace') {
    if (!pendingImport) {
      return;
    }

    const nextData =
      mode === 'merge'
        ? mergeImportedData(
            { bodyweightEntries, exercises, splits, templates, workouts, weeklyWorkoutGoal },
            pendingImport.value,
          )
        : pendingImport.value;

    setBodyweightEntries(nextData.bodyweightEntries ?? []);
    setExercises(nextData.exercises);
    setSplits(nextData.splits);
    setTemplates(nextData.templates ?? []);
    setWorkouts(nextData.workouts);
    setWeeklyWorkoutGoal(nextData.weeklyWorkoutGoal ?? DEFAULT_WEEKLY_WORKOUT_GOAL);
    resetAppEditingState();
    setSelectedExerciseId(nextData.exercises[0]?.id ?? '');
    setActiveView('dashboard');
    setDataMessage({
      type: 'success',
      text:
        mode === 'merge'
          ? `Merged import. You now have ${nextData.exercises.length} exercises, ${nextData.splits.length} splits, ${nextData.templates?.length ?? 0} templates, ${nextData.workouts.length} workouts, and ${nextData.bodyweightEntries?.length ?? 0} bodyweight check-ins.`
          : `Imported ${pendingImport.value.exercises.length} exercises, ${pendingImport.value.splits.length} splits, ${pendingImport.value.templates?.length ?? 0} templates, ${pendingImport.value.workouts.length} workouts, and ${pendingImport.value.bodyweightEntries?.length ?? 0} bodyweight check-ins.`,
    });
    clearUndoNotice();
    clearPendingImport();
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      let parsed;

      try {
        parsed = JSON.parse(fileText);
      } catch {
        clearPendingImport();
        setDataMessage({ type: 'error', text: 'Selected file is not valid JSON.' });
        return;
      }

      const validatedImport = validateImportedData(parsed);

      if (validatedImport.error) {
        clearPendingImport();
        setDataMessage({ type: 'error', text: validatedImport.error });
        return;
      }

      setPendingImport({
        fileName: file.name,
        value: validatedImport.value,
      });
      setDataMessage({
        type: 'warning',
        text: 'Review the import preview below before replacing or merging your current data.',
      });
    } catch {
      setDataMessage({ type: 'error', text: 'Unable to read the selected file.' });
    } finally {
      event.target.value = '';
    }
  }

  function saveBodyweightEntry(date, weightValue) {
    const trimmedDate = typeof date === 'string' ? date : '';
    const parsedWeight = Number(weightValue);

    if (!isValidDateInput(trimmedDate)) {
      setDataMessage({ type: 'error', text: 'Choose a valid bodyweight date.' });
      return false;
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setDataMessage({ type: 'error', text: 'Bodyweight must be a positive number.' });
      return false;
    }

    const normalizedWeight = Number(parsedWeight.toFixed(1));

    setBodyweightEntries((current) => {
      const existingEntry = current.find((entry) => entry.date === trimmedDate);

      if (existingEntry) {
        return current
          .map((entry) =>
            entry.date === trimmedDate ? { ...entry, weight: normalizedWeight } : entry,
          )
          .sort((left, right) => right.date.localeCompare(left.date));
      }

      return [
        {
          id: createId(),
          date: trimmedDate,
          weight: normalizedWeight,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].sort((left, right) => right.date.localeCompare(left.date));
    });

    setDataMessage({
      type: 'success',
      text: `Saved bodyweight check-in for ${formatDisplayDate(trimmedDate)}.`,
    });
    return true;
  }

  function resetExerciseForm(clearMessage = true) {
    setExerciseName('');
    setExerciseTargetWeight('');
    setExerciseTargetRepMin('');
    setExerciseTargetRepMax('');
    setExerciseWeightStep('2.5');
    setEditingExerciseId(null);
    if (clearMessage) {
      setExerciseMessage({ type: '', text: '' });
    }
  }

  function resetSplitForm(clearMessage = true) {
    setSplitForm(createSplitForm());
    setEditingSplitId(null);
    if (clearMessage) {
      setSplitMessage({ type: '', text: '' });
    }
  }

  function getLinkedWorkoutCount(exerciseId) {
    return workouts.reduce(
      (count, workout) =>
        count + workout.entries.filter((entry) => entry.exerciseId === exerciseId).length,
      0,
    );
  }

  function getLinkedSplitWorkoutCount(splitId) {
    return workouts.filter((workout) => workout.splitId === splitId).length;
  }

  function handleExerciseSubmit(event) {
    event.preventDefault();
    const normalizedName = exerciseName.trim();
    const normalizedTargetWeight = exerciseTargetWeight.trim();
    const normalizedTargetRepMin = exerciseTargetRepMin.trim();
    const normalizedTargetRepMax = exerciseTargetRepMax.trim();
    const normalizedWeightStep = exerciseWeightStep.trim();

    if (!normalizedName) {
      setExerciseMessage({ type: 'error', text: 'Exercise name cannot be empty.' });
      return;
    }

    const parsedTargetWeight = normalizedTargetWeight ? Number(normalizedTargetWeight) : null;
    const parsedTargetRepMin = normalizedTargetRepMin ? Number(normalizedTargetRepMin) : null;
    const parsedTargetRepMax = normalizedTargetRepMax ? Number(normalizedTargetRepMax) : null;
    const parsedWeightStep = normalizedWeightStep ? Number(normalizedWeightStep) : 2.5;

    if (
      normalizedTargetWeight &&
      (!Number.isFinite(parsedTargetWeight) || parsedTargetWeight <= 0)
    ) {
      setExerciseMessage({ type: 'error', text: 'Target weight must be a positive number.' });
      return;
    }

    if (
      normalizedTargetRepMin &&
      (!Number.isInteger(parsedTargetRepMin) || parsedTargetRepMin <= 0)
    ) {
      setExerciseMessage({ type: 'error', text: 'Target rep min must be a whole number.' });
      return;
    }

    if (
      normalizedTargetRepMax &&
      (!Number.isInteger(parsedTargetRepMax) || parsedTargetRepMax <= 0)
    ) {
      setExerciseMessage({ type: 'error', text: 'Target rep max must be a whole number.' });
      return;
    }

    if (
      parsedTargetRepMin !== null &&
      parsedTargetRepMax !== null &&
      parsedTargetRepMin > parsedTargetRepMax
    ) {
      setExerciseMessage({
        type: 'error',
        text: 'Target rep min cannot be higher than target rep max.',
      });
      return;
    }

    if (!Number.isFinite(parsedWeightStep) || parsedWeightStep <= 0) {
      setExerciseMessage({ type: 'error', text: 'Weight step must be a positive number.' });
      return;
    }

    if (
      exercises.some(
        (exercise) =>
          exercise.id !== editingExerciseId &&
          exercise.name.trim().toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      setExerciseMessage({ type: 'error', text: 'Exercise names should be unique.' });
      return;
    }

    if (editingExerciseId) {
      setExercises((current) =>
        current.map((exercise) =>
          exercise.id === editingExerciseId
            ? {
                ...exercise,
                name: normalizedName,
                targetWeight: parsedTargetWeight,
                targetRepMin: parsedTargetRepMin,
                targetRepMax: parsedTargetRepMax,
                weightStep: parsedWeightStep,
              }
            : exercise,
        ),
      );
      resetExerciseForm(false);
      setExerciseMessage({ type: 'success', text: `Renamed to ${normalizedName}.` });
    } else {
      const newExercise = {
        id: createId(),
        name: normalizedName,
        targetWeight: parsedTargetWeight,
        targetRepMin: parsedTargetRepMin,
        targetRepMax: parsedTargetRepMax,
        weightStep: parsedWeightStep,
        createdAt: new Date().toISOString(),
      };

      setExercises((current) => [...current, newExercise]);
      resetExerciseForm(false);
      setExerciseMessage({ type: 'success', text: `Added ${normalizedName}.` });
    }

    setActiveView('exercises');
  }

  function saveCustomExercise({
    name,
    targetWeight = '',
    targetRepMin = '',
    targetRepMax = '',
    weightStep = '2.5',
  }) {
    const normalizedName = String(name ?? '').trim();
    const normalizedTargetWeight = String(targetWeight ?? '').trim();
    const normalizedTargetRepMin = String(targetRepMin ?? '').trim();
    const normalizedTargetRepMax = String(targetRepMax ?? '').trim();
    const normalizedWeightStep = String(weightStep ?? '').trim() || '2.5';

    if (!normalizedName) {
      return { ok: false, message: 'Exercise name cannot be empty.' };
    }

    const parsedTargetWeight = normalizedTargetWeight ? Number(normalizedTargetWeight) : null;
    const parsedTargetRepMin = normalizedTargetRepMin ? Number(normalizedTargetRepMin) : null;
    const parsedTargetRepMax = normalizedTargetRepMax ? Number(normalizedTargetRepMax) : null;
    const parsedWeightStep = normalizedWeightStep ? Number(normalizedWeightStep) : 2.5;

    if (
      normalizedTargetWeight &&
      (!Number.isFinite(parsedTargetWeight) || parsedTargetWeight <= 0)
    ) {
      return { ok: false, message: 'Target weight must be a positive number.' };
    }

    if (
      normalizedTargetRepMin &&
      (!Number.isInteger(parsedTargetRepMin) || parsedTargetRepMin <= 0)
    ) {
      return { ok: false, message: 'Target rep min must be a whole number.' };
    }

    if (
      normalizedTargetRepMax &&
      (!Number.isInteger(parsedTargetRepMax) || parsedTargetRepMax <= 0)
    ) {
      return { ok: false, message: 'Target rep max must be a whole number.' };
    }

    if (
      parsedTargetRepMin !== null &&
      parsedTargetRepMax !== null &&
      parsedTargetRepMin > parsedTargetRepMax
    ) {
      return { ok: false, message: 'Target rep min cannot be higher than target rep max.' };
    }

    if (!Number.isFinite(parsedWeightStep) || parsedWeightStep <= 0) {
      return { ok: false, message: 'Weight step must be a positive number.' };
    }

    if (
      exercises.some(
        (exercise) => exercise.name.trim().toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      return { ok: false, message: 'Exercise names should be unique.' };
    }

    const newExercise = {
      id: createId(),
      name: normalizedName,
      targetWeight: parsedTargetWeight,
      targetRepMin: parsedTargetRepMin,
      targetRepMax: parsedTargetRepMax,
      weightStep: parsedWeightStep,
      createdAt: new Date().toISOString(),
    };

    setExercises((current) => [...current, newExercise]);
    setExerciseMessage({ type: 'success', text: `Added ${normalizedName}.` });
    setSelectedExerciseId(newExercise.id);
    setActiveView('exercises');

    return { ok: true, exercise: newExercise, message: `Added ${normalizedName}.` };
  }

  function startEditingExercise(exerciseId) {
    const exercise = exercises.find((item) => item.id === exerciseId);

    if (!exercise) {
      setExerciseMessage({ type: 'error', text: 'Exercise not found.' });
      return;
    }

    setEditingExerciseId(exercise.id);
    setExerciseName(exercise.name);
    setExerciseTargetWeight(exercise.targetWeight ? String(exercise.targetWeight) : '');
    setExerciseTargetRepMin(exercise.targetRepMin ? String(exercise.targetRepMin) : '');
    setExerciseTargetRepMax(exercise.targetRepMax ? String(exercise.targetRepMax) : '');
    setExerciseWeightStep(String(exercise.weightStep ?? 2.5));
    setExerciseMessage({ type: '', text: '' });
    setActiveView('exercises');
  }

  function deleteExercise(exerciseId) {
    const exercise = exercises.find((item) => item.id === exerciseId);

    if (!exercise) {
      return;
    }

    const linkedWorkoutCount = getLinkedWorkoutCount(exerciseId);
    const historyMessage =
      linkedWorkoutCount > 0
        ? 'Existing workout history will be kept and shown as "Unknown exercise (deleted)".'
        : 'This removes it from your exercise library.';

    openConfirmDialog({
      title: `Delete ${exercise.name}?`,
      description: historyMessage,
      confirmLabel: 'Delete exercise',
      cancelLabel: 'Cancel',
      tone: 'danger',
      onConfirm: () => {
        const previousExercises = exercises;
        const previousSplits = splits;
        const previousSplitForm = splitForm;
        const previousWorkoutForm = workoutForm;
        const previousTemplates = templates;
        const previousEditingExerciseId = editingExerciseId;
        const previousExerciseName = exerciseName;
        const previousExerciseTargetWeight = exerciseTargetWeight;
        const previousExerciseTargetRepMin = exerciseTargetRepMin;
        const previousExerciseTargetRepMax = exerciseTargetRepMax;
        const previousExerciseWeightStep = exerciseWeightStep;

        setExercises((current) => current.filter((item) => item.id !== exerciseId));
        setSplits((current) =>
          current.map((split) => ({
            ...split,
            exercises: split.exercises.filter(
              (splitExercise) => splitExercise.exerciseId !== exerciseId,
            ),
          })),
        );
        setSplitForm((current) => ({
          ...current,
          exercises: current.exercises.filter((item) => item.exerciseId !== exerciseId),
        }));
        setWorkoutForm((current) => ({
          ...current,
          entries: current.entries.map((entry) =>
            entry.exerciseId === exerciseId
              ? {
                  ...entry,
                  exerciseId: '',
                }
              : entry,
          ),
          skippedEntries: current.skippedEntries.filter((entry) => entry.exerciseId !== exerciseId),
        }));
        setTemplates((current) =>
          current.map((template) => ({
            ...template,
            entries: template.entries.filter((entry) => entry.exerciseId !== exerciseId),
          })),
        );

        if (editingExerciseId === exerciseId) {
          resetExerciseForm();
        } else {
          setExerciseMessage({
            type: 'success',
            text:
              linkedWorkoutCount > 0
                ? `Deleted ${exercise.name}. Linked workout history was preserved.`
                : `Deleted ${exercise.name}.`,
          });
        }

        showUndoNotice(`Deleted ${exercise.name}.`, () => {
          setExercises(previousExercises);
          setSplits(previousSplits);
          setSplitForm(previousSplitForm);
          setWorkoutForm(previousWorkoutForm);
          setTemplates(previousTemplates);
          setEditingExerciseId(previousEditingExerciseId);
          setExerciseName(previousExerciseName);
          setExerciseTargetWeight(previousExerciseTargetWeight);
          setExerciseTargetRepMin(previousExerciseTargetRepMin);
          setExerciseTargetRepMax(previousExerciseTargetRepMax);
          setExerciseWeightStep(previousExerciseWeightStep);
          setExerciseMessage({ type: 'success', text: `${exercise.name} restored.` });
        });

        return true;
      },
    });
  }

  function moveExercise(exerciseId, direction) {
    setExercises((current) => {
      const fromIndex = current.findIndex((exercise) => exercise.id === exerciseId);

      if (fromIndex === -1) {
        return current;
      }

      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      return moveItem(current, fromIndex, toIndex);
    });
  }

  function getUniqueSplitName(baseName) {
    const normalizedBaseName = baseName.trim() || 'Workout split';
    const existingNames = new Set(splits.map((split) => split.name.trim().toLowerCase()));

    if (!existingNames.has(normalizedBaseName.toLowerCase())) {
      return normalizedBaseName;
    }

    let suffix = 2;

    while (existingNames.has(`${normalizedBaseName} ${suffix}`.toLowerCase())) {
      suffix += 1;
    }

    return `${normalizedBaseName} ${suffix}`;
  }

  function getUniqueTemplateName(baseName) {
    const normalizedBaseName = baseName.trim() || 'Workout template';
    const existingNames = new Set(templates.map((template) => template.name.trim().toLowerCase()));

    if (!existingNames.has(normalizedBaseName.toLowerCase())) {
      return normalizedBaseName;
    }

    let suffix = 2;

    while (existingNames.has(`${normalizedBaseName} ${suffix}`.toLowerCase())) {
      suffix += 1;
    }

    return `${normalizedBaseName} ${suffix}`;
  }

  function openSplitPlanner(nextForm, { editingId = null, message = { type: '', text: '' } } = {}) {
    setEditingSplitId(editingId);
    setSplitForm(nextForm);
    setSplitMessage(message);
    setActiveView('exercises');
  }

  function showExerciseLibraryMessage(message) {
    setExerciseMessage(message);
    setActiveView('exercises');
  }

  function showSplitLibraryMessage(message) {
    setSplitMessage(message);
    setActiveView('exercises');
  }

  function buildSeededSplitForm(entries, fallbackName) {
    const existingExerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const seededExercises = entries
      .filter((entry) => existingExerciseIds.has(entry.exerciseId))
      .map((entry) => createSplitExercise(entry.exerciseId, Math.max(entry.sets.length, 1)));

    return {
      seededExercises,
      form: {
        name: getUniqueSplitName(fallbackName),
        exercises: seededExercises.length ? seededExercises : [createSplitExercise()],
      },
    };
  }

  function serializeTemplateEntries(entries) {
    return entries.map((entry) => ({
      exerciseId: entry.exerciseId,
      sets: entry.sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
      })),
    }));
  }

  function moveWorkoutTemplate(templateId, direction) {
    setTemplates((current) => {
      const fromIndex = current.findIndex((template) => template.id === templateId);

      if (fromIndex === -1) {
        return current;
      }

      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      return moveItem(current, fromIndex, toIndex);
    });
  }

  function renameWorkoutTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      setExerciseMessage({ type: 'error', text: 'Template not found.' });
      return;
    }

    openPromptDialog({
      title: 'Rename template',
      description: 'Choose a unique name for this template.',
      inputLabel: 'Template name',
      defaultValue: template.name,
      confirmLabel: 'Rename template',
      cancelLabel: 'Cancel',
      onConfirm: (providedName) => {
        const templateName = providedName.trim();

        if (!templateName) {
          setExerciseMessage({ type: 'error', text: 'Template name cannot be empty.' });
          return false;
        }

        if (
          templates.some(
            (item) =>
              item.id !== templateId &&
              item.name.trim().toLowerCase() === templateName.toLowerCase(),
          )
        ) {
          setExerciseMessage({ type: 'error', text: 'Template names should be unique.' });
          return false;
        }

        setTemplates((current) =>
          current.map((item) => (item.id === templateId ? { ...item, name: templateName } : item)),
        );
        showExerciseLibraryMessage({
          type: 'success',
          text: `Renamed template to ${templateName}.`,
        });
        return true;
      },
    });
  }

  function duplicateWorkoutTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      setExerciseMessage({ type: 'error', text: 'Template not found.' });
      return;
    }

    const duplicatedTemplate = {
      ...template,
      id: createId(),
      name: getUniqueTemplateName(`${template.name} copy`),
      createdAt: new Date().toISOString(),
      entries: serializeTemplateEntries(template.entries),
    };

    setTemplates((current) => [...current, duplicatedTemplate]);
    showExerciseLibraryMessage({ type: 'success', text: `Duplicated ${template.name}.` });
  }

  function normalizeSplitEntries(form) {
    const normalizedName = form.name.trim();
    const weeklyTarget = Number(form.weeklyTarget);

    if (!normalizedName) {
      return { error: 'Split name cannot be empty.' };
    }

    if (
      splits.some(
        (split) =>
          split.id !== editingSplitId &&
          split.name.trim().toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      return { error: 'Split names should be unique.' };
    }

    const chosenExerciseIds = form.exercises.map((entry) => entry.exerciseId).filter(Boolean);

    if (new Set(chosenExerciseIds).size !== chosenExerciseIds.length) {
      return { error: 'Use each exercise only once per split.' };
    }

    if (!Number.isInteger(weeklyTarget) || weeklyTarget < 1 || weeklyTarget > 7) {
      return { error: 'Weekly target must be a whole number between 1 and 7.' };
    }

    const normalizedExercises = [];

    for (const [index, splitExercise] of form.exercises.entries()) {
      const exerciseId = splitExercise.exerciseId.trim();
      const defaultSets = Number(splitExercise.defaultSets);

      if (!exerciseId && String(splitExercise.defaultSets).trim() === '') {
        continue;
      }

      if (!exerciseId) {
        return { error: `Split exercise ${index + 1}: choose an exercise.` };
      }

      if (!Number.isInteger(defaultSets) || defaultSets < 1) {
        return {
          error: `Split exercise ${index + 1}: default sets must be a whole number above 0.`,
        };
      }

      normalizedExercises.push({
        exerciseId,
        defaultSets,
      });
    }

    return {
      value: {
        name: normalizedName,
        weeklyTarget,
        exercises: normalizedExercises,
      },
    };
  }

  function handleSplitSubmit(event) {
    event.preventDefault();
    const normalizedSplit = normalizeSplitEntries(splitForm);

    if (normalizedSplit.error) {
      setSplitMessage({ type: 'error', text: normalizedSplit.error });
      return;
    }

    if (editingSplitId) {
      setSplits((current) =>
        current.map((split) =>
          split.id === editingSplitId ? { ...split, ...normalizedSplit.value } : split,
        ),
      );
      resetSplitForm(false);
      showSplitLibraryMessage({ type: 'success', text: `Updated ${normalizedSplit.value.name}.` });
    } else {
      const newSplit = {
        id: createId(),
        name: normalizedSplit.value.name,
        weeklyTarget: normalizedSplit.value.weeklyTarget,
        createdAt: new Date().toISOString(),
        exercises: normalizedSplit.value.exercises,
      };

      setSplits((current) => [...current, newSplit]);
      resetSplitForm(false);
      showSplitLibraryMessage({ type: 'success', text: `Added ${normalizedSplit.value.name}.` });
    }
  }

  function startEditingSplit(splitId) {
    const split = splits.find((item) => item.id === splitId);

    if (!split) {
      setSplitMessage({ type: 'error', text: 'Split not found.' });
      return;
    }

    openSplitPlanner(createSplitFormFromSplit(split), {
      editingId: split.id,
    });
  }

  function deleteSplit(splitId) {
    const split = splits.find((item) => item.id === splitId);

    if (!split) {
      return;
    }

    const linkedWorkoutCount = getLinkedSplitWorkoutCount(splitId);
    const historyMessage =
      linkedWorkoutCount > 0
        ? ' Existing workout history will be kept and shown with an unknown split label.'
        : '';
    openConfirmDialog({
      title: `Delete ${split.name}?`,
      description: historyMessage.trim() || 'This removes it from your split library.',
      confirmLabel: 'Delete split',
      cancelLabel: 'Cancel',
      tone: 'danger',
      onConfirm: () => {
        const previousSplits = splits;
        const previousWorkoutForm = workoutForm;
        const previousTemplates = templates;
        const previousEditingSplitId = editingSplitId;
        const previousSplitForm = splitForm;

        setSplits((current) => current.filter((item) => item.id !== splitId));
        setWorkoutForm((current) => ({
          ...current,
          splitId: current.splitId === splitId ? '' : current.splitId,
        }));
        setTemplates((current) =>
          current.map((template) => ({
            ...template,
            splitId: template.splitId === splitId ? '' : template.splitId,
          })),
        );

        if (editingSplitId === splitId) {
          resetSplitForm();
        } else {
          setSplitMessage({
            type: 'success',
            text:
              linkedWorkoutCount > 0
                ? `Deleted ${split.name}. Linked workout history was preserved.`
                : `Deleted ${split.name}.`,
          });
        }

        showUndoNotice(`Deleted ${split.name}.`, () => {
          setSplits(previousSplits);
          setWorkoutForm(previousWorkoutForm);
          setTemplates(previousTemplates);
          setEditingSplitId(previousEditingSplitId);
          setSplitForm(previousSplitForm);
          setSplitMessage({ type: 'success', text: `${split.name} restored.` });
        });

        return true;
      },
    });
  }

  function moveSavedSplit(splitId, direction) {
    setSplits((current) => {
      const fromIndex = current.findIndex((split) => split.id === splitId);

      if (fromIndex === -1) {
        return current;
      }

      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      return moveItem(current, fromIndex, toIndex);
    });
  }

  function updateWorkoutEntry(entryId, updater) {
    setWorkoutForm((current) => ({
      ...current,
      entries: current.entries.map((entry) => (entry.id === entryId ? updater(entry) : entry)),
    }));
  }

  function applyLatestWorkoutToEntry(entryId, latestSession) {
    updateWorkoutEntry(entryId, (currentEntry) => ({
      ...currentEntry,
      sets: latestSession.sets.map((set) => createSetFromValues(set.weight, set.reps)),
    }));
  }

  function handleWorkoutSplitChange(splitId) {
    setSelectedWorkoutTemplateId('');
    setWorkoutForm((current) => {
      if (!splitId) {
        return {
          ...current,
          splitId: '',
          notes: current.notes,
          entries: current.entries.length > 0 ? current.entries : [createWorkoutEntry()],
          skippedEntries: [],
        };
      }

      const split = splits.find((item) => item.id === splitId);

      if (!split) {
        return {
          ...current,
          splitId,
          skippedEntries: [],
        };
      }

      return {
        ...current,
        splitId,
        notes: current.notes,
        entries: buildWorkoutEntriesFromSplit(split),
        skippedEntries: [],
      };
    });
  }

  function clearWorkoutComposerSelection() {
    setEditingWorkoutId(null);
    setEditingTemplateId(null);
    setTemplateDraftName('');
    setSelectedWorkoutTemplateId('');
  }

  function openWorkoutComposer(
    nextForm,
    {
      message = { type: '', text: '' },
      selectedTemplateId = '',
      editingTemplateId = null,
      templateDraftName = '',
      editingWorkoutId = null,
      lastTemplateId,
    } = {},
  ) {
    setEditingWorkoutId(editingWorkoutId);
    setEditingTemplateId(editingTemplateId);
    setTemplateDraftName(templateDraftName);
    setSelectedWorkoutTemplateId(selectedTemplateId);

    if (typeof lastTemplateId === 'string') {
      setLastUsedTemplateId(lastTemplateId);
    }

    setWorkoutForm(nextForm);
    setWorkoutMessage(message);
    setActiveView('log');
  }

  function startWorkoutFromSplit(splitId = '') {
    if (!splitId) {
      openWorkoutComposer(createWorkoutForm());
      return;
    }

    const split = splits.find((item) => item.id === splitId);

    if (!split) {
      openWorkoutComposer(createWorkoutForm(), {
        message: {
          type: 'warning',
          text: 'Selected split is no longer available. Starting a custom workout instead.',
        },
      });
      return;
    }

    openWorkoutComposer({
      ...createWorkoutForm(),
      splitId,
      entries: buildWorkoutEntriesFromSplit(split),
    });
  }

  function resetWorkoutForm(clearMessage = true) {
    setWorkoutForm(createWorkoutForm());
    clearWorkoutComposerSelection();
    if (clearMessage) {
      setWorkoutMessage({ type: '', text: '' });
    }
  }

  function normalizeWorkoutEntries(form) {
    if (!isValidDateInput(form.date)) {
      return { error: 'Please enter a valid workout date.' };
    }

    if (form.entries.length === 0) {
      return {
        error: 'This workout has no exercises yet. Add one or choose a split with exercises.',
      };
    }

    const chosenExerciseIds = form.entries.map((entry) => entry.exerciseId).filter(Boolean);

    if (new Set(chosenExerciseIds).size !== chosenExerciseIds.length) {
      return { error: 'Use each exercise only once per workout entry.' };
    }

    const normalizedEntries = [];

    for (const entry of form.entries) {
      if (!entry.exerciseId) {
        return {
          error: `Exercise ${normalizedEntries.length + 1}: choose an exercise for this workout section.`,
        };
      }

      const normalizedSets = [];

      for (const [setIndex, set] of entry.sets.entries()) {
        const parsedSet = parseSet(set);

        if (parsedSet.error) {
          return {
            error: `Exercise ${normalizedEntries.length + 1}, set ${setIndex + 1}: ${parsedSet.error}`,
          };
        }

        if (parsedSet.empty) {
          continue;
        }

        normalizedSets.push(parsedSet.value);
      }

      if (normalizedSets.length === 0) {
        return {
          error: `Exercise ${normalizedEntries.length + 1}: add at least one completed set.`,
        };
      }

      normalizedEntries.push({
        exerciseId: entry.exerciseId,
        sets: normalizedSets,
      });
    }

    return {
      value: {
        date: form.date,
        splitId: form.splitId,
        notes: typeof form.notes === 'string' ? form.notes.trim() : '',
        mood: typeof form.mood === 'string' ? form.mood.trim() : '',
        effort: typeof form.effort === 'string' ? form.effort.trim() : '',
        entries: normalizedEntries,
      },
    };
  }

  function startEditingWorkout(workoutId) {
    const workout = workouts.find((item) => item.id === workoutId);

    if (!workout) {
      setWorkoutMessage({ type: 'error', text: 'Workout not found.' });
      return;
    }

    openWorkoutComposer(createWorkoutFormFromWorkout(workout), {
      editingWorkoutId: workout.id,
    });
  }

  function duplicateWorkout(workoutId) {
    const workout = workouts.find((item) => item.id === workoutId);

    if (!workout) {
      setWorkoutMessage({ type: 'error', text: 'Workout not found.' });
      return;
    }

    const duplicatedForm = createWorkoutFormFromWorkout(workout);

    openWorkoutComposer(
      {
        ...duplicatedForm,
        date: getTodayInputValue(),
        notes: '',
        mood: '',
        effort: '',
      },
      {
        message: {
          type: 'success',
          text: `Loaded a copy of ${formatDisplayDate(workout.date)}. Save it as a new workout when ready.`,
        },
      },
    );
  }

  function saveWorkoutAsTemplate(workoutId) {
    const workout = workouts.find((item) => item.id === workoutId);

    if (!workout) {
      showExerciseLibraryMessage({ type: 'error', text: 'Workout not found.' });
      return;
    }

    const sourceSplit = workout.splitId
      ? splits.find((split) => split.id === workout.splitId)
      : null;
    const baseName = sourceSplit
      ? `${sourceSplit.name} template`
      : `${formatDisplayDate(workout.date)} template`;
    const template = {
      id: createId(),
      name: getUniqueTemplateName(baseName),
      splitId: workout.splitId,
      notes: workout.notes ?? '',
      createdAt: new Date().toISOString(),
      entries: serializeTemplateEntries(workout.entries),
    };

    setTemplates((current) => [...current, template]);
    showExerciseLibraryMessage({ type: 'success', text: `Saved ${template.name}.` });
  }

  function saveCurrentWorkoutAsTemplate() {
    const normalizedWorkout = normalizeWorkoutEntries(workoutForm);

    if (normalizedWorkout.error) {
      setWorkoutMessage({ type: 'error', text: normalizedWorkout.error });
      return;
    }

    const suggestedName = getUniqueTemplateName(
      workoutForm.splitId ? `${getSplitName(workoutForm.splitId)} template` : 'Workout template',
    );
    openPromptDialog({
      title: 'Save template',
      description: 'Choose a unique template name before saving.',
      inputLabel: 'Template name',
      defaultValue: suggestedName,
      confirmLabel: 'Save template',
      cancelLabel: 'Cancel',
      onConfirm: (providedName) => {
        const templateName = providedName.trim();

        if (!templateName) {
          setWorkoutMessage({ type: 'error', text: 'Template name cannot be empty.' });
          return false;
        }

        if (
          templates.some(
            (template) => template.name.trim().toLowerCase() === templateName.toLowerCase(),
          )
        ) {
          setWorkoutMessage({ type: 'error', text: 'Template names should be unique.' });
          return false;
        }

        const template = {
          id: createId(),
          name: templateName,
          splitId: normalizedWorkout.value.splitId,
          notes: normalizedWorkout.value.notes,
          createdAt: new Date().toISOString(),
          entries: normalizedWorkout.value.entries,
        };

        setTemplates((current) => [...current, template]);
        setSelectedWorkoutTemplateId(template.id);
        setWorkoutMessage({ type: 'success', text: `Saved ${template.name}.` });
        return true;
      },
    });
  }

  function updateSelectedWorkoutTemplate() {
    if (!selectedWorkoutTemplateId) {
      setWorkoutMessage({ type: 'error', text: 'Choose a template before updating it.' });
      return;
    }

    const template = templates.find((item) => item.id === selectedWorkoutTemplateId);

    if (!template) {
      setSelectedWorkoutTemplateId('');
      setWorkoutMessage({ type: 'error', text: 'Selected template is no longer available.' });
      return;
    }

    const normalizedWorkout = normalizeWorkoutEntries(workoutForm);

    if (normalizedWorkout.error) {
      setWorkoutMessage({ type: 'error', text: normalizedWorkout.error });
      return;
    }

    setTemplates((current) =>
      current.map((item) =>
        item.id === selectedWorkoutTemplateId
          ? {
              ...item,
              splitId: normalizedWorkout.value.splitId,
              notes: normalizedWorkout.value.notes,
              entries: normalizedWorkout.value.entries,
            }
          : item,
      ),
    );
    setWorkoutMessage({ type: 'success', text: `Updated ${template.name}.` });
  }

  function startEditingWorkoutTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      showExerciseLibraryMessage({ type: 'error', text: 'Template not found.' });
      return;
    }

    openWorkoutComposer(createWorkoutFormFromTemplate(template), {
      editingTemplateId: template.id,
      templateDraftName: template.name,
      selectedTemplateId: template.id,
    });
  }

  function handleTemplateEditorSubmit(event) {
    event.preventDefault();
    setWorkoutMessage({ type: '', text: '' });

    if (!editingTemplateId) {
      setWorkoutMessage({ type: 'error', text: 'Choose a template before saving changes.' });
      return;
    }

    const template = templates.find((item) => item.id === editingTemplateId);

    if (!template) {
      resetWorkoutForm(false);
      setWorkoutMessage({ type: 'error', text: 'This template is no longer available.' });
      return;
    }

    const nextTemplateName = templateDraftName.trim();

    if (!nextTemplateName) {
      setWorkoutMessage({ type: 'error', text: 'Template name cannot be empty.' });
      return;
    }

    if (
      templates.some(
        (item) =>
          item.id !== editingTemplateId &&
          item.name.trim().toLowerCase() === nextTemplateName.toLowerCase(),
      )
    ) {
      setWorkoutMessage({ type: 'error', text: 'Template names should be unique.' });
      return;
    }

    const normalizedWorkout = normalizeWorkoutEntries(workoutForm);

    if (normalizedWorkout.error) {
      setWorkoutMessage({ type: 'error', text: normalizedWorkout.error });
      return;
    }

    setTemplates((current) =>
      current.map((item) =>
        item.id === editingTemplateId
          ? {
              ...item,
              name: nextTemplateName,
              splitId: normalizedWorkout.value.splitId,
              notes: normalizedWorkout.value.notes,
              entries: normalizedWorkout.value.entries,
            }
          : item,
      ),
    );
    resetWorkoutForm();
    showExerciseLibraryMessage({ type: 'success', text: `Updated ${nextTemplateName}.` });
  }

  function createSplitFromTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      showSplitLibraryMessage({ type: 'error', text: 'Template not found.' });
      return;
    }

    const sourceSplit = template.splitId
      ? splits.find((split) => split.id === template.splitId)
      : null;
    const fallbackName = sourceSplit
      ? `${sourceSplit.name} copy`
      : template.name.toLowerCase().includes('template')
        ? template.name.replace(/template/i, 'split')
        : `${template.name} split`;

    const { seededExercises, form } = buildSeededSplitForm(template.entries, fallbackName);

    openSplitPlanner(form, {
      message: {
        type: 'success',
        text: seededExercises.length
          ? 'Loaded template into the split planner.'
          : 'Loaded template into the split planner. Add exercises to finish the split.',
      },
    });
  }

  function createSplitFromWorkout(workoutId) {
    const workout = workouts.find((item) => item.id === workoutId);

    if (!workout) {
      showSplitLibraryMessage({ type: 'error', text: 'Workout not found.' });
      return;
    }

    const sourceSplit = workout.splitId
      ? splits.find((split) => split.id === workout.splitId)
      : null;
    const fallbackName = sourceSplit
      ? `${sourceSplit.name} copy`
      : `${formatDisplayDate(workout.date)} split`;

    const { seededExercises, form } = buildSeededSplitForm(workout.entries, fallbackName);

    openSplitPlanner(form, {
      message: {
        type: 'success',
        text: seededExercises.length
          ? 'Loaded workout as a new split template.'
          : 'Loaded workout into the split planner. Add exercises to finish the template.',
      },
    });
  }

  function loadWorkoutTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      setSelectedWorkoutTemplateId('');
      setWorkoutMessage({ type: 'error', text: 'Template not found.' });
      setActiveView('log');
      return;
    }

    openWorkoutComposer(createWorkoutFormFromTemplate(template), {
      lastTemplateId: template.id,
      selectedTemplateId: template.id,
      message: {
        type: 'success',
        text: `Loaded ${template.name}. Save it as a new workout when ready.`,
      },
    });
  }

  function deleteWorkoutTemplate(templateId) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    openConfirmDialog({
      title: `Delete template ${template.name}?`,
      description: 'You can undo this from the banner after deleting.',
      confirmLabel: 'Delete template',
      cancelLabel: 'Cancel',
      tone: 'danger',
      onConfirm: () => {
        const previousTemplates = templates;
        const previousSelectedTemplateId = selectedWorkoutTemplateId;
        const previousLastUsedTemplateId = lastUsedTemplateId;

        setTemplates((current) => current.filter((item) => item.id !== templateId));

        if (selectedWorkoutTemplateId === templateId) {
          setSelectedWorkoutTemplateId('');
        }

        if (lastUsedTemplateId === templateId) {
          setLastUsedTemplateId('');
        }

        showUndoNotice(`Deleted ${template.name}.`, () => {
          setTemplates(previousTemplates);
          setSelectedWorkoutTemplateId(previousSelectedTemplateId);
          setLastUsedTemplateId(previousLastUsedTemplateId);
          setExerciseMessage({ type: 'success', text: `${template.name} restored.` });
        });

        return true;
      },
    });
  }

  function startWorkoutFromLastUsedTemplate() {
    if (!lastUsedTemplateId) {
      startWorkoutFromSplit('');
      return;
    }

    const template = templates.find((item) => item.id === lastUsedTemplateId);

    if (!template) {
      openWorkoutComposer(createWorkoutForm(), {
        lastTemplateId: '',
        message: {
          type: 'warning',
          text: 'Last used template is no longer available. Starting a custom workout instead.',
        },
      });
      return;
    }

    loadWorkoutTemplate(template.id);
  }

  function repeatLatestWorkout() {
    if (!latestWorkout) {
      return;
    }

    duplicateWorkout(latestWorkout.id);
  }

  function deleteWorkout(workoutId) {
    const workout = workouts.find((item) => item.id === workoutId);

    if (!workout) {
      return;
    }

    openConfirmDialog({
      title: `Delete workout from ${formatDisplayDate(workout.date)}?`,
      description: 'You can undo this from the banner after deleting.',
      confirmLabel: 'Delete workout',
      cancelLabel: 'Cancel',
      tone: 'danger',
      onConfirm: () => {
        const previousWorkouts = workouts;
        const previousEditingWorkoutId = editingWorkoutId;
        const previousWorkoutForm = workoutForm;

        setWorkouts((current) => sortWorkouts(current.filter((item) => item.id !== workoutId)));

        if (editingWorkoutId === workoutId) {
          resetWorkoutForm();
        }

        showUndoNotice(`Deleted workout from ${formatDisplayDate(workout.date)}.`, () => {
          setWorkouts(previousWorkouts);
          setEditingWorkoutId(previousEditingWorkoutId);
          setWorkoutForm(previousWorkoutForm);
          setWorkoutMessage({ type: 'success', text: 'Workout restored.' });
        });

        return true;
      },
    });
  }

  function handleWorkoutSubmit(event, formOverride = null) {
    event.preventDefault();
    setWorkoutMessage({ type: '', text: '' });

    const submissionForm = formOverride ?? workoutForm;
    const normalizedWorkout = normalizeWorkoutEntries(submissionForm);

    if (normalizedWorkout.error) {
      setWorkoutMessage({ type: 'error', text: normalizedWorkout.error });
      return;
    }

    if (editingWorkoutId) {
      if (!workouts.some((workout) => workout.id === editingWorkoutId)) {
        resetWorkoutForm(false);
        setWorkoutMessage({ type: 'error', text: 'This workout is no longer available.' });
        return;
      }

      setWorkouts((current) =>
        sortWorkouts(
          current.map((workout) =>
            workout.id === editingWorkoutId
              ? {
                  ...workout,
                  date: normalizedWorkout.value.date,
                  splitId: normalizedWorkout.value.splitId,
                  notes: normalizedWorkout.value.notes,
                  mood: normalizedWorkout.value.mood,
                  effort: normalizedWorkout.value.effort,
                  entries: normalizedWorkout.value.entries,
                }
              : workout,
          ),
        ),
      );
      resetWorkoutForm();
      setWorkoutMessage({ type: 'success', text: 'Workout updated.' });
    } else {
      const newWorkout = {
        id: createId(),
        date: normalizedWorkout.value.date,
        splitId: normalizedWorkout.value.splitId,
        notes: normalizedWorkout.value.notes,
        mood: normalizedWorkout.value.mood,
        effort: normalizedWorkout.value.effort,
        createdAt: new Date().toISOString(),
        entries: normalizedWorkout.value.entries,
      };

      setWorkouts((current) => sortWorkouts([...current, newWorkout]));
      setWorkoutForm(createWorkoutForm());
      setSelectedWorkoutTemplateId('');
      setWorkoutMessage({ type: 'success', text: 'Workout saved.' });
    }

    setActiveView('history');
  }

  return {
    activeView,
    setActiveView,
    activeViewMeta,
    sidebarSummary,
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
    saveCustomExercise,
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
  };
}
