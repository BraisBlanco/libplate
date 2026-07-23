import { describe, expect, it } from "vitest";
import { compilePattern, extractComponents, matchAll } from "../src/tokens/index.js";
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
    expect(compiled.expansions).toHaveLength(1);
    const expansion = compiled.expansions[0]!;
    expect(expansion.regex.test("AB12")).toBe(true);
    expect(expansion.regex.test("IO12")).toBe(false); // excluded letters
    expect(extractComponents("AB12", expansion)).toEqual({ a: "AB", b: "12" });
  });
});

describe("tokens — variable lengths and tables", () => {
  it("expands a variable-length pattern into fixed shapes and finds all splits", () => {
    const compiled = compilePattern([
      { name: "uz", token: { kind: "TABLE", values: ["B", "BA", "WÜ"] } },
      { name: "letters", token: { kind: "LETTERS", length: { min: 1, max: 2 } } },
      {
        name: "digits",
        token: { kind: "DIGITS", length: { min: 1, max: 4 }, noLeadingZero: true },
      },
    ]);
    // "BAB123" admits B|AB|123 and BA|B|123 — both must surface.
    expect(matchAll("BAB123", compiled)).toEqual([
      { uz: "B", letters: "AB", digits: "123" },
      { uz: "BA", letters: "B", digits: "123" },
    ]);
    // Umlaut table values match; leading zero does not.
    expect(matchAll("WÜX9", compiled)).toEqual([{ uz: "WÜ", letters: "X", digits: "9" }]);
    expect(matchAll("BX0123", compiled)).toEqual([]);
  });

  it("prunes length combinations through disjunctive length rules", () => {
    const compiled = compilePattern(
      [
        { name: "a", token: { kind: "LETTERS", length: { min: 1, max: 3 } } },
        { name: "b", token: { kind: "DIGITS", length: { min: 1, max: 4 } } },
      ],
      [
        { segments: ["a", "b"], max: 5 },
        { segments: ["b"], max: 2 },
      ],
    );
    expect(matchAll("ABC12", compiled)).toHaveLength(1); // total 5 — first rule
    expect(matchAll("ABC1234", compiled)).toEqual([]); // total 7, digits 4 — neither
    expect(matchAll("ABC12345", compiled)).toEqual([]); // beyond any expansion
  });

  it("rejects patterns that expand beyond the safety cap", () => {
    const wide = { kind: "DIGITS", length: { min: 1, max: 9 } } as const;
    expect(() =>
      compilePattern([
        { name: "a", token: wide },
        { name: "b", token: wide },
        { name: "c", token: wide },
      ]),
    ).toThrow(/fixed-length shapes/);
  });
});

describe("metadata — segment conversion", () => {
  it("converts a LETTERS segment with and without exclusions", () => {
    expect(
      segmentToNamedToken({ name: "s", type: "LETTERS", length: 2, excluded: ["I"] }),
    ).toEqual({
      name: "s",
      token: { kind: "LETTERS", length: { min: 2, max: 2 }, excluded: ["I"] },
    });
    expect(segmentToNamedToken({ name: "s", type: "LETTERS", length: 2 })).toEqual({
      name: "s",
      token: { kind: "LETTERS", length: { min: 2, max: 2 } },
    });
  });

  it("resolves TABLE segments against the bundle tables", () => {
    expect(
      segmentToNamedToken({ name: "d", type: "TABLE", table: "t" }, { t: ["AA", "B"] }),
    ).toEqual({ name: "d", token: { kind: "TABLE", values: ["AA", "B"] } });
    expect(() => segmentToNamedToken({ name: "d", type: "TABLE", table: "t" })).toThrow(
      /Unknown table/,
    );
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
