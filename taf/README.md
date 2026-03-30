# TAF (Test Automation Framework)

This folder contains Playwright + TypeScript tests for the Shopping Cart (API + UI).

## Prerequisites

- Node.js (LTS recommended)

## Install

From the `taf/` folder:

```bash
npm install
npx playwright install
```

## Run tests

From the `taf/` folder (these match `package.json` scripts):

- **Run all tests (all projects)**:

```bash
npm test
```

- **Run API tests only**:

```bash
npm run test:api
```

- **Run UI tests only (headless)**:

```bash
npm run test:ui
```

- **Run UI tests only (headed / visible browser)**:

```bash
npm run test:ui:headed
```

## View HTML report

After a test run:

```bash
npm run test:report
```

