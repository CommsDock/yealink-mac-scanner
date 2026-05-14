const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAC_PATTERN = /^[0-9A-F]{2}(?::[0-9A-F]{2}){5}$/;
const MAX_CAPTURE_COUNT = 500;

export function validateEmailRequest(body, options = {}) {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid request body." };
  }

  const recipient = cleanString(body.recipient);
  const subject = cleanString(body.subject) || defaultSubject();
  const note = cleanString(body.note);
  const captures = Array.isArray(body.captures) ? body.captures : [];

  if (!EMAIL_PATTERN.test(recipient)) {
    return { ok: false, status: 400, error: "Recipient email is required." };
  }

  if (!isAllowedRecipient(recipient, options.allowedRecipientDomains)) {
    return { ok: false, status: 403, error: "Recipient domain is not allowed." };
  }

  if (captures.length === 0) {
    return { ok: false, status: 400, error: "At least one MAC address is required." };
  }

  if (captures.length > MAX_CAPTURE_COUNT) {
    return { ok: false, status: 400, error: "Too many MAC addresses in one email." };
  }

  const normalizedCaptures = [];

  for (const capture of captures) {
    if (!capture || typeof capture !== "object") {
      return { ok: false, status: 400, error: "Capture list contains an invalid item." };
    }

    const mac = cleanString(capture.mac).toUpperCase();
    const raw = cleanString(capture.raw);
    const capturedAt = cleanString(capture.capturedAt);

    if (!MAC_PATTERN.test(mac)) {
      return { ok: false, status: 400, error: `Invalid MAC address: ${mac || "blank"}` };
    }

    normalizedCaptures.push({ mac, raw, capturedAt });
  }

  return {
    ok: true,
    value: {
      recipient,
      subject: subject.slice(0, 140),
      note: note.slice(0, 1000),
      captures: normalizedCaptures,
    },
  };
}

export function parseAllowedDomains(value) {
  return String(value || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function buildEmailContent({ captures, note }) {
  const macList = captures.map((capture, index) => `${index + 1}. ${capture.mac}`).join("\n");
  const csv = toCsv(captures);

  const text = [
    "Yealink MAC Scanner capture list",
    "",
    note ? `Message: ${note}` : "",
    note ? "" : "",
    `Captured MAC addresses: ${captures.length}`,
    "",
    macList,
    "",
    "A CSV attachment is included.",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");

  return { text, csv };
}

export function buildRawEmail({ from, recipient, subject, text, csv }) {
  const boundary = `mac-scanner-${Date.now().toString(36)}`;
  const encodedSubject = encodeHeader(subject);
  const encodedCsv = Buffer.from(csv, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trim();

  return [
    `From: ${from}`,
    `To: ${recipient}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/csv; charset=UTF-8; name=\"yealink-mac-addresses.csv\"",
    "Content-Disposition: attachment; filename=\"yealink-mac-addresses.csv\"",
    "Content-Transfer-Encoding: base64",
    "",
    encodedCsv,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export function toCsv(captures) {
  const rows = captures.map((capture, index) =>
    [String(index + 1), capture.mac, capture.raw, capture.capturedAt].map(csvCell).join(","),
  );

  return ["Index,MAC Address,Raw Scan,Captured At", ...rows].join("\r\n");
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedRecipient(recipient, allowedDomains = []) {
  if (allowedDomains.length === 0) {
    return true;
  }

  const domain = recipient.toLowerCase().split("@").at(-1);
  return Boolean(domain && allowedDomains.includes(domain));
}

function csvCell(value) {
  if (!/[",\r\n\s]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function defaultSubject() {
  return `Yealink MAC capture list - ${new Date().toLocaleDateString("en-AU")}`;
}

function encodeHeader(value) {
  return /^[\x00-\x7F]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}
