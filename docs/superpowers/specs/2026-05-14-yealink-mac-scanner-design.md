# Yealink MAC Scanner Design

## Goal

Build a mobile-first browser web app for scanning Yealink handset labels and capturing 50 MAC addresses accurately.

## Label Behavior

The sample Yealink label has multiple one-dimensional barcodes: SN, MAC, EAN, and UPC. The MAC barcode is labelled `MAC:` and has human-readable text like `MAC 44DBD26FB9EF`.

The scanner must only accept valid MAC candidates and must reject numeric EAN, UPC, and serial-number scans.

## Workflow

1. The user opens the web app on a mobile device.
2. The user taps `Start scanning`.
3. The app requests camera access and scans the Yealink MAC barcode.
4. Non-MAC barcodes are ignored while scanning continues.
5. When a valid MAC candidate is detected once, the app shows a verifying state and asks the user to hold steady.
6. The same MAC must be read a second time before scanning pauses for confirmation.
7. The app shows a review panel with the normalized MAC, the raw scanned value, and any duplicate or Yealink OUI warning.
8. The user taps `Confirm` to add it or `Retry` to resume scanning.
9. By default, the app returns to active scanning after confirmation so the next handset is ready.
10. The user can turn off `Auto-resume after confirm` when they want to pause after each confirmation.
11. The batch list tracks progress toward a 50-handset working target, but capture is not hard-capped.
12. The user can copy or export the final list.
13. The session summary tracks confirmed captures, manual adds, duplicate detections, ignored numeric scans, invalid MAC reads, and retries.

## Validation

The app strips spaces, colons, hyphens, and a leading `MAC` label. It requires exactly 12 hexadecimal characters and formats accepted values as uppercase colon-separated MAC addresses.

Examples:

- `44DBD26FB9EF` becomes `44:DB:D2:6F:B9:EF`
- `MAC 44DBD26FB9EF` becomes `44:DB:D2:6F:B9:EF`
- `6938818304314` is rejected
- `301203GO80005848` is rejected

Known Yealink OUI prefixes are used as a warn-only confidence check. A valid MAC outside the local known-prefix list is still confirmable, but the review panel warns the operator to confirm the handset is expected. The seed list includes public Yealink prefixes such as `00:15:65`, `24:9A:D8`, `44:DB:D2`, `80:5E:0C`, `80:5E:C0`, and `EC:1D:A9`.

## Batch Rules

- Default working target count is 50.
- The app does not block captures above the target count.
- Confirmed captures are persisted in local browser storage.
- Duplicate MACs are not added twice.
- The user can remove mistaken captures.
- The user can manually add a MAC if a label is damaged.
- Export includes a CSV with index, MAC address, and capture timestamp.

## Architecture

Use React + Vite + TypeScript. Keep scanner camera integration separate from parsing and batch state so the critical MAC rules are testable without a browser camera.

Core units:

- `mac.ts`: parse, validate, normalize, and export MAC data.
- `batch.ts`: add, remove, duplicate detection, and local storage serialization.
- `ScannerView.tsx`: camera/scanner UI, detected candidate review, confirm/retry workflow.
- `App.tsx`: mobile app shell, progress, batch list, manual entry, export/copy controls.

## Scanner Strategy

Use the browser `BarcodeDetector` API when available. If it is unavailable, load ZXing on demand when scanning starts. If camera access or barcode scanning fails, the UI shows the camera issue and still allows manual entry.

## UI Direction

The app should be utilitarian and field-ready: high contrast, large touch targets, compact progress, obvious confirm/retry actions, and a list designed for quick review while scanning many handsets. It should not feel like a marketing page.

The camera view includes target-zone guidance so the user aims at the MAC barcode only, avoiding nearby SN, EAN, and UPC barcodes on the Yealink label.

## Verification

Automated tests cover MAC parsing, normalization, warn-only Yealink OUI recognition, duplicate prevention, batch persistence helpers, scanner confidence flow, and CSV export. Browser verification covers mobile layout, manual add, duplicate handling, remove, export/copy controls, and scanner unsupported-state handling.
