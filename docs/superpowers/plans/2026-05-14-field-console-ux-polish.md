# Field Console UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the existing Yealink MAC Scanner into a modern Field Console interface without changing behavior.

**Architecture:** Keep the React component structure intact and implement the polish through scoped markup class additions plus CSS updates. Preserve existing tests and adjust only if accessible text or roles change.

**Tech Stack:** React, TypeScript, CSS, Vitest, Vite.

---

## File Structure

- `src/App.tsx`: add field-console class hooks and adjust progress tile markup.
- `src/styles.css`: implement the Field Console visual system, responsive layout, panels, buttons, metrics, batch rows, modal, and toast polish.
- `src/App.test.tsx`: keep existing behavior tests passing; adjust only if markup affects status assertions.

## Tasks

### Task 1: Field Console Shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] Change the progress surface from a circular ring to a compact progress tile using the existing `progress-ring` element and CSS class.
- [x] Add subtle field-console shell styling through CSS only.
- [x] Run `npm.cmd run test -- --run`.

### Task 2: Scanner And Panels

**Files:**
- Modify: `src/styles.css`

- [x] Make the scanner panel visually dominant with stronger camera stage, clearer guide, and modern primary button styling.
- [x] Modernize shared panels, metrics, manual entry, and batch list rows.
- [x] Run `npm.cmd run build`.

### Task 3: Full Verification

**Files:**
- Modify only if verification finds issues.

- [x] Run `npm.cmd run test -- --run`.
- [x] Run `npm.cmd run build`.
- [ ] Commit and push the polish.
