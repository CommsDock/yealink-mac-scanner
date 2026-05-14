import { Download, ListChecks, Mail, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ScannerView } from "./components/ScannerView";
import { addCapture, loadBatch, removeCapture, serializeBatch } from "./domain/batch";
import type { MacCapture } from "./domain/mac";
import { parseMacCandidate, toCsv } from "./domain/mac";
import type { ScanMetricEvent } from "./components/ScannerView";
import "./styles.css";

const STORAGE_KEY = "yealink-mac-scanner:capture-batch";
const TARGET_COUNT = 50;
type SessionMetrics = {
  confirmed: number;
  manualAdds: number;
  duplicateDetections: number;
  ignoredNumeric: number;
  invalidReads: number;
  retries: number;
};

const initialMetrics: SessionMetrics = {
  confirmed: 0,
  manualAdds: 0,
  duplicateDetections: 0,
  ignoredNumeric: 0,
  invalidReads: 0,
  retries: 0,
};

export default function App() {
  const [items, setItems] = useState<MacCapture[]>(() => loadBatch(localStorage.getItem(STORAGE_KEY)));
  const [manualValue, setManualValue] = useState("");
  const [message, setMessage] = useState("Ready to scan the MAC barcode.");
  const [metrics, setMetrics] = useState<SessionMetrics>(initialMetrics);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("Yealink MAC capture list");
  const [emailNote, setEmailNote] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, serializeBatch(items));
  }, [items]);

  const existingMacs = useMemo(() => items.map((item) => item.mac), [items]);
  const complete = items.length >= TARGET_COUNT;

  function capture(mac: string, raw: string) {
    const result = addCapture(items, mac, raw);
    setItems(result.items);
    if (result.added) {
      setMetrics((current) => ({ ...current, confirmed: current.confirmed + 1 }));
    }
    setMessage(result.duplicate ? "Already captured in this batch." : `${mac} captured.`);
  }

  function recordScanEvent(event: ScanMetricEvent) {
    setMetrics((current) => {
      if (event === "duplicate") {
        return { ...current, duplicateDetections: current.duplicateDetections + 1 };
      }
      if (event === "ignored_numeric") {
        return { ...current, ignoredNumeric: current.ignoredNumeric + 1 };
      }
      if (event === "invalid") {
        return { ...current, invalidReads: current.invalidReads + 1 };
      }
      return { ...current, retries: current.retries + 1 };
    });
  }

  function handleManualAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseMacCandidate(manualValue);

    if (!parsed.ok) {
      setMessage(parsed.reason);
      return;
    }

    capture(parsed.normalized, manualValue);
    if (!items.some((item) => item.mac === parsed.normalized)) {
      setMetrics((current) => ({ ...current, manualAdds: current.manualAdds + 1 }));
      setManualValue("");
    }
  }

  async function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (items.length === 0 || emailSending) {
      return;
    }

    setEmailSending(true);
    setToastMessage("");
    setMessage("Sending MAC list email...");
    const recipient = emailRecipient.trim();

    try {
      const response = await fetch("/api/email-captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          subject: emailSubject,
          note: emailNote,
          captures: items.map(({ mac, raw, capturedAt }) => ({ mac, raw, capturedAt })),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Email send failed.");
      }

      setEmailOpen(false);
      setEmailRecipient("");
      setEmailNote("");
      setMessage(`MAC list emailed to ${recipient}.`);
      setToastMessage(`MAC list emailed to ${recipient}.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Email send failed.";
      setMessage(errorMessage);
      setToastMessage(errorMessage);
    } finally {
      setEmailSending(false);
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(items)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "yealink-mac-addresses.csv";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("CSV export created.");
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="overline">Yealink provisioning</p>
          <h1>MAC scanner</h1>
          <p className="hero-copy">
            Scan the label&apos;s MAC barcode, confirm the detected address, and keep moving through the batch.
          </p>
        </div>
        <div className={`progress-ring ${complete ? "progress-ring--complete" : ""}`}>
          <small>{complete ? "Batch ready" : "Captured"}</small>
          <span>{items.length} / {TARGET_COUNT}</span>
          <div className="progress-track" aria-hidden="true">
            <div style={{ width: `${Math.min((items.length / TARGET_COUNT) * 100, 100)}%` }} />
          </div>
        </div>
      </section>

      <ScannerView existingMacs={existingMacs} onConfirm={capture} onScanEvent={recordScanEvent} />

      <section className="metrics-panel">
        <div>
          <p className="overline">Session accuracy</p>
          <h2>Scan summary</h2>
        </div>
        <div className="metrics-grid">
          <Metric label="Confirmed" value={metrics.confirmed} />
          <Metric label="Manual adds" value={metrics.manualAdds} />
          <Metric label="Duplicates" value={metrics.duplicateDetections} />
          <Metric label="Ignored numeric" value={metrics.ignoredNumeric} />
          <Metric label="Invalid MAC" value={metrics.invalidReads} />
          <Metric label="Retries" value={metrics.retries} />
        </div>
      </section>

      <section className="manual-panel">
        <form onSubmit={handleManualAdd}>
          <label htmlFor="manual-mac">Manual MAC entry</label>
          <div className="manual-row">
            <input
              id="manual-mac"
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              placeholder="MAC 44DBD26FB9EF"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button type="submit">
              <Plus aria-hidden="true" />
              Add manually
            </button>
          </div>
        </form>
        <p className="status-line" role="status">{message}</p>
      </section>

      <section className="batch-panel">
        <div className="section-heading">
          <div>
            <p className="overline">Batch list</p>
            <h2>Captured MAC addresses</h2>
          </div>
          <div className="utility-actions">
            <button type="button" onClick={() => setEmailOpen(true)} disabled={items.length === 0}>
              <Mail aria-hidden="true" />
              Email list
            </button>
            <button type="button" onClick={exportCsv} disabled={items.length === 0}>
              <Download aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <ListChecks aria-hidden="true" />
            <p>No MAC addresses captured yet.</p>
          </div>
        ) : (
          <ol className="capture-list" aria-label="Captured MAC addresses">
            {items.map((item, index) => (
              <li key={item.id}>
                <span className="capture-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{item.mac}</strong>
                  <small>{new Date(item.capturedAt).toLocaleString()}</small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${item.mac}`}
                  onClick={() => {
                    setItems(removeCapture(items, item.id));
                    setMessage(`${item.mac} removed.`);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {emailOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="email-modal" role="dialog" aria-modal="true" aria-labelledby="email-modal-title">
            <div className="modal-heading">
              <div>
                <p className="overline">Share batch</p>
                <h2 id="email-modal-title">Email captured MACs</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close email form"
                onClick={() => setEmailOpen(false)}
                disabled={emailSending}
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <form className="email-form" onSubmit={sendEmail}>
              <label htmlFor="email-recipient">Recipient email</label>
              <input
                id="email-recipient"
                type="email"
                value={emailRecipient}
                onChange={(event) => setEmailRecipient(event.target.value)}
                placeholder="colleague@telcoconcepts.com.au"
                required
              />

              <label htmlFor="email-subject">Subject</label>
              <input
                id="email-subject"
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
                required
              />

              <label htmlFor="email-note">Message</label>
              <textarea
                id="email-note"
                value={emailNote}
                onChange={(event) => setEmailNote(event.target.value)}
                placeholder="Optional note for the recipient"
                rows={4}
              />

              <p className="status-line">{items.length} MAC addresses will be sent with a CSV attachment.</p>

              <div className="action-row">
                <button type="submit" className="primary-action" disabled={emailSending}>
                  <Mail aria-hidden="true" />
                  {emailSending ? "Sending..." : "Send email"}
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setEmailOpen(false)}
                  disabled={emailSending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="toast-message" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span aria-label={`${label} count`}>{value}</span>
      <small>{label}</small>
    </div>
  );
}
