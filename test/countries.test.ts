import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Portugal", () => {
  it("validates the current general series", () => {
    const result = parse("AA 01 AA", { country: "PT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_GENERAL_CURRENT");
    expect(result.normalized).toBe("AA01AA");
    expect(result.formatted).toBe("AA 01 AA");
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
  });

  it("rejects the wrong digit count", () => {
    expect(parse("AA 000 AA", { country: "PT" }).status).toBe("INVALID");
  });
});

describe("France", () => {
  it("validates the current SIV series", () => {
    const result = parse("AA-123-AA", { country: "FR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FR_SIV_CURRENT");
    expect(result.formatted).toBe("AA-123-AA");
    expect(result.vehicle?.inferenceLevel).toBe("REGISTRY_REQUIRED");
  });

  it("rejects excluded letters (I, O, U)", () => {
    expect(parse("IO-123-AA", { country: "FR" }).status).toBe("INVALID");
  });
});

describe("Italy", () => {
  it("validates the current ordinary series", () => {
    const result = parse("AB 123 CD", { country: "IT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("IT_CURRENT");
    expect(result.formatted).toBe("AB 123 CD");
  });

  it("rejects excluded letters (I, O, Q, U)", () => {
    expect(parse("AQ 123 AA", { country: "IT" }).status).toBe("INVALID");
  });
});

describe("cross-country ambiguity", () => {
  it("reports FR and IT as candidates for a shared LL-NNN-LL shape", () => {
    // "AB123CD" is a valid SIV plate and a valid Italian plate; without a
    // country hint the library must not guess.
    const result = detect("AB-123-CD");
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_COUNTRY");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["FR", "IT"]);
  });

  it("resolves uniquely when the alphabets differ", () => {
    // Q is allowed in the French alphabet but excluded in the Italian one.
    const result = detect("AQ-123-AB");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("FR");
  });
});
