import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { METADATA } from "../src/generated/metadata.js";
import type { MetadataSegment, PlateScheme } from "../src/metadata/types.js";
import { normalize } from "../src/engine/normalize.js";
import { parse } from "../src/index.js";

/**
 * Structural invariants over all 187 schemes.
 *
 * These are the properties the JSON Schema cannot express and the build step
 * does not check: it validates one scheme's *syntax*, while these assert that a
 * scheme means what it claims across the engine. They are written as whole-set
 * sweeps rather than per-country cases so a new country inherits them for free.
 */

const FULL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const { schemes, tables } = METADATA;

const read = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

/** `{placeholder}` names used by a format template, in order. */
function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!);
}

/** The concrete lengths a segment can take. Mirrors the token grammar. */
function segmentLengths(segment: MetadataSegment): number[] {
  switch (segment.type) {
    case "LITERAL":
      return [segment.value.length];
    case "TABLE":
      return [...new Set((tables[segment.table] ?? []).map((v) => v.length))].sort(
        (a, b) => a - b,
      );
    case "PATTERNS":
      return [...new Set(segment.patterns.map((p) => p.length))].sort((a, b) => a - b);
    default: {
      if (segment.length !== undefined) return [segment.length];
      const lengths: number[] = [];
      for (let n = segment.minLength ?? 1; n <= (segment.maxLength ?? 1); n += 1) {
        lengths.push(n);
      }
      return lengths;
    }
  }
}

/** The characters a class-based segment accepts, or `null` if not class-based. */
function segmentAlphabet(segment: MetadataSegment): string | null {
  if (segment.type === "CHARSET") return segment.characters;
  if (segment.type === "DIGITS") return "0123456789";
  if (segment.type !== "LETTERS") return null;
  const excluded = new Set(segment.excluded ?? []);
  return [...FULL_ALPHABET].filter((c) => !excluded.has(c)).join("");
}

type ClassSegment = Extract<MetadataSegment, { type: "CHARSET" } | { type: "LETTERS" }>;
type PatternsSegment = Extract<MetadataSegment, { type: "PATTERNS" }>;

/** One position of a PATTERNS arrangement, made concrete. */
function samplePatternChar(ch: string, letters: string): string {
  // "7" for every digit position is safe under all three digitBlocks rules.
  if (ch === "N") return "7";
  if (ch === "L") return letters[0]!;
  return ch;
}

function samplePatternValue(segment: PatternsSegment, length: number): string | null {
  const pattern = segment.patterns.find((p) => p.length === length);
  if (!pattern) return null;
  const letters = segment.letters ?? FULL_ALPHABET;
  return [...pattern].map((ch) => samplePatternChar(ch, letters)).join("");
}

/** The first value a class-based segment accepts at `length`, skipping exclusions. */
function sampleClassValue(segment: ClassSegment, length: number): string | null {
  const alphabet = segmentAlphabet(segment)!;
  const forbidden = new Set(
    segment.type === "LETTERS" ? (segment.excludedValues ?? []) : [],
  );
  for (let offset = 0; offset < alphabet.length; offset += 1) {
    let value = "";
    for (let i = 0; i < length; i += 1) {
      value += alphabet[(offset + i) % alphabet.length]!;
    }
    if (!forbidden.has(value)) return value;
  }
  return null;
}

/** A concrete value this segment accepts at `length`, or `null` if none is. */
function sampleValue(segment: MetadataSegment, length: number): string | null {
  switch (segment.type) {
    case "LITERAL":
      return segment.value;
    case "TABLE":
      return (tables[segment.table] ?? []).find((v) => v.length === length) ?? null;
    case "PATTERNS":
      return samplePatternValue(segment, length);
    case "DIGITS":
      // Never a leading zero and never an all-zero block.
      return "1".repeat(length);
    default:
      return sampleClassValue(segment, length);
  }
}

/** Whether a length combination survives the scheme's disjunctive lengthRules. */
function satisfiesLengthRules(
  scheme: PlateScheme,
  lengths: Map<string, number>,
): boolean {
  const rules = scheme.lengthRules?.anyOf ?? [];
  if (rules.length === 0) return true;
  return rules.some(
    (rule) =>
      rule.segments.reduce((sum, name) => sum + (lengths.get(name) ?? 0), 0) <= rule.max,
  );
}

/** Every length combination the scheme admits, as name -> length maps. */
function lengthCombinations(scheme: PlateScheme): Map<string, number>[] {
  let combos: Map<string, number>[] = [new Map<string, number>()];
  for (const segment of scheme.segments) {
    combos = combos.flatMap((combo) =>
      segmentLengths(segment).map((len) => {
        const next = new Map<string, number>(combo);
        next.set(segment.name, len);
        return next;
      }),
    );
  }
  return combos.filter((combo) => satisfiesLengthRules(scheme, combo));
}

/** One accepted string per expansion of the scheme. */
function generateSamples(scheme: PlateScheme): string[] {
  const out: string[] = [];
  for (const combo of lengthCombinations(scheme)) {
    const parts = scheme.segments.map((segment) =>
      sampleValue(segment, combo.get(segment.name)!),
    );
    if (parts.every((part) => part !== null)) out.push(parts.join(""));
  }
  return out;
}

/** Whether a result accepts `id`, either outright or as one candidate. */
function accepts(input: string, country: string, id: string): boolean {
  const result = parse(input, { country });
  if (result.status === "VALID") return result.scheme?.id === id;
  if (result.status === "AMBIGUOUS") {
    return (result.candidates ?? []).some((candidate) => candidate.scheme === id);
  }
  return false;
}

describe("metadata — declared validity and appearance", () => {
  it("never declares a validity window that ends before it starts", () => {
    const broken = schemes.filter(
      (s) => s.validFrom && s.validTo && s.validFrom > s.validTo,
    );
    expect(broken.map((s) => s.id)).toEqual([]);
  });

  it("never prescribes a plate whose text is the same colour as its background", () => {
    const invisible = schemes.filter(
      (s) => s.visual?.background && s.visual.background === s.visual.foreground,
    );
    expect(invisible.map((s) => s.id)).toEqual([]);
  });

  it("ships at least one positive and one negative example per scheme", () => {
    // The JSON Schema requires the `examples` keys but not that they are
    // non-empty, so an empty list would silently test nothing in conformance.
    const thin = schemes
      .filter((s) => s.examples.valid.length === 0 || s.examples.invalid.length === 0)
      .map((s) => s.id);
    expect(thin).toEqual([]);
  });
});

describe("metadata — format templates", () => {
  it("reference only declared segments", () => {
    const unknown: string[] = [];
    for (const scheme of schemes) {
      const names = new Set(scheme.segments.map((s) => s.name));
      for (const template of [scheme.formats.national, scheme.formats.compact]) {
        for (const name of placeholders(template)) {
          if (!names.has(name)) unknown.push(`${scheme.id}: {${name}}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it("carry every segment, as a placeholder or as an inlined literal", () => {
    // 12 schemes write a LITERAL segment's value straight into the template
    // (e.g. DK_AIRPORT's "RF {number}") instead of using {prefix}. That is
    // allowed, but the character must be there either way — otherwise the
    // formatted output silently drops part of the plate.
    const dropped: string[] = [];
    for (const scheme of schemes) {
      for (const segment of scheme.segments) {
        for (const template of [scheme.formats.national, scheme.formats.compact]) {
          const named = placeholders(template).includes(segment.name);
          const inlined = segment.type === "LITERAL" && template.includes(segment.value);
          if (!named && !inlined) dropped.push(`${scheme.id}.${segment.name}`);
        }
      }
    }
    expect(dropped).toEqual([]);
  });

  it("are lossless: formatting a match preserves its compact string", () => {
    // The real guarantee behind the previous test, checked end to end.
    const lossy: string[] = [];
    for (const scheme of schemes) {
      for (const example of scheme.examples.valid) {
        const result = parse(example, { country: scheme.country });
        const formats = [
          ...(result.formatted === undefined ? [] : [result.formatted]),
          ...(result.candidates ?? []).map((c) => c.formatted),
        ];
        for (const formatted of formats) {
          if (normalize(formatted).compact !== result.normalized) {
            lossy.push(`${scheme.id}: "${example}" -> "${formatted}"`);
          }
        }
      }
    }
    expect(lossy).toEqual([]);
  });
});

describe("metadata — segment exclusions do real work", () => {
  it("excludedValues are reachable at some declared length", () => {
    const unreachable: string[] = [];
    for (const scheme of schemes) {
      for (const segment of scheme.segments) {
        if (segment.type !== "LETTERS") continue;
        const lengths = segmentLengths(segment);
        for (const value of segment.excludedValues ?? []) {
          if (!lengths.includes(value.length)) {
            unreachable.push(`${scheme.id}.${segment.name}: "${value}"`);
          }
        }
      }
    }
    expect(unreachable).toEqual([]);
  });

  it("excludedValues are not already forbidden by the segment alphabet", () => {
    // A redundant exclusion is a sign the author meant a different segment.
    const redundant: string[] = [];
    for (const scheme of schemes) {
      for (const segment of scheme.segments) {
        if (segment.type !== "LETTERS") continue;
        const alphabet = segmentAlphabet(segment)!;
        for (const value of segment.excludedValues ?? []) {
          if ([...value].some((ch) => !alphabet.includes(ch))) {
            redundant.push(`${scheme.id}.${segment.name}: "${value}"`);
          }
        }
      }
    }
    expect(redundant).toEqual([]);
  });
});

describe("metadata — the grammar accepts what it declares", () => {
  it("accepts a generated string for every expansion of every scheme", () => {
    // Generated from the metadata rather than hand-written, so it covers the
    // length combinations the 2-3 authored examples per scheme never reach.
    const rejected: string[] = [];
    let generated = 0;
    for (const scheme of schemes) {
      for (const sample of generateSamples(scheme)) {
        generated += 1;
        if (!accepts(sample, scheme.country, scheme.id)) {
          rejected.push(`${scheme.id}: "${sample}"`);
        }
      }
    }
    expect(rejected).toEqual([]);
    // Guard against the generator silently producing nothing.
    expect(generated).toBeGreaterThan(schemes.length * 2);
  });

  it("round-trips every valid example through both representations", () => {
    const broken: string[] = [];
    for (const scheme of schemes) {
      for (const example of scheme.examples.valid) {
        const compact = normalize(example).compact;
        if (!accepts(compact, scheme.country, scheme.id)) {
          broken.push(`${scheme.id}: compact "${compact}"`);
        }
        const result = parse(example, { country: scheme.country });
        const formatted =
          result.formatted ??
          (result.candidates ?? []).find((c) => c.scheme === scheme.id)?.formatted;
        if (formatted && !accepts(formatted, scheme.country, scheme.id)) {
          broken.push(`${scheme.id}: formatted "${formatted}"`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("is insensitive to case and to surrounding whitespace", () => {
    const drifted: string[] = [];
    for (const scheme of schemes) {
      for (const example of scheme.examples.valid) {
        const base = parse(example, { country: scheme.country }).status;
        for (const variant of [example.toLowerCase(), `  ${example}  `]) {
          const status = parse(variant, { country: scheme.country }).status;
          if (status !== base) {
            drifted.push(`${scheme.id}: "${variant}" is ${status}, not ${base}`);
          }
        }
      }
    }
    expect(drifted).toEqual([]);
  });
});

describe("build step and runtime agree", () => {
  it("uses the same expansion cap on both sides", () => {
    // scripts/build-metadata.mjs rejects runaway metadata at build time using a
    // copy of the runtime cap; a comment is the only thing tying them together.
    const cap = (source: string): string | undefined =>
      /MAX_EXPANSIONS = (\d+)/.exec(source)?.[1];
    const runtime = cap(read("src/tokens/index.ts"));
    expect(runtime).toBeDefined();
    expect(cap(read("scripts/build-metadata.mjs"))).toBe(runtime);
  });
});
