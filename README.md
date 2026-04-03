# Workout Tracker

A polished local-first workout tracker built with React and Vite.

It combines split-based planning, reusable templates, fast daily logging, exercise and split progress, local data portability, and a premium dashboard UI in one app.

## Highlights

- Premium dashboard UI with left sidebar navigation and dark / light / system themes
- Exercise library with reorder, rename, delete, and preserved history references
- Split planner for routines like `Push`, `Pull`, and `Legs`
- Workout templates that can be created, edited, duplicated, reordered, and reused
- Fast workout logging with split loading, prebuilt sets, quick progression buttons, and rest timer
- Session notes plus lightweight `mood` / `effort` context
- Workout history with calendar view, PR timeline, duplicate, template-save, and split-seeding flows
- Progress tracking for both exercises and splits with charts, highlights, and 7 / 30 / 90 day filters
- JSON export/import, merge import, and CSV export for workout history
- Undo for destructive delete actions

## Core Flows

### 1. Build your exercise library

- Add exercises
- Reorder, rename, or delete exercises later
- Keep workout history even if an exercise is deleted

### 2. Create reusable workout splits

- Create splits such as `Push`, `Pull`, or `Legs`
- Assign existing exercises to each split
- Define a default number of sets per exercise
- Reorder split exercises
- Keep the split flexible enough for day-to-day changes

### 3. Save reusable templates

- Save a finished workout as a template
- Edit, rename, duplicate, delete, or reorder templates
- Load templates directly from the library, dashboard, or logging flow
- Convert a template into a split when needed

### 4. Log workouts quickly

- Pick a date
- Choose a split, template, or custom workout
- Auto-load exercises and default set rows from the selected split
- Use quick set actions such as `+2.5 kg`, `+5 kg`, `+1 rep`
- Use a rest timer directly inside the logging flow
- Skip individual exercises for that session without changing the split itself
- Add optional notes, mood, and effort context

### 5. Review and improve

- Browse full workout history
- Inspect calendar activity and PR timeline
- Track progress per exercise and per split over time
- See PRs for weight, reps, and total volume
- Compare recent ranges with simple charts

## Data Model

All app data is stored locally in the browser via `localStorage`.

The app currently stores:

- `exercises`
- `splits`
- `templates`
- `workouts`

Workouts may include:

- `splitId`
- `notes`
- `mood`
- `effort`

Splits reference exercises by `exerciseId`, and templates store reusable workout entries plus an optional linked split.

If an exercise or split is deleted later, linked workout history is preserved rather than removed.

## Tech Stack

- React 18
- Vite
- Vitest
- Testing Library
- Local browser storage (`localStorage`)

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```bash
http://localhost:5173
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test -- --run
```

## Manual Test Checklist

- Create a few exercises and confirm duplicate names are rejected
- Create a split and assign exercises with different default set counts
- Save a workout as a template, then reuse and edit it
- Log a workout from a split and verify set rows are created automatically
- Use quick set actions and the rest timer in the logging form
- Skip one split exercise, restore it, and save the workout
- Edit, duplicate, and delete a workout from history
- Check exercise and split progress, PR tags, and 7 / 30 / 90 day filters
- Open the history calendar and inspect a day with workouts
- Export all data as JSON, test import preview, then try merge import
- Export workout history as CSV
- Switch between `System`, `Light`, and `Dark` themes

## Current Scope

This project is intentionally simple and local-first.

There is currently:

- no backend
- no user accounts
- no cloud sync

That makes it easy to run locally, iterate quickly, and extend later.
