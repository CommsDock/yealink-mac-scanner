import packageJson from "./package.json";
import { describe, expect, it } from "vitest";

describe("package scripts", () => {
  it("uses port 9999 for local development", () => {
    expect(packageJson.scripts.dev).toContain("--port 9999");
    expect(packageJson.scripts.dev).toContain("--strictPort");
  });
});
