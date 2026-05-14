export type MacParseResult =
  | { ok: true; normalized: string; compact: string }
  | { ok: false; reason: string };

export type MacCapture = {
  id: string;
  mac: string;
  raw: string;
  capturedAt: string;
};

const HEX_MAC = /^[0-9A-F]{12}$/;
const NUMERIC_ONLY = /^[0-9]+$/;
const YEALINK_OUIS = new Set([
  "001565",
  "249AD8",
  "3497D7",
  "44DBD2",
  "644F56",
  "805E0C",
  "805EC0",
  "B061A9",
  "C4FC22",
  "EC1DA9",
  "F01653",
]);

export function parseMacCandidate(value: string): MacParseResult {
  const compact = value
    .trim()
    .replace(/^MAC\s*:?/i, "")
    .replace(/[\s:-]/g, "")
    .toUpperCase();

  if (NUMERIC_ONLY.test(compact)) {
    return { ok: false, reason: "Scanned value looks numeric, not a MAC address" };
  }

  if (!HEX_MAC.test(compact)) {
    return { ok: false, reason: "Expected 12 hexadecimal MAC characters" };
  }

  return {
    ok: true,
    compact,
    normalized: formatMac(compact),
  };
}

export function formatMac(compact: string): string {
  return compact.match(/.{1,2}/g)?.join(":") ?? compact;
}

export function isKnownYealinkMac(mac: string): boolean {
  const compact = mac.replace(/[\s:-]/g, "").toUpperCase();
  return YEALINK_OUIS.has(compact.slice(0, 6));
}

export function toCsv(items: MacCapture[]): string {
  const rows = items.map((item, index) =>
    [String(index + 1), item.mac, item.raw, item.capturedAt].map(csvCell).join(","),
  );

  return ["Index,MAC Address,Raw Scan,Captured At", ...rows].join("\r\n");
}

function csvCell(value: string): string {
  if (!/[",\r\n\s]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
