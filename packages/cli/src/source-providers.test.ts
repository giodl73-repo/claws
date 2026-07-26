import { describe, expect, it, vi } from "vitest";
import { selectSourceProvider, type SourceProvider } from "./source-providers.js";

const provider = (id: string, prefix: string): SourceProvider => ({
  id,
  matches: (input) => input.startsWith(prefix),
  resolve: vi.fn(),
});

describe("source provider selection", () => {
  it("selects one provider without exposing resolution to the harness adapter", () => {
    const providers = [provider("first", "first:"), provider("second", "second:")];
    expect(selectSourceProvider("second:package", providers).id).toBe("second");
  });

  it("treats Windows drive paths as local sources rather than provider schemes", () => {
    expect(selectSourceProvider("C:\\claws\\example").id).toBe("local");
    expect(selectSourceProvider("C:claws\\example").id).toBe("local");
  });

  it("fails closed for unknown and ambiguous source schemes", () => {
    expect(() =>
      selectSourceProvider("unknown:package", [provider("first", "first:")]),
    ).toThrowError(
      expect.objectContaining({
        diagnostics: [expect.objectContaining({ code: "unknown_source_provider" })],
      }),
    );
    expect(() =>
      selectSourceProvider("same:package", [provider("one", "same:"), provider("two", "same:")]),
    ).toThrowError(
      expect.objectContaining({
        diagnostics: [expect.objectContaining({ code: "ambiguous_source_provider" })],
      }),
    );
  });

  it("rejects duplicate provider ids before matching", () => {
    expect(() =>
      selectSourceProvider("one:package", [
        provider("duplicate", "one:"),
        provider("duplicate", "two:"),
      ]),
    ).toThrow("Source provider ids must be non-empty and unique");
  });
});
