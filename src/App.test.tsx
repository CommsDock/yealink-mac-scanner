import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
  URL.createObjectURL = vi.fn(() => "blob:mac-csv");
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    }),
  );
});

describe("App", () => {
  it("adds a manual MAC and updates progress", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Manual MAC entry"), "MAC 44DBD26FB9EF");
    await user.click(screen.getByRole("button", { name: "Add manually" }));

    expect(screen.getByText("1 / 50")).toBeInTheDocument();
    expect(screen.getByText("44:DB:D2:6F:B9:EF")).toBeInTheDocument();
  });

  it("blocks duplicate manual MAC captures", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Manual MAC entry"), "44DBD26FB9EF");
    await user.click(screen.getByRole("button", { name: "Add manually" }));
    await user.type(screen.getByLabelText("Manual MAC entry"), "44:DB:D2:6F:B9:EF");
    await user.click(screen.getByRole("button", { name: "Add manually" }));

    expect(screen.getByText("Already captured in this batch.")).toBeInTheDocument();
    expect(screen.getAllByText("44:DB:D2:6F:B9:EF")).toHaveLength(1);
  });

  it("removes a mistaken capture", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Manual MAC entry"), "44DBD26FB9EF");
    await user.click(screen.getByRole("button", { name: "Add manually" }));
    await user.click(screen.getByRole("button", { name: "Remove 44:DB:D2:6F:B9:EF" }));

    expect(screen.getByText("0 / 50")).toBeInTheDocument();
    expect(screen.queryByText("44:DB:D2:6F:B9:EF")).not.toBeInTheDocument();
  });

  it("emails the normalized MAC list", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Manual MAC entry"), "44DBD26FB9EF");
    await user.click(screen.getByRole("button", { name: "Add manually" }));
    await user.click(screen.getByRole("button", { name: "Email list" }));
    await user.type(screen.getByLabelText("Recipient email"), "ops@example.com");
    await user.click(screen.getByRole("button", { name: "Send email" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/email-captures",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("44:DB:D2:6F:B9:EF"),
      }),
    );
    expect(await screen.findAllByText("MAC list emailed to ops@example.com.")).toHaveLength(2);
    expect(screen.getAllByRole("status").at(-1)).toHaveTextContent("MAC list emailed to ops@example.com.");
  });

  it("offers CSV export when captures exist", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Manual MAC entry"), "44DBD26FB9EF");
    await user.click(screen.getByRole("button", { name: "Add manually" }));
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    const list = screen.getByRole("list", { name: "Captured MAC addresses" });
    expect(within(list).getByText("44:DB:D2:6F:B9:EF")).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("shows a session accuracy summary for confirmed and manual captures", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Manual MAC entry"), "MAC 44DBD26FB9EF");
    await user.click(screen.getByRole("button", { name: "Add manually" }));

    expect(screen.getByText("Session accuracy")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Manual adds")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmed count")).toHaveTextContent("1");
    expect(screen.getByLabelText("Manual adds count")).toHaveTextContent("1");
  });
});
