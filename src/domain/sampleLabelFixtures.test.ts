import fixtures from "../../docs/testing/sample-label-fixtures.json";
import { describe, expect, it } from "vitest";
import { parseMacCandidate } from "./mac";

describe("sample label fixtures", () => {
  it("keeps printable expected values aligned with parser behavior", () => {
    for (const fixture of fixtures) {
      const result = parseMacCandidate(fixture.mac);

      if (fixture.expected === null) {
        expect(result.ok, fixture.id).toBe(false);
      } else {
        expect(result, fixture.id).toMatchObject({
          ok: true,
          normalized: fixture.expected,
        });
      }
    }
  });

  it("contains realistic barcode distractors for every label", () => {
    for (const fixture of fixtures) {
      expect(fixture.serial, fixture.id).toBeTruthy();
      expect(fixture.ean, fixture.id).toMatch(/^\d{13}$/);
      expect(fixture.upc, fixture.id).toMatch(/^\d{12}$/);
    }
  });
});
