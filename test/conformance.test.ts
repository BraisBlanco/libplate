import { describe, expect, it } from "vitest";
import { METADATA } from "../src/generated/metadata.js";
import { parse } from "../src/index.js";

// Every scheme ships positive and negative examples. These assertions are the
// semantic self-checks the analysis asked the compiler to run (§15): a valid
// example must resolve to its own scheme, an invalid one must not.
for (const scheme of METADATA.schemes) {
  describe(`conformance: ${scheme.id}`, () => {
    for (const example of scheme.examples.valid) {
      it(`valid example "${example}" resolves to ${scheme.id}`, () => {
        const result = parse(example, { country: scheme.country });
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
