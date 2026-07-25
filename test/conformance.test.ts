import { describe, expect, it } from "vitest";
import { METADATA } from "../src/generated/metadata.js";
import { parse } from "../src/index.js";

// Every scheme ships positive and negative examples. These assertions are the
// semantic self-checks the analysis asked the compiler to run (§15): a valid
// example must resolve to its own scheme, an invalid one must not.

/**
 * Schemes wide enough to be excluded from country-less detection. One of them,
 * `CZ_ORDINARY`, is a free-form space (§ 24 odst. 2 of the Czech regulation
 * makes a standard mark ANY 5-8 alphanumeric characters), so it contains every
 * anchored Czech series. A valid example of one of those series is therefore
 * allowed to come back AMBIGUOUS — but only against schemes on this list, and
 * only with its own scheme among the candidates. Two precise schemes colliding
 * still fails, which is what keeps this suite a real check.
 */
const wideSchemeIds = new Set(
  METADATA.schemes.filter((s) => s.legacySeries).map((s) => s.id),
);

for (const scheme of METADATA.schemes) {
  describe(`conformance: ${scheme.id}`, () => {
    for (const example of scheme.examples.valid) {
      it(`valid example "${example}" resolves to ${scheme.id}`, () => {
        const result = parse(example, { country: scheme.country });
        if (result.status === "AMBIGUOUS" && !wideSchemeIds.has(scheme.id)) {
          const candidates = result.candidates ?? [];
          expect(candidates.map((c) => c.scheme)).toContain(scheme.id);
          const shadowing = candidates
            .map((c) => c.scheme)
            .filter((id) => id !== scheme.id);
          expect(shadowing.length).toBeGreaterThan(0);
          expect(shadowing.every((id) => wideSchemeIds.has(id))).toBe(true);
          return;
        }
        expect(result.status).toBe("VALID");
        expect(result.scheme?.id).toBe(scheme.id);
      });
    }

    for (const example of scheme.examples.invalid) {
      it(`invalid example "${example}" does not resolve to ${scheme.id}`, () => {
        const result = parse(example, { country: scheme.country });
        const resolvedToThisScheme =
          result.status === "VALID" && result.scheme?.id === scheme.id;
        expect(resolvedToThisScheme).toBe(false);
      });
    }
  });
}
