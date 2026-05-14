import { describe, expect, it } from "vitest";
import {
  buildEmailContent,
  buildRawEmail,
  parseAllowedDomains,
  validateEmailRequest,
} from "./emailPayload.mjs";

const capture = {
  mac: "44:DB:D2:6F:B9:EF",
  raw: "MAC 44DBD26FB9EF",
  capturedAt: "2026-05-14T04:39:07.000Z",
};

describe("validateEmailRequest", () => {
  it("accepts a valid recipient and MAC capture list", () => {
    expect(
      validateEmailRequest({
        recipient: "ops@example.com",
        subject: "Provisioning list",
        note: "Site A handsets",
        captures: [capture],
      }),
    ).toMatchObject({
      ok: true,
      value: {
        recipient: "ops@example.com",
        subject: "Provisioning list",
        note: "Site A handsets",
        captures: [capture],
      },
    });
  });

  it("rejects missing recipients and empty capture lists", () => {
    expect(validateEmailRequest({ recipient: "", captures: [capture] })).toMatchObject({
      ok: false,
      error: "Recipient email is required.",
    });

    expect(validateEmailRequest({ recipient: "ops@example.com", captures: [] })).toMatchObject({
      ok: false,
      error: "At least one MAC address is required.",
    });
  });

  it("rejects invalid MAC values", () => {
    expect(
      validateEmailRequest({
        recipient: "ops@example.com",
        captures: [{ ...capture, mac: "6938818304314" }],
      }),
    ).toMatchObject({
      ok: false,
      error: "Invalid MAC address: 6938818304314",
    });
  });

  it("can restrict recipients to approved domains", () => {
    expect(
      validateEmailRequest(
        { recipient: "ops@telcoconcepts.com.au", captures: [capture] },
        { allowedRecipientDomains: ["telcoconcepts.com.au"] },
      ),
    ).toMatchObject({ ok: true });

    expect(
      validateEmailRequest(
        { recipient: "external@example.com", captures: [capture] },
        { allowedRecipientDomains: ["telcoconcepts.com.au"] },
      ),
    ).toMatchObject({
      ok: false,
      status: 403,
      error: "Recipient domain is not allowed.",
    });
  });
});

describe("parseAllowedDomains", () => {
  it("parses comma-separated recipient domains", () => {
    expect(parseAllowedDomains("telcoconcepts.com.au, example.com")).toEqual([
      "telcoconcepts.com.au",
      "example.com",
    ]);
  });
});

describe("email content", () => {
  it("builds a text body and CSV attachment content", () => {
    const content = buildEmailContent({ captures: [capture], note: "Install batch" });

    expect(content.text).toContain("Captured MAC addresses: 1");
    expect(content.text).toContain("44:DB:D2:6F:B9:EF");
    expect(content.csv).toContain("Index,MAC Address,Raw Scan,Captured At");
    expect(content.csv).toContain('"MAC 44DBD26FB9EF"');
  });

  it("builds a raw MIME email with a CSV attachment", () => {
    const raw = buildRawEmail({
      from: "macscanner@telcoconcepts.com.au",
      recipient: "ops@example.com",
      subject: "Provisioning list",
      text: "Body",
      csv: "Index,MAC Address\r\n1,44:DB:D2:6F:B9:EF",
    });

    expect(raw).toContain("From: macscanner@telcoconcepts.com.au");
    expect(raw).toContain("To: ops@example.com");
    expect(raw).toContain("Subject: Provisioning list");
    expect(raw).toContain("Content-Disposition: attachment; filename=\"yealink-mac-addresses.csv\"");
  });
});
