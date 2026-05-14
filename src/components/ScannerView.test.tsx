import { act } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScannerView, isBenignBarcodeMiss, type ScannerControllerFactory } from "./ScannerView";

describe("ScannerView", () => {
  it("treats ZXing no-code frames as benign scan misses", () => {
    expect(
      isBenignBarcodeMiss(new Error("No MultiFormat Readers were able to detect the code.")),
    ).toBe(true);
    expect(isBenignBarcodeMiss({ name: "NotFoundException", message: "" })).toBe(true);
    expect(isBenignBarcodeMiss(new Error("Permission denied"))).toBe(false);
  });

  it("shows an unsupported scanner fallback when no scanner is available", async () => {
    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={vi.fn()}
        scannerSupported={false}
      />,
    );

    expect(screen.getByText("Camera barcode scanning is not available on this browser.")).toBeInTheDocument();
    expect(screen.getByText("Use manual entry below for damaged labels or unsupported devices.")).toBeInTheDocument();
  });

  it("allows scanning when a fallback scanner is provided", () => {
    const createScanner: ScannerControllerFactory = () => ({
      start: () => () => undefined,
    });

    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={vi.fn()}
        createScanner={createScanner}
      />,
    );

    expect(screen.getByRole("button", { name: "Start scanning" })).toBeInTheDocument();
  });

  it("shows confirm and retry after a valid MAC detection", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const createScanner: ScannerControllerFactory = () => ({
      start: (onValue) => {
        onValue("MAC 44DBD26FB9EF");
        onValue("44DBD26FB9EF");
        return () => undefined;
      },
    });

    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={onConfirm}
        createScanner={createScanner}
        scannerSupported
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start scanning" }));
    expect(screen.getByText("44:DB:D2:6F:B9:EF")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith("44:DB:D2:6F:B9:EF", "44DBD26FB9EF");
  });

  it("requires the same MAC twice before showing confirm", async () => {
    const user = userEvent.setup();
    let read: ((value: string) => boolean) | undefined;
    const createScanner: ScannerControllerFactory = () => ({
      start: (onValue) => {
        read = onValue;
        return () => undefined;
      },
    });

    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={vi.fn()}
        createScanner={createScanner}
        scannerSupported
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start scanning" }));
    let firstRead: boolean | undefined;
    await act(async () => {
      firstRead = read?.("MAC 44DBD26FB9EF");
    });

    expect(firstRead).toBe(false);
    expect(screen.getByText("Read once. Hold steady for one more read.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();

    let secondRead: boolean | undefined;
    await act(async () => {
      secondRead = read?.("44DBD26FB9EF");
    });

    expect(secondRead).toBe(true);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("shows a warning for non-Yealink OUIs but still allows confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const createScanner: ScannerControllerFactory = () => ({
      start: (onValue) => {
        onValue("AABBCC123456");
        onValue("AABBCC123456");
        return () => undefined;
      },
    });

    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={onConfirm}
        createScanner={createScanner}
        scannerSupported
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start scanning" }));
    expect(screen.getByText("OUI not in known Yealink list. Confirm if this handset is expected.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith("AA:BB:CC:12:34:56", "AABBCC123456");
  });

  it("returns to active scanning after a confirmed MAC", async () => {
    const user = userEvent.setup();
    let starts = 0;
    const createScanner: ScannerControllerFactory = () => ({
      start: (onValue) => {
        starts += 1;
        if (starts === 1) {
          onValue("MAC 44DBD26FB9EF");
          onValue("44DBD26FB9EF");
        }
        return () => undefined;
      },
    });

    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={vi.fn()}
        createScanner={createScanner}
        scannerSupported
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start scanning" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(starts).toBe(2);
    expect(screen.getByRole("button", { name: "Scanning..." })).toBeInTheDocument();
  });

  it("can pause after confirmation when auto-resume is turned off", async () => {
    const user = userEvent.setup();
    let starts = 0;
    const createScanner: ScannerControllerFactory = () => ({
      start: (onValue) => {
        starts += 1;
        if (starts === 1) {
          onValue("MAC 44DBD26FB9EF");
          onValue("44DBD26FB9EF");
        }
        return () => undefined;
      },
    });

    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={vi.fn()}
        createScanner={createScanner}
        scannerSupported
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Auto-resume after confirm" }));
    await user.click(screen.getByRole("button", { name: "Start scanning" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(starts).toBe(1);
    expect(screen.getByRole("button", { name: "Start scanning" })).toBeInTheDocument();
  });

  it("tells the scanner to stop after a valid MAC detection", async () => {
    const user = userEvent.setup();
    let firstShouldStop: boolean | undefined;
    let secondShouldStop: boolean | undefined;
    const createScanner: ScannerControllerFactory = () => ({
      start: (onValue) => {
        firstShouldStop = onValue("MAC 44DBD26FB9EF");
        secondShouldStop = onValue("44DBD26FB9EF");
        return () => undefined;
      },
    });

    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={vi.fn()}
        createScanner={createScanner}
        scannerSupported
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start scanning" }));

    expect(firstShouldStop).toBe(false);
    expect(secondShouldStop).toBe(true);
  });

  it("keeps scanning after an invalid detection", async () => {
    const user = userEvent.setup();
    let shouldStop: boolean | undefined;
    const createScanner: ScannerControllerFactory = () => ({
      start: (onValue) => {
        shouldStop = onValue("6938818304314");
        return () => undefined;
      },
    });

    render(
      <ScannerView
        existingMacs={[]}
        onConfirm={vi.fn()}
        createScanner={createScanner}
        scannerSupported
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start scanning" }));

    expect(screen.getByText("Scanned value looks numeric, not a MAC address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scanning..." })).toBeInTheDocument();
    expect(shouldStop).toBe(false);
  });
});
