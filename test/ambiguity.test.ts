import { describe, expect, it } from "vitest";
import { detect } from "../src/index.js";

/**
 * Pins the cross-country candidate sets for a fixed corpus of plates.
 *
 * Country-less `detect` is the library's most fragile emergent property: every
 * country added widens the candidate set of plates that were already modelled,
 * and nothing else makes that visible. `BAB123` silently went from two DE
 * candidates to nine across six countries while the documentation still
 * advertised two.
 *
 * This snapshot is not a correctness oracle — a growing set is usually correct
 * and expected. It is a blast-radius view: when it changes, read the diff, and
 * update the prose in `README.md` and `examples/index.html` if a documented
 * example is among the lines that moved.
 */

/**
 * Every plate documented in the README or the example page, plus the known
 * collisions the country suites rely on. Keep entries here forever: dropping one
 * loses the history of how its ambiguity evolved.
 */
const CORPUS = [
  // Spain — the shapes the README leads with.
  "1234 BCD",
  "R 1234 BCD",
  "C 1234 BCD",
  "CD 12 345",
  "OI12345",
  "M-1234-AB",
  // Documented ambiguity examples.
  "BAB123",
  "B-AB 123",
  "AA-123-AA",
  "AQ-123-AB",
  "00-00-AA",
  "0000AA",
  // Playground samples.
  "AA 00 AA",
  "B-XY 1234",
  "1-ABC-123",
  "Q-ABC-123",
  "WA-25-ABC",
  "X5FJPD",
  "053 EEN",
  "CJ 01 XYZ",
  "CA 1234 AB",
  "SE1234",
  "AB 12345",
] as const;

/** One deterministic line per input: status, reason and the candidate set. */
function describeDetection(input: string, includeHistorical: boolean): string {
  const result = detect(input, includeHistorical ? { includeHistorical } : {});
  const head = `${input.padEnd(12)} ${result.status}`;
  if (result.status === "VALID") {
    return `${head} ${result.country}:${result.scheme!.id} -> "${result.formatted}"`;
  }
  const reason = result.errors[0]?.reason ?? "-";
  if (result.status !== "AMBIGUOUS") return `${head} ${reason}`;
  // The formatting is part of the label: two candidates can share a scheme and
  // differ only in segmentation (Berlin "B-AB 123" vs Bamberg "BA-B 123").
  const candidates = (result.candidates ?? [])
    .map(
      (candidate) => `${candidate.country}:${candidate.scheme}="${candidate.formatted}"`,
    )
    .sort((a, b) => a.localeCompare(b));
  return `${head} ${reason} (${candidates.length}) ${candidates.join(" ")}`;
}

const table = (includeHistorical: boolean): string =>
  CORPUS.map((input) => describeDetection(input, includeHistorical)).join("\n");

describe("cross-country detection", () => {
  it("pins the candidate sets for the current-series schemes", () => {
    expect(table(false)).toMatchSnapshot();
  });

  it("pins the candidate sets with legacy series opted in", () => {
    expect(table(true)).toMatchSnapshot();
  });

  it("never resolves to a single scheme while reporting an ambiguity", () => {
    // A structural guarantee independent of the snapshot: AMBIGUOUS must carry
    // more than one candidate, and VALID must carry none.
    for (const input of CORPUS) {
      for (const opts of [{}, { includeHistorical: true }]) {
        const result = detect(input, opts);
        if (result.status === "AMBIGUOUS") {
          expect(result.candidates?.length, `${input} is AMBIGUOUS`).toBeGreaterThan(1);
          expect(result.scheme, `${input} must not also name a scheme`).toBeUndefined();
        } else {
          expect(result.candidates, `${input} is ${result.status}`).toBeUndefined();
        }
      }
    }
  });

  it("reports AMBIGUOUS_COUNTRY only when countries actually differ", () => {
    for (const input of CORPUS) {
      const result = detect(input, { includeHistorical: true });
      if (result.errors[0]?.reason !== "AMBIGUOUS_COUNTRY") continue;
      const countries = new Set((result.candidates ?? []).map((c) => c.country));
      expect(countries.size, `${input} claims a country ambiguity`).toBeGreaterThan(1);
    }
  });
});
