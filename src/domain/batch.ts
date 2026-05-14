import type { MacCapture } from "./mac";

type Clock = {
  now: () => string;
  id: () => string;
};

type AddCaptureResult = {
  added: boolean;
  duplicate: boolean;
  items: MacCapture[];
};

const defaultClock: Clock = {
  now: () => new Date().toISOString(),
  id: () => crypto.randomUUID(),
};

export function addCapture(
  items: MacCapture[],
  mac: string,
  raw: string,
  clock: Clock = defaultClock,
): AddCaptureResult {
  if (items.some((item) => item.mac === mac)) {
    return { added: false, duplicate: true, items };
  }

  return {
    added: true,
    duplicate: false,
    items: [
      ...items,
      {
        id: clock.id(),
        mac,
        raw,
        capturedAt: clock.now(),
      },
    ],
  };
}

export function removeCapture(items: MacCapture[], id: string): MacCapture[] {
  return items.filter((item) => item.id !== id);
}

export function serializeBatch(items: MacCapture[]): string {
  return JSON.stringify(items);
}

export function loadBatch(value: string | null): MacCapture[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isMacCapture);
  } catch {
    return [];
  }
}

function isMacCapture(value: unknown): value is MacCapture {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MacCapture>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.mac === "string" &&
    typeof candidate.raw === "string" &&
    typeof candidate.capturedAt === "string"
  );
}
