import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const STORAGE_KEY = 'workout-tracker-data-v1';

function runBuild() {
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build command failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

function findInstalledChromiumShell() {
  const cacheDir = path.join(process.env.HOME ?? '', 'Library/Caches/ms-playwright');

  if (!cacheDir || !fs.existsSync(cacheDir)) {
    return undefined;
  }

  const directories = fs
    .readdirSync(cacheDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium_headless_shell-'))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const directoryName of directories) {
    const executablePath = path.join(
      cacheDir,
      directoryName,
      'chrome-headless-shell-mac-arm64/chrome-headless-shell',
    );

    if (fs.existsSync(executablePath)) {
      return executablePath;
    }
  }

  return undefined;
}

function getDistDirectory() {
  const distDirectory = path.resolve(process.cwd(), 'dist');
  const indexPath = path.join(distDirectory, 'index.html');

  if (!fs.existsSync(indexPath)) {
    throw new Error('dist/index.html was not found. Run build first.');
  }

  return distDirectory;
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.js')) return 'text/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.json')) return 'application/json';
  return 'text/plain';
}

async function attachLocalDistRouting(page, distDirectory) {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    if (requestUrl.hostname !== 'app.local') {
      await route.abort();
      return;
    }

    const normalizedPath =
      requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname.replace(/\/{2,}/g, '/');
    const relativePath = normalizedPath.replace(/^\/+/, '');
    const resolvedPath = path.join(distDirectory, relativePath);

    if (!resolvedPath.startsWith(distDirectory) || !fs.existsSync(resolvedPath)) {
      await route.fulfill({ status: 404, body: 'Not found' });
      return;
    }

    await route.fulfill({
      status: 200,
      body: fs.readFileSync(resolvedPath),
      contentType: getContentType(resolvedPath),
    });
  });
}

function seedData() {
  return {
    exercises: [
      { id: 'bench', name: 'Bench Press', createdAt: '2026-04-01T10:00:00.000Z' },
      { id: 'row', name: 'Barbell Row', createdAt: '2026-04-01T10:00:00.000Z' },
    ],
    splits: [
      {
        id: 'push-day',
        name: 'Push Day',
        weeklyTarget: 2,
        createdAt: '2026-04-01T10:00:00.000Z',
        exercises: [{ id: 'split-1', exerciseId: 'bench', defaultSets: 2 }],
      },
    ],
    templates: [
      {
        id: 'template-1',
        name: 'Push Template',
        splitId: 'push-day',
        notes: 'Controlled reps.',
        createdAt: '2026-04-02T10:00:00.000Z',
        entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
      },
    ],
    workouts: [
      {
        id: 'workout-1',
        date: '2026-04-10',
        splitId: 'push-day',
        createdAt: '2026-04-10T10:00:00.000Z',
        entries: [{ exerciseId: 'bench', sets: [{ weight: 82.5, reps: 7 }] }],
      },
    ],
    bodyweightEntries: [
      { id: 'bw-1', date: '2026-04-12', weight: 82.4, createdAt: '2026-04-12T07:00:00.000Z' },
    ],
    weeklyWorkoutGoal: 4,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmokeScenario(page) {
  async function navigateToView(view) {
    await page.evaluate((nextView) => {
      window.location.hash = `#/${nextView}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, view);
    await page.waitForSelector(`iframe[title="Stitch ${view}"]`);
    await page.waitForTimeout(250);
  }

  async function assertNoUnwiredInteractiveControls(view) {
    await navigateToView(view);
    const suspiciousControls = await page.evaluate((currentView) => {
      const frame = document.querySelector(`iframe[title="Stitch ${currentView}"]`);
      const doc = frame?.contentDocument;
      if (!doc) {
        return [`${currentView}: frame document missing`];
      }

      const navigationLabels = new Set([
        'dashboard',
        'workouts',
        'log',
        'exercises',
        'history',
        'analytics',
        'progress',
        'settings',
      ]);
      const intentionallyHandledIcons = new Set([
        'arrow_back',
        'notifications',
        'settings',
        'star',
        'more_horiz',
        'more_vert',
        'info',
      ]);
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      };
      const normalize = (text) => (text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

      return [
        ...doc.querySelectorAll('button,a,[role="button"],.cursor-pointer,[data-codex-action]'),
      ]
        .filter(isVisible)
        .filter((element) => {
          const text = normalize(
            element.innerText || element.textContent || element.getAttribute('aria-label'),
          );
          const isNavigation =
            Boolean(element.closest('nav,header,aside')) || navigationLabels.has(text);
          const isFormControl = ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
          const hasAction = Boolean(element.getAttribute('data-codex-action'));
          const isKnownIcon = intentionallyHandledIcons.has(text);
          const isDisabled = Boolean(
            element.disabled || element.getAttribute('aria-disabled') === 'true',
          );

          return !isDisabled && !isFormControl && !isNavigation && !hasAction && !isKnownIcon;
        })
        .map((element) => {
          const text = normalize(
            element.innerText || element.textContent || element.getAttribute('aria-label'),
          );
          return `${currentView}: <${element.tagName.toLowerCase()}> "${text}"`;
        });
    }, view);

    assert(
      suspiciousControls.length === 0,
      `Unwired interactive controls found:\n${suspiciousControls.join('\n')}`,
    );
  }

  await page.goto('http://app.local/', { waitUntil: 'networkidle' });
  await page.waitForSelector('iframe.stitch-frame');

  const dashboardButtonCount = await page.getByRole('button', { name: 'dashboard' }).count();
  assert(dashboardButtonCount === 1, 'Dashboard navigation button was not found.');

  await navigateToView('log');
  const logFrame = page.frameLocator('iframe[title="Stitch log"]');
  const initialWorkoutCount = await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return 0;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.workouts) ? parsed.workouts.length : 0;
    } catch {
      return 0;
    }
  }, STORAGE_KEY);

  const logInputs = logFrame.locator('input[type="number"]');
  const logInputCount = await logInputs.count();
  assert(logInputCount >= 2, 'Log workout screen did not render weight/reps number inputs.');
  const loadSplitButton = logFrame.locator('[data-codex-action="log-load-split"]').first();
  await loadSplitButton.waitFor({ state: 'visible' });
  await loadSplitButton.click();
  await logInputs.nth(0).fill('85');
  await logInputs.nth(1).fill('6');
  const finishButton = logFrame.locator('[data-codex-action="log-finish-workout"]').first();
  await finishButton.waitFor({ state: 'visible' });
  await finishButton.click();
  let workoutSaved = true;
  try {
    await page.waitForFunction(
      ({ storageKey, previousCount }) => {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
          return false;
        }
        try {
          const parsed = JSON.parse(raw);
          const nextCount = Array.isArray(parsed?.workouts) ? parsed.workouts.length : 0;
          return nextCount > previousCount;
        } catch {
          return false;
        }
      },
      { storageKey: STORAGE_KEY, previousCount: initialWorkoutCount },
      { timeout: 15000 },
    );
  } catch {
    workoutSaved = false;
  }

  if (!workoutSaved) {
    const noticeText = (
      await page
        .locator('.stitch-action-notice')
        .first()
        .textContent()
        .catch(() => '')
    )
      ?.trim()
      .replace(/\s+/g, ' ');
    const debugState = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        hash: window.location.hash,
        workoutCount: Array.isArray(parsed?.workouts) ? parsed.workouts.length : 0,
      };
    }, STORAGE_KEY);

    throw new Error(
      `Workout save did not persist. Notice="${noticeText || 'none'}", hash="${debugState.hash}", workouts=${debugState.workoutCount}`,
    );
  }

  await navigateToView('history');
  const historyFrame = page.frameLocator('iframe[title="Stitch history"]');
  await historyFrame.locator('[data-codex-history-live="desktop"]').waitFor({ state: 'visible' });
  await historyFrame
    .locator('[data-codex-history-live="desktop"] [data-codex-action="history-open-workout"]')
    .first()
    .click();
  await historyFrame
    .locator('[data-codex-history-modal]:not(.hidden)')
    .waitFor({ state: 'visible' });
  const detailSetRows = await historyFrame
    .locator('[data-codex-history-modal] li')
    .filter({ hasText: /Set/i })
    .count();
  assert(detailSetRows > 0, 'Workout details modal did not render any set details.');
  await page.evaluate(() => {
    const frame = document.querySelector('iframe[title="Stitch history"]');
    const closeButton = frame?.contentDocument?.querySelector(
      '[data-codex-history-modal] [aria-label="Schließen"]',
    );
    if (closeButton instanceof HTMLButtonElement) {
      closeButton.click();
    }
  });

  await navigateToView('exercises');
  const exercisesFrame = page.frameLocator('iframe[title="Stitch exercises"]');
  await exercisesFrame.locator('[data-codex-action="exercise-filter-back"]').waitFor({
    state: 'visible',
  });
  await exercisesFrame.locator('[data-codex-action="exercise-filter-back"]').click();
  const visibleBackExerciseNames = await page.evaluate(() => {
    const frame = document.querySelector('iframe[title="Stitch exercises"]');
    const doc = frame?.contentDocument;
    if (!doc) return [];

    return [...doc.querySelectorAll('[data-codex-exercise-card]')]
      .filter((card) => getComputedStyle(card).display !== 'none')
      .map((card) => card.querySelector('h3,h4')?.textContent?.trim())
      .filter(Boolean);
  });
  assert(
    visibleBackExerciseNames.some((name) => /pullups/i.test(name)),
    'Back exercise filter did not keep the back exercise card visible.',
  );
  assert(
    visibleBackExerciseNames.every((name) => !/squats/i.test(name)),
    'Back exercise filter left unrelated leg exercise cards visible.',
  );

  await exercisesFrame.locator('[data-codex-action="exercise-filter-all exercises"]').click();
  await exercisesFrame
    .locator('[data-codex-action="exercise-open-details"]')
    .filter({ visible: true })
    .first()
    .click();
  await exercisesFrame
    .locator('[data-codex-exercise-modal]:not(.hidden)')
    .waitFor({ state: 'visible' });
  const exerciseDetailTitle = await exercisesFrame
    .locator('[data-codex-exercise-modal] h3')
    .first()
    .textContent();
  assert(Boolean(exerciseDetailTitle?.trim()), 'Exercise details modal did not render a title.');
  await page.evaluate(() => {
    const frame = document.querySelector('iframe[title="Stitch exercises"]');
    const closeButton = frame?.contentDocument?.querySelector(
      '[data-codex-exercise-modal] [data-codex-action="exercise-close-modal"]',
    );
    closeButton?.click();
  });

  await exercisesFrame.locator('[data-codex-action="exercise-add-custom"]').click();
  await exercisesFrame.locator('[data-codex-custom-exercise-name]').fill('Cable Fly Smoke');
  await exercisesFrame.locator('[data-codex-custom-exercise-weight]').fill('20');
  await exercisesFrame.locator('[data-codex-custom-exercise-rep-min]').fill('10');
  await exercisesFrame.locator('[data-codex-custom-exercise-rep-max]').fill('15');
  await exercisesFrame.locator('[data-codex-action="exercise-save-custom"]').click();
  await page.waitForFunction(
    (storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed.exercises?.some((exercise) => exercise.name === 'Cable Fly Smoke');
    },
    STORAGE_KEY,
    { timeout: 10000 },
  );

  await navigateToView('settings');
  const settingsFrame = page.frameLocator('iframe[title="Stitch settings"]');
  await settingsFrame
    .getByRole('button', { name: /weekly|monthly/i })
    .first()
    .waitFor({
      state: 'visible',
    });

  await navigateToView('progress');
  const progressFrame = page.frameLocator('iframe[title="Stitch progress"]');
  await progressFrame
    .getByText(/progress|analytics|volume/i)
    .first()
    .waitFor({ state: 'visible' });

  for (const view of ['dashboard', 'log', 'history', 'exercises', 'progress', 'settings']) {
    await assertNoUnwiredInteractiveControls(view);
  }
}

async function run() {
  await runBuild();
  const distDirectory = getDistDirectory();
  const executablePath = findInstalledChromiumShell();
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(
    ({ storageKey, storageValue }) => {
      if (!window.localStorage.getItem(storageKey)) {
        window.localStorage.setItem(storageKey, storageValue);
      }
    },
    { storageKey: STORAGE_KEY, storageValue: JSON.stringify(seedData()) },
  );

  await attachLocalDistRouting(page, distDirectory);
  await runSmokeScenario(page);

  await browser.close();
  console.log('E2E smoke checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
