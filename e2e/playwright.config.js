import { defineConfig, devices } from '@playwright/test';
import { DSN_COLLECTEUR } from './fixtures/collecteurSmtp';

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* `list` pour le retour en direct dans le terminal, `html` pour le rapport
     détaillé consultable après coup (npm run report). */
  reporter: [['list'], ['html', { open: 'never' }]],

  /* Ouvre la boîte mail de test (collecteur SMTP local) avant la campagne, et la
     referme après. Voir global-setup.js et fixtures/collecteurSmtp.js. */
  globalSetup: './global-setup.js',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Front Vite : les tests n'utilisent que des chemins relatifs (page.goto('/login')). */
    baseURL: 'http://localhost:5173',

    /* Preuves d'exécution en cas d'échec — indispensables pour analyser une
       anomalie sans avoir à rejouer le test à la main. */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Décommenter pour élargir la couverture multi-navigateurs. */
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Démarre l'application avant les tests. `reuseExistingServer` réutilise les
     serveurs déjà lancés (make start-front / make start-back) au lieu d'en
     ouvrir de nouveaux. */
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'symfony server:start',
      cwd: '../backend',
      // Le serveur Symfony local sert en HTTPS avec un certificat auto-signé.
      url: 'https://localhost:8000/api',
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        /* Les tests déclenchent de vrais envois de mail (confirmation
           d'inscription, réinitialisation de mot de passe). On redirige tout le
           courrier vers la boîte mail de test, ouverte pour la durée de la
           campagne : rien ne part sur Internet, et les tests peuvent lire les
           messages reçus (fixtures/boiteMail.js) — c'est ce qui permet de
           vérifier un parcours qui passe par la boîte mail de l'utilisateur.

           ATTENTION : cette variable n'a d'effet que si Playwright démarre
           lui-même le backend. Si un serveur tourne déjà (make start-back),
           `reuseExistingServer` le réutilise tel quel, avec le MAILER_DSN de
           backend/.env.local : l'email partira pour de bon et les tests qui
           l'attendent échoueront. Arrêter ce serveur, ou le démarrer avec le DSN
           du collecteur. */
        MAILER_DSN: process.env.E2E_MAILER_DSN ?? DSN_COLLECTEUR,
      },
    },
  ],
});
