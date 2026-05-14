import { describe, expect, it } from "vitest";
import { addCapture, loadBatch, removeCapture, serializeBatch } from "./batch";

describe("batch helpers", () => {
  it("adds a new capture with a timestamp", () => {
    const result = addCapture([], "44:DB:D2:6F:B9:EF", "44DBD26FB9EF", {
      now: () => "2026-05-14T03:04:05.000Z",
      id: () => "capture-1",
    });

    expect(result).toEqual({
      added: true,
      duplicate: false,
      items: [
        {
          id: "capture-1",
          mac: "44:DB:D2:6F:B9:EF",
          raw: "44DBD26FB9EF",
          capturedAt: "2026-05-14T03:04:05.000Z",
        },
      ],
    });
  });

  it("prevents duplicate MAC captures", () => {
    const existing = addCapture([], "44:DB:D2:6F:B9:EF", "first", {
      now: () => "2026-05-14T03:04:05.000Z",
      id: () => "capture-1",
    }).items;

    expect(
      addCapture(existing, "44:DB:D2:6F:B9:EF", "second", {
        now: () => "2026-05-14T03:05:05.000Z",
        id: () => "capture-2",
      }),
    ).toEqual({ added: false, duplicate: true, items: existing });
  });

  it("removes a capture by id", () => {
    expect(
      removeCapture(
        [
          {
            id: "capture-1",
            mac: "44:DB:D2:6F:B9:EF",
            raw: "first",
            capturedAt: "2026-05-14T03:04:05.000Z",
          },
          {
            id: "capture-2",
            mac: "80:5E:C0:12:34:56",
            raw: "second",
            capturedAt: "2026-05-14T03:05:05.000Z",
          },
        ],
        "capture-1",
      ),
    ).toHaveLength(1);
  });

  it("serializes and loads valid persisted batch data", () => {
    const json = serializeBatch([
      {
        id: "capture-1",
        mac: "44:DB:D2:6F:B9:EF",
        raw: "first",
        capturedAt: "2026-05-14T03:04:05.000Z",
      },
    ]);

    expect(loadBatch(json)).toEqual([
      {
        id: "capture-1",
        mac: "44:DB:D2:6F:B9:EF",
        raw: "first",
        capturedAt: "2026-05-14T03:04:05.000Z",
      },
    ]);
    expect(loadBatch("not json")).toEqual([]);
  });
});
