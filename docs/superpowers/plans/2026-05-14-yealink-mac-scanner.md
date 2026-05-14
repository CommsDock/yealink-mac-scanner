# Yealink MAC Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first browser app that scans Yealink labels and captures validated MAC addresses with confirm/retry review, optimized for a 50-handset working batch without hard-capping reuse.

**Architecture:** React + Vite + TypeScript app with pure domain helpers for MAC parsing and batch state, plus a camera scanner component isolated behind a small browser API adapter. Local storage keeps the current batch safe during refreshes.

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS, browser `BarcodeDetector` API, ZXing fallback.

---

## File Structure

- `package.json`: scripts and dependencies.
- `index.html`: Vite app entry document.
- `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.setup.ts`: TypeScript, Vite, and test configuration.
- `src/main.tsx`: React entrypoint.
- `src/App.tsx`: application shell, batch workflow, manual add, copy/export actions.
- `src/App.test.tsx`: UI workflow tests.
- `src/components/ScannerView.tsx`: camera scanner, target-zone guidance, repeat-read confidence flow, candidate review, confirm/retry UI, unsupported scanner fallback.
- `src/domain/mac.ts`: MAC parsing, formatting, warn-only Yealink OUI recognition, CSV export helpers.
- `src/domain/mac.test.ts`: TDD coverage for MAC behavior.
- `src/domain/batch.ts`: batch add/remove/load/save helpers.
- `src/domain/batch.test.ts`: TDD coverage for duplicate and persistence behavior.
- `src/styles.css`: mobile-first product UI.

## Tasks

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/main.tsx`

- [ ] Create the Vite React TypeScript project files.
- [ ] Install dependencies with `npm.cmd install`.
- [ ] Run `npm.cmd run test -- --run` and expect the test runner to start once tests exist.

### Task 2: MAC Domain

**Files:**
- Create: `src/domain/mac.test.ts`
- Create: `src/domain/mac.ts`

- [ ] Write failing tests for accepting `44DBD26FB9EF`, `MAC 44DBD26FB9EF`, colon-separated, and hyphen-separated values.
- [ ] Write failing tests for rejecting EAN, UPC, serial-like values, and invalid hex.
- [ ] Write failing tests for warn-only known Yealink OUI recognition.
- [ ] Write failing tests for CSV export escaping and timestamp output.
- [ ] Implement `parseMacCandidate`, `formatMac`, `isKnownYealinkMac`, and `toCsv`.
- [ ] Run `npm.cmd run test -- --run src/domain/mac.test.ts` and expect all MAC tests to pass.

### Task 3: Batch Domain

**Files:**
- Create: `src/domain/batch.test.ts`
- Create: `src/domain/batch.ts`

- [ ] Write failing tests for adding a new MAC with timestamp.
- [ ] Write failing tests for preventing duplicates.
- [ ] Write failing tests for removing an item by id.
- [ ] Write failing tests for serializing and loading valid persisted batch data.
- [ ] Implement `addCapture`, `removeCapture`, `serializeBatch`, and `loadBatch`.
- [ ] Run `npm.cmd run test -- --run src/domain/batch.test.ts` and expect all batch tests to pass.

### Task 4: Scanner Component

**Files:**
- Create: `src/components/ScannerView.tsx`
- Create: `src/components/ScannerView.test.tsx`

- [ ] Write failing tests for unsupported scanner fallback UI.
- [ ] Write failing tests for detected valid candidate showing confirm/retry.
- [ ] Write failing tests for requiring the same MAC twice before confirm.
- [ ] Write failing tests for non-Yealink OUI warning that still permits confirm.
- [ ] Write failing tests for invalid detections continuing the scan.
- [ ] Write failing tests for auto-resume after confirmation and opt-out pause mode.
- [ ] Implement camera lifecycle, detection loop, confirm, and retry states.
- [ ] Run `npm.cmd run test -- --run src/components/ScannerView.test.tsx` and expect scanner tests to pass.

### Task 5: App Shell

**Files:**
- Create: `src/App.test.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] Write failing tests for manual add, duplicate blocking, remove, and progress count.
- [ ] Write failing tests for copy/export controls.
- [ ] Write failing tests for the session accuracy summary.
- [ ] Implement the mobile-first UI and wire domain helpers into React state.
- [ ] Run `npm.cmd run test -- --run src/App.test.tsx` and expect app tests to pass.

### Task 6: Verification

**Files:**
- Modify only if verification finds issues.

- [ ] Run `npm.cmd run test -- --run`.
- [ ] Run `npm.cmd run build`.
- [ ] Start the dev server with `npm.cmd run dev`.
- [ ] Verify the app in the browser at mobile and desktop sizes.
- [ ] Confirm manual add, duplicate rejection, removal, CSV export, copy list, and scanner unsupported UI.

## Self-Review

Spec coverage: all scanner workflow, validation, duplicate handling, persistence, manual fallback, export, and mobile UI requirements map to tasks above.

Placeholder scan: no deferred behavior is left as a placeholder; the only postponed capability is the explicitly scoped future ZXing fallback.

Type consistency: domain function names are stable across tests, implementation, and UI wiring.
