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
  await page.goto('http://app.local/', { waitUntil: 'networkidle' });
  await page.waitForSelector('main, .app-main');

  const dashboardTitle = await page.getByRole('button', { name: 'dashboard' }).count();
  assert(dashboardTitle === 1, 'Dashboard navigation button was not found.');

  await page.getByRole('button', { name: 'Log workout' }).click();
  const workoutForm = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: /Save workout|Save changes/i }) })
    .first();

  const exerciseSelect = workoutForm
    .locator('label.field')
    .filter({ has: page.locator('span', { hasText: /^Exercise$/ }) })
    .locator('select')
    .first();
  const selectableExerciseIds = await exerciseSelect
    .locator('option')
    .evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
  assert(selectableExerciseIds.length > 0, 'No exercise options were available in workout form.');
  await exerciseSelect.selectOption(selectableExerciseIds[0]);
  await workoutForm.getByLabel('Weight').first().fill('85');
  await workoutForm.getByLabel('Reps').first().fill('6');
  await page.getByRole('button', { name: 'Save workout' }).click();
  await page.getByText('Past sessions').waitFor({ state: 'visible' });

  await page.getByRole('button', { name: 'exercises' }).click();
  await page.getByRole('button', { name: 'Rename template Push Template' }).click();
  const renameDialog = page.getByRole('dialog', { name: 'Rename template' });
  await renameDialog.waitFor();
  await renameDialog.getByLabel('Template name').fill('Push Template A');
  await renameDialog.getByRole('button', { name: 'Rename template' }).click();
  await page.getByText('Renamed template to Push Template A.').waitFor({ state: 'visible' });

  await page.getByRole('button', { name: 'settings' }).click();
  const dateInputValue = await page.getByLabel('Check-in date').inputValue();
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(dateInputValue),
    'Bodyweight date input did not render a valid date.',
  );

  await page.getByRole('button', { name: 'progress' }).click();
  await page.getByRole('heading', { name: 'Exercise progress' }).waitFor({ state: 'visible' });
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
      window.localStorage.setItem(storageKey, storageValue);
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
