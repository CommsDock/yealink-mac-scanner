import http from "node:http";
import { Buffer } from "node:buffer";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import {
  buildEmailContent,
  buildRawEmail,
  parseAllowedDomains,
  validateEmailRequest,
} from "./emailPayload.mjs";

const port = Number(process.env.PORT || 8081);
const region = process.env.SES_REGION || "ap-southeast-2";
const fromEmail = process.env.SES_FROM_EMAIL || "macscanner@telcoconcepts.com.au";
const allowedRecipientDomains = parseAllowedDomains(
  process.env.ALLOWED_RECIPIENT_DOMAINS || "telcoconcepts.com.au",
);
const ses = new SESClient({ region });

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/email-captures") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  try {
    const body = await readJson(request);
    const validation = validateEmailRequest(body, { allowedRecipientDomains });

    if (!validation.ok) {
      sendJson(response, validation.status, { error: validation.error });
      return;
    }

    const { text, csv } = buildEmailContent(validation.value);
    const rawMessage = buildRawEmail({
      from: fromEmail,
      recipient: validation.value.recipient,
      subject: validation.value.subject,
      text,
      csv,
    });

    await ses.send(
      new SendRawEmailCommand({
        Source: fromEmail,
        Destinations: [validation.value.recipient],
        RawMessage: {
          Data: Buffer.from(rawMessage, "utf8"),
        },
      }),
    );

    sendJson(response, 200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed.";
    console.error(message);
    sendJson(response, 500, { error: "Email send failed." });
  }
});

server.listen(port, () => {
  console.log(`Email API listening on ${port}`);
});

function readJson(request) {
  return new Promise((resolve, reject) => {
    let data = "";

    request.on("data", (chunk) => {
      data += chunk;
      if (data.length > 100_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}
