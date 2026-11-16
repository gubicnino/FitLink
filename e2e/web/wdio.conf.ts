import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SevereServiceError } from 'webdriverio';

const HERE = dirname(fileURLToPath(import.meta.url));
const E2E_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(E2E_ROOT, '..');

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
export const DOWNLOAD_DIR = resolve(E2E_ROOT, 'downloads');
const REPORTS_DIR = resolve(E2E_ROOT, 'reports');
const HEADLESS = process.env.E2E_HEADED !== '1';

export const config: WebdriverIO.Config = {
  runner: 'local',
  // Scenariji spreminjajo iste testne podatke, zato tečejo zaporedno.
  specs: ['./specs/**/*.spec.ts'],
  maxInstances: 1,

  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: [
          ...(HEADLESS ? ['--headless=new'] : []),
          '--window-size=1440,900',
          '--no-sandbox',
          '--disable-dev-shm-usage',
        ],
        prefs: {
          'download.default_directory': DOWNLOAD_DIR,
          'download.prompt_for_download': false,
          'profile.default_content_setting_values.automatic_downloads': 1,
        },
      },
    },
  ],

  logLevel: 'warn',
  baseUrl: BASE_URL,
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 2,

  framework: 'mocha',
  // Koraki scenarija so odvisni drug od drugega – ob prvi napaki se scenarij ustavi.
  mochaOpts: { ui: 'bdd', timeout: 60_000, bail: true },

  reporters: [
    'spec',
    [
      'junit',
      {
        outputDir: resolve(REPORTS_DIR, 'junit'),
        outputFileFormat: ({ cid }: { cid: string }) => `e2e-web-${cid}.xml`,
      },
    ],
  ],

  /** Pred zagonom: počisti izhodne mape, preveri webapp, ponastavi testne podatke. */
  onPrepare: async () => {
    rmSync(REPORTS_DIR, { recursive: true, force: true });
    rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
    mkdirSync(resolve(REPORTS_DIR, 'screenshots'), { recursive: true });
    mkdirSync(DOWNLOAD_DIR, { recursive: true });

    // SevereServiceError prekine celoten zagon – navadna napaka v onPrepare se samo zabeleži.
    try {
      await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    } catch {
      throw new SevereServiceError(
        `Webapp ni dosegljiv na ${BASE_URL}. Zaženi ga: cd webapp && npm run dev`,
      );
    }

    if (process.env.E2E_SKIP_SEED !== '1') {
      try {
        execFileSync(process.execPath, ['seed.mjs'], {
          cwd: resolve(REPO_ROOT, 'scripts', 'seed-test-data'),
          stdio: 'inherit',
        });
      } catch {
        throw new SevereServiceError('Priprava testnih podatkov (seed) ni uspela – glej izpis zgoraj.');
      }
    }
  },

  /** Posnetek zaslona ob neuspelem koraku. */
  afterTest: async (test, _context, { passed }) => {
    if (passed) return;
    const name = `${test.parent} ${test.title}`.replace(/[^\w-]+/g, '_').slice(0, 120);
    await browser.saveScreenshot(resolve(REPORTS_DIR, 'screenshots', `${name}.png`));
  },
};
