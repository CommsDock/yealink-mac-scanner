import { describe, expect, it } from "vitest";
import { isKnownYealinkMac, parseMacCandidate, toCsv } from "./mac";

describe("parseMacCandidate", () => {
  it("accepts plain Yealink MAC barcode values", () => {
    expect(parseMacCandidate("44DBD26FB9EF")).toEqual({
      ok: true,
      normalized: "44:DB:D2:6F:B9:EF",
      compact: "44DBD26FB9EF",
    });
  });

  it("accepts human-readable MAC label values", () => {
    expect(parseMacCandidate("MAC 44DBD26FB9EF")).toMatchObject({
      ok: true,
      normalized: "44:DB:D2:6F:B9:EF",
    });
  });

  it("accepts colon and hyphen separated MAC values", () => {
    expect(parseMacCandidate("44:db:d2:6f:b9:ef")).toMatchObject({
      ok: true,
      normalized: "44:DB:D2:6F:B9:EF",
    });
    expect(parseMacCandidate("44-db-d2-6f-b9-ef")).toMatchObject({
      ok: true,
      normalized: "44:DB:D2:6F:B9:EF",
    });
  });

  it("rejects EAN, UPC, serial-like, and invalid hex values", () => {
    expect(parseMacCandidate("6938818304314")).toEqual({
      ok: false,
      reason: "Scanned value looks numeric, not a MAC address",
    });
    expect(parseMacCandidate("841885102980")).toEqual({
      ok: false,
      reason: "Scanned value looks numeric, not a MAC address",
    });
    expect(parseMacCandidate("301203GO80005848")).toEqual({
      ok: false,
      reason: "Expected 12 hexadecimal MAC characters",
    });
    expect(parseMacCandidate("44DBD26FB9EZ")).toEqual({
      ok: false,
      reason: "Expected 12 hexadecimal MAC characters",
    });
  });
});

describe("isKnownYealinkMac", () => {
  it("recognizes known Yealink OUIs without blocking other valid MACs", () => {
    expect(isKnownYealinkMac("44:DB:D2:6F:B9:EF")).toBe(true);
    expect(isKnownYealinkMac("80:5E:C0:12:34:56")).toBe(true);
    expect(isKnownYealinkMac("80:5E:0C:12:34:56")).toBe(true);
    expect(isKnownYealinkMac("EC:1D:A9:12:34:56")).toBe(true);
    expect(isKnownYealinkMac("64:4F:56:12:34:56")).toBe(true);
    expect(isKnownYealinkMac("00:15:65:A1:B2:C3")).toBe(true);
    expect(isKnownYealinkMac("AA:BB:CC:12:34:56")).toBe(false);
  });
});

describe("toCsv", () => {
  it("exports index, MAC address, and captured timestamp", () => {
    expect(
      toCsv([
        {
          id: "one",
          mac: "44:DB:D2:6F:B9:EF",
          raw: "MAC 44DBD26FB9EF",
          capturedAt: "2026-05-14T03:04:05.000Z",
        },
      ]),
    ).toBe(
      'Index,MAC Address,Raw Scan,Captured At\r\n1,44:DB:D2:6F:B9:EF,"MAC 44DBD26FB9EF",2026-05-14T03:04:05.000Z',
    );
  });
});
