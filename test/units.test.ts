import { describe, expect, it } from "vitest";
import { compilePattern, extractComponents, matchAll } from "../src/tokens/index.js";
import { segmentToNamedToken } from "../src/metadata/types.js";
import { applyFormat, buildCandidate, isActiveOn } from "../src/engine/scheme.js";
import { normalize, separatorBoundaries } from "../src/engine/normalize.js";
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

  it("applies an excluded value only to the expansion of its own length", () => {
    // The Finnish ordinary mark: 2-3 letters, but "CD" belongs to diplomatic
    // vehicles. A longer group that merely starts with CD is unaffected.
    const compiled = compilePattern([
      {
        name: "letters",
        token: { kind: "LETTERS", length: { min: 2, max: 3 }, excludedValues: ["CD"] },
      },
      { name: "number", token: { kind: "DIGITS", length: 2, noLeadingZero: true } },
    ]);
    expect(matchAll("CD12", compiled)).toEqual([]);
    expect(matchAll("CDE12", compiled)).toEqual([{ letters: "CDE", number: "12" }]);
    expect(matchAll("AB12", compiled)).toEqual([{ letters: "AB", number: "12" }]);
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

  it("allows exactly the cap and rejects one shape more", () => {
    // The cap is 64 shapes. Two 8-length-choice tokens make exactly 64, which
    // must pass; 8 x 9 = 72 must not. This pins the comparison at the boundary.
    const choices = (max: number) =>
      ({ kind: "DIGITS", length: { min: 1, max } }) as const;
    expect(
      compilePattern([
        { name: "a", token: choices(8) },
        { name: "b", token: choices(8) },
      ]).expansions,
    ).toHaveLength(64);
    expect(() =>
      compilePattern([
        { name: "a", token: choices(8) },
        { name: "b", token: choices(9) },
      ]),
    ).toThrow(/fixed-length shapes/);
  });

  it("forbids a leading zero even on a single-digit group", () => {
    const compiled = compilePattern([
      { name: "n", token: { kind: "DIGITS", length: 1, noLeadingZero: true } },
    ]);
    expect(matchAll("7", compiled)).toEqual([{ n: "7" }]);
    expect(matchAll("0", compiled)).toEqual([]);
  });

  it("throws when length rules leave no combination at all", () => {
    expect(() =>
      compilePattern(
        [{ name: "a", token: { kind: "LETTERS", length: { min: 2, max: 3 } } }],
        [{ segments: ["a"], max: 1 }],
      ),
    ).toThrow(/no length combination/);
  });

  it("reports the length bounds its expansions actually accept", () => {
    // minLength/maxLength are part of CompiledPattern's contract. Nothing else
    // pins them: the per-expansion length filter makes the bounds check in
    // matchAll a pure fast path, so a wrong bound changes no outcome.
    const compiled = compilePattern([
      { name: "letters", token: { kind: "LETTERS", length: { min: 1, max: 3 } } },
      { name: "digits", token: { kind: "DIGITS", length: 2 } },
    ]);
    expect(compiled.minLength).toBe(3);
    expect(compiled.maxLength).toBe(5);
  });
});

describe("tokens — PATTERNS", () => {
  it("merges same-length arrangements into one expansion and splits by length", () => {
    const compiled = compilePattern([
      { name: "s", token: { kind: "PATTERNS", patterns: ["NNL", "NLL", "NNNL"] } },
    ]);
    // Two distinct lengths -> two expansions; 3-char arrangements share one.
    expect(compiled.expansions).toHaveLength(2);
    expect(matchAll("12A", compiled)).toEqual([{ s: "12A" }]);
    expect(matchAll("1AB", compiled)).toEqual([{ s: "1AB" }]);
    expect(matchAll("AB1", compiled)).toEqual([]); // letter-first not declared
    expect(matchAll("123A", compiled)).toEqual([{ s: "123A" }]);
  });

  it("treats non-N/L pattern characters as literals", () => {
    const compiled = compilePattern([
      { name: "s", token: { kind: "PATTERNS", patterns: ["NNPNN"] } },
    ]);
    expect(matchAll("12P34", compiled)).toEqual([{ s: "12P34" }]);
    expect(matchAll("12A34", compiled)).toEqual([]);
  });

  it("restricts L positions to the declared letter set", () => {
    const compiled = compilePattern([
      { name: "s", token: { kind: "PATTERNS", patterns: ["NL"], letters: "ACE" } },
    ]);
    expect(matchAll("1A", compiled)).toEqual([{ s: "1A" }]);
    expect(matchAll("1B", compiled)).toEqual([]);
  });

  it("applies digit-block rules across runs that mix N with digit literals", () => {
    // The French diplomatic country codes are written "1NN" (100-199): a run
    // where a literal digit sits beside N positions. Nothing in the shipped
    // metadata exercises this combination, so these are the only cases that
    // reach it.
    const leadingN = compilePattern([
      {
        name: "s",
        token: { kind: "PATTERNS", patterns: ["NN1"], digitBlocks: "NO_LEADING_ZERO" },
      },
    ]);
    // Position 0 is an N, so NO_LEADING_ZERO tightens it to [1-9] even though
    // the run also contains a literal.
    expect(matchAll("111", leadingN)).toEqual([{ s: "111" }]);
    expect(matchAll("011", leadingN)).toEqual([]);

    // A literal first digit satisfies the rule by itself: the N positions after
    // it stay [0-9].
    const literalFirst = compilePattern([
      {
        name: "s",
        token: { kind: "PATTERNS", patterns: ["1NN"], digitBlocks: "NO_LEADING_ZERO" },
      },
    ]);
    expect(matchAll("100", literalFirst)).toEqual([{ s: "100" }]);
    expect(matchAll("199", literalFirst)).toEqual([{ s: "199" }]);

    // NO_ZERO_BLOCK needs its lookahead only when the literals alone cannot
    // rule the all-zero run out.
    const zeroLiteral = compilePattern([
      {
        name: "s",
        token: { kind: "PATTERNS", patterns: ["N0N"], digitBlocks: "NO_ZERO_BLOCK" },
      },
    ]);
    expect(matchAll("000", zeroLiteral)).toEqual([]);
    expect(matchAll("001", zeroLiteral)).toEqual([{ s: "001" }]);
    expect(matchAll("100", zeroLiteral)).toEqual([{ s: "100" }]);

    // Here a non-zero literal already excludes the all-zero run, so leading
    // zeros stay legal.
    const nonZeroLiteral = compilePattern([
      {
        name: "s",
        token: { kind: "PATTERNS", patterns: ["N1N"], digitBlocks: "NO_ZERO_BLOCK" },
      },
    ]);
    expect(matchAll("010", nonZeroLiteral)).toEqual([{ s: "010" }]);
  });

  it("applies the digit-block rules per maximal digit run", () => {
    const noZeroBlock = compilePattern([
      {
        name: "s",
        token: { kind: "PATTERNS", patterns: ["NNNLN"], digitBlocks: "NO_ZERO_BLOCK" },
      },
    ]);
    // Leading zeros are fine; an all-zero run is not — per run, not per char.
    expect(matchAll("001A1", noZeroBlock)).toEqual([{ s: "001A1" }]);
    expect(matchAll("000A1", noZeroBlock)).toEqual([]);
    expect(matchAll("001A0", noZeroBlock)).toEqual([]); // single-digit run = 1-9

    const noLeadingZero = compilePattern([
      {
        name: "s",
        token: { kind: "PATTERNS", patterns: ["NNL"], digitBlocks: "NO_LEADING_ZERO" },
      },
    ]);
    expect(matchAll("10A", noLeadingZero)).toEqual([{ s: "10A" }]);
    expect(matchAll("01A", noLeadingZero)).toEqual([]);
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

  it("isActiveOn treats both bounds as inclusive", () => {
    // A series is being issued on the day it starts and on the day it ends.
    const bounded = { ...scheme, validFrom: "2000-09-17", validTo: "2010-01-01" };
    expect(isActiveOn(bounded, "2000-09-17")).toBe(true);
    expect(isActiveOn(bounded, "2010-01-01")).toBe(true);
    expect(isActiveOn(bounded, "2000-09-16")).toBe(false);
    expect(isActiveOn(bounded, "2010-01-02")).toBe(false);
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

describe("normalize", () => {
  it("strips separators anywhere, including the edges", () => {
    expect(normalize("  b-ab 123  ").compact).toBe("BAB123");
    expect(normalize("\tB.AB–123\n").compact).toBe("BAB123");
    // The raw form is kept byte for byte, whitespace included.
    expect(normalize("  x ").raw).toBe("  x ");
  });

  it("keeps boundary indices aligned when uppercasing expands a character", () => {
    // "ß" uppercases to "SS": one raw character becomes two compact ones, so
    // the boundary after it must advance by two. Lowercasing would not expand,
    // which is exactly the off-by-one this pins down.
    expect(normalize("a-ß-b").compact).toBe("ASSB");
    expect([...separatorBoundaries("a-ß-b")]).toEqual([1, 3]);
  });

  it("ignores leading and trailing separators as boundaries", () => {
    expect([...separatorBoundaries("-B-AB-123-")]).toEqual([1, 3]);
    expect([...separatorBoundaries("   ")]).toEqual([]);
  });
});

describe("engine edge cases", () => {
  it("rejects overly long input", () => {
    const result = parse("A".repeat(100), { country: "ES" });
    expect(result.status).toBe("INVALID");
    expect(result.errors[0]?.reason).toBe("TOO_LONG");
  });

  it("draws the length limit at exactly 64 characters", () => {
    // The README documents TOO_LONG as "over 64 characters", so 64 must be
    // rejected for its shape instead, not for its length.
    expect(parse("A".repeat(64), { country: "ES" }).errors[0]?.reason).toBe(
      "INVALID_STRUCTURE",
    );
    expect(parse("A".repeat(65), { country: "ES" }).errors[0]?.reason).toBe("TOO_LONG");
  });

  it("exposes the library version", () => {
    expect(getLibraryVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
