import { describe, expect, it } from "vitest";
import { compilePattern, extractComponents } from "../src/tokens/index.js";
import { segmentToNamedToken } from "../src/metadata/types.js";
import { applyFormat, buildCandidate, isActiveOn } from "../src/engine/scheme.js";
import { getLibraryVersion, parse } from "../src/index.js";
import { METADATA } from "../src/generated/metadata.js";

describe("tokens — LETTERS", () => {
  it("compiles an excluded-letter alphabet and extracts segments", () => {
    const compiled = compilePattern([
      { name: "a", token: { kind: "LETTERS", length: 2, excluded: ["I", "O", "U"] } },
      { name: "b", token: { kind: "DIGITS", length: 2 } },
    ]);
    expect(compiled.regex.test("AB12")).toBe(true);
    expect(compiled.regex.test("IO12")).toBe(false); // excluded letters
    expect(extractComponents("AB12", compiled)).toEqual({ a: "AB", b: "12" });
  });
});

describe("metadata — segment conversion", () => {
  it("converts a LETTERS segment with and without exclusions", () => {
    expect(
      segmentToNamedToken({ name: "s", type: "LETTERS", length: 2, excluded: ["I"] }),
    ).toEqual({ name: "s", token: { kind: "LETTERS", length: 2, excluded: ["I"] } });
    expect(segmentToNamedToken({ name: "s", type: "LETTERS", length: 2 })).toEqual({
      name: "s",
      token: { kind: "LETTERS", length: 2 },
    });
  });
});

describe("scheme helpers", () => {
  const scheme = METADATA.schemes.find((s) => s.id === "ES_ORDINARY_CURRENT")!;

  it("isActiveOn respects an upper validity bound", () => {
    const bounded = { ...scheme, validTo: "2010-01-01" };
    expect(isActiveOn(bounded, "2005-01-01")).toBe(true);
    expect(isActiveOn(bounded, "2020-01-01")).toBe(false);
  });

  it("applyFormat leaves unknown placeholders empty", () => {
    expect(applyFormat("{a}-{missing}", { a: "X" })).toBe("X-");
  });

  it("buildCandidate produces a formatted candidate", () => {
    const candidate = buildCandidate(scheme, { serial: "1234", series: "BCD" });
    expect(candidate.country).toBe(scheme.country);
    expect(candidate.scheme).toBe(scheme.id);
    expect(candidate.formatted).toBe("1234 BCD");
  });
});

describe("engine edge cases", () => {
  it("rejects overly long input", () => {
    const result = parse("A".repeat(100), { country: "ES" });
    expect(result.status).toBe("INVALID");
    expect(result.errors[0]?.reason).toBe("TOO_LONG");
  });

  it("exposes the library version", () => {
    expect(getLibraryVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
