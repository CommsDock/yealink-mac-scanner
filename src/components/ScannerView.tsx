import { Camera, Check, RotateCcw, ScanLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isKnownYealinkMac, parseMacCandidate } from "../domain/mac";

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export type ScannerController = {
  start: (
    onValue: (value: string) => boolean,
    onError: (message: string) => void,
  ) => (() => void) | Promise<() => void>;
};

export type ScannerControllerFactory = () => ScannerController;

export type ScanMetricEvent =
  | "duplicate"
  | "ignored_numeric"
  | "invalid"
  | "retry";

type ScannerViewProps = {
  existingMacs: string[];
  onConfirm: (mac: string, raw: string) => void;
  onScanEvent?: (event: ScanMetricEvent) => void;
  scannerSupported?: boolean;
  createScanner?: ScannerControllerFactory;
};

type CandidateState =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "verifying"; raw: string; normalized: string; vendorKnown: boolean }
  | { kind: "valid"; raw: string; normalized: string; duplicate: boolean; vendorKnown: boolean }
  | { kind: "invalid"; raw: string; reason: string; scanning: boolean }
  | { kind: "error"; message: string };

export function ScannerView({
  existingMacs,
  onConfirm,
  onScanEvent,
  scannerSupported,
  createScanner,
}: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const pendingMacRef = useRef<string | null>(null);
  const [state, setState] = useState<CandidateState>({ kind: "idle" });
  const [autoResume, setAutoResume] = useState(true);

  const isSupported = scannerSupported ?? Boolean(createScanner || navigator.mediaDevices);
  const scannerFactory = useMemo(
    () => createScanner ?? (() => createBrowserScanner(videoRef)),
    [createScanner],
  );

  useEffect(() => {
    return () => stopRef.current?.();
  }, []);

  async function startScanning() {
    if (!isSupported) {
      return;
    }

    stopRef.current?.();
    pendingMacRef.current = null;
    setState({ kind: "scanning" });

    const stop = await scannerFactory().start(
      (raw) => {
        const parsed = parseMacCandidate(raw);

        if (!parsed.ok) {
          onScanEvent?.(parsed.reason.includes("numeric") ? "ignored_numeric" : "invalid");
          setState({ kind: "invalid", raw, reason: parsed.reason, scanning: true });
          return false;
        }

        if (pendingMacRef.current !== parsed.compact) {
          pendingMacRef.current = parsed.compact;
          setState({
            kind: "verifying",
            raw,
            normalized: parsed.normalized,
            vendorKnown: isKnownYealinkMac(parsed.normalized),
          });
          return false;
        }

        stopRef.current?.();
        stopRef.current = null;
        pendingMacRef.current = null;
        const duplicate = existingMacs.includes(parsed.normalized);
        if (duplicate) {
          onScanEvent?.("duplicate");
        }
        setState({
          kind: "valid",
          raw,
          normalized: parsed.normalized,
          duplicate,
          vendorKnown: isKnownYealinkMac(parsed.normalized),
        });
        return true;
      },
      (message) => setState({ kind: "error", message }),
    );

    stopRef.current = stop;
  }

  function retry() {
    pendingMacRef.current = null;
    onScanEvent?.("retry");
    void startScanning();
  }

  function confirm() {
    if (state.kind !== "valid" || state.duplicate) {
      return;
    }

    onConfirm(state.normalized, state.raw);
    if (autoResume) {
      void startScanning();
    } else {
      setState({ kind: "idle" });
    }
  }

  if (!isSupported) {
    return (
      <section className="scanner-panel scanner-panel--unsupported">
        <div className="scanner-icon">
          <Camera aria-hidden="true" />
        </div>
        <h2>Camera barcode scanning is not available on this browser.</h2>
        <p>Use manual entry below for damaged labels or unsupported devices.</p>
      </section>
    );
  }

  return (
    <section className="scanner-panel">
      <div className="camera-frame">
        <video ref={videoRef} aria-label="Scanner camera preview" muted playsInline />
        <div className="scan-guide" aria-hidden="true">
          <em>Aim at MAC barcode only</em>
          <span />
        </div>
      </div>

      {state.kind === "idle" || state.kind === "scanning" || state.kind === "verifying" || (state.kind === "invalid" && state.scanning) ? (
        <button className="primary-action" type="button" onClick={startScanning}>
          <ScanLine aria-hidden="true" />
          {state.kind === "idle" ? "Start scanning" : "Scanning..."}
        </button>
      ) : null}

      <label className="scanner-option">
        <input
          type="checkbox"
          checked={autoResume}
          onChange={(event) => setAutoResume(event.target.checked)}
        />
        <span>Auto-resume after confirm</span>
      </label>

      {state.kind === "verifying" ? (
        <div className="candidate-card candidate-card--pending">
          <span className="candidate-label">Verifying MAC</span>
          <strong>{state.normalized}</strong>
          <small>Read once. Hold steady for one more read.</small>
        </div>
      ) : null}

      {state.kind === "valid" ? (
        <div className="candidate-card candidate-card--valid">
          <span className="candidate-label">Detected MAC</span>
          <strong>{state.normalized}</strong>
          <small>Raw scan: {state.raw}</small>
          {state.duplicate ? <p className="warning">Already captured in this batch.</p> : null}
          {!state.vendorKnown ? <p className="warning">OUI not in known Yealink list. Confirm if this handset is expected.</p> : null}
          <div className="action-row">
            <button type="button" className="primary-action" onClick={confirm} disabled={state.duplicate}>
              <Check aria-hidden="true" />
              Confirm
            </button>
            <button type="button" className="secondary-action" onClick={retry}>
              <RotateCcw aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {state.kind === "invalid" ? (
        <div className="candidate-card candidate-card--invalid">
          <span className="candidate-label">Ignored scan</span>
          <strong>{state.reason}</strong>
          <small>Raw scan: {state.raw}</small>
          {!state.scanning ? (
            <button type="button" className="secondary-action" onClick={retry}>
              <RotateCcw aria-hidden="true" />
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="candidate-card candidate-card--invalid">
          <span className="candidate-label">Camera issue</span>
          <strong>{state.message}</strong>
          <button type="button" className="secondary-action" onClick={retry}>
            <RotateCcw aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}
    </section>
  );
}

function createBrowserScanner(videoRef: React.RefObject<HTMLVideoElement | null>): ScannerController {
  return {
    async start(onValue, onError) {
      const video = videoRef.current;
      const Detector = window.BarcodeDetector;

      if (!video) {
        onError("Camera scanner could not start on this device.");
        return () => undefined;
      }

      if (!Detector) {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        let controls: { stop: () => void } | undefined;
        let shouldStopAfterInit = false;
        controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result, error) => {
            if (result) {
              const shouldStop = onValue(result.getText());
              if (shouldStop && controls) {
                controls.stop();
              } else if (shouldStop) {
                shouldStopAfterInit = true;
              }
              return;
            }

            if (error && !isBenignBarcodeMiss(error)) {
              onError(error.message || "Barcode detection failed.");
            }
          },
        );

        if (shouldStopAfterInit) {
          controls.stop();
        }

        return () => controls.stop();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      video.srcObject = stream;
      await video.play();

      const detector = new Detector({ formats: ["code_128", "code_39", "ean_13", "upc_a"] });
      let active = true;

      const scan = async () => {
        if (!active) {
          return;
        }

        try {
          const codes = await detector.detect(video);
          const rawValue = codes.find((code) => code.rawValue)?.rawValue;
          if (rawValue && onValue(rawValue)) {
            return;
          }
        } catch (error) {
          onError(error instanceof Error ? error.message : "Barcode detection failed.");
          return;
        }

        requestAnimationFrame(scan);
      };

      requestAnimationFrame(scan);

      return () => {
        active = false;
        stream.getTracks().forEach((track) => track.stop());
      };
    },
  };
}

export function isBenignBarcodeMiss(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { name?: unknown; message?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message = typeof candidate.message === "string" ? candidate.message : "";

  return (
    name === "NotFoundException" ||
    message.includes("No MultiFormat Readers were able to detect the code")
  );
}
