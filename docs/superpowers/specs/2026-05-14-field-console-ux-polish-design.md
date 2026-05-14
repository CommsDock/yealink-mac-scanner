# Field Console UX Polish Design

## Goal

Polish the Yealink MAC Scanner into a more modern, production-ready field console while preserving the working scan, manual entry, email, CSV export, and batch review flows.

## Direction

Use the Field Console direction:

- Scanner remains the dominant surface.
- Progress and session status become easier to read at a glance.
- Panels feel cleaner and more intentional.
- Buttons feel more modern and action-oriented.
- Mobile remains the primary layout, with desktop becoming a comfortable expanded version rather than a separate dashboard.

## Visual Changes

Update the current utilitarian style without changing the core app structure.

- Tighten the hero so it takes less vertical space on mobile.
- Replace the circular progress ring with a stronger compact progress tile that works better on small screens.
- Make the scanner panel feel like the primary work area with a deeper camera stage, clearer target guide, and stronger action button.
- Modernize panels with softer borders, cleaner shadows, and more deliberate spacing.
- Make metric cards more compact and easier to scan.
- Make batch actions clearer: `Email list` should feel primary-adjacent, while `Export CSV` remains a secondary utility.
- Improve captured MAC rows with better hierarchy and a cleaner remove button.
- Keep border radius at 8px for app panels/cards/buttons unless a circular or pill element is clearly functional.

## Interaction Rules

No behavior changes are intended in this polish pass.

Existing behavior must remain:

- Scan flow and two-read confidence behavior.
- Manual MAC entry.
- Email list modal and SES-backed send.
- CSV export.
- Session accuracy summary.
- Batch persistence and remove action.
- Mobile camera support over HTTPS.

## Responsive Design

Mobile layout should feel like the main product experience.

- Single-column flow remains the default on phone.
- Scanner appears before metrics/manual/batch.
- Touch targets stay at least 44px high.
- Text must not overflow buttons or cards.
- Desktop can use wider spacing and better side-by-side alignment only where it does not complicate mobile.

## Testing

Automated tests should continue to pass without major behavioral rewrites. Add or adjust tests only if markup changes affect existing queries.

Verification:

- `npm.cmd run test -- --run`
- `npm.cmd run build`
- Browser check on mobile-width and desktop-width layouts
- Production deploy can follow the existing Docker update flow

## Out Of Scope

- Changing scanner detection logic.
- Adding new email provider behavior.
- Adding authentication.
- Reworking deployment architecture.
- Introducing a design system library.
