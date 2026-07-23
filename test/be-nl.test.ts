import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Belgium", () => {
  it("validates the standard series", () => {
    const result = parse("1-ABC-123", { country: "BE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("BE_STANDARD_CURRENT");
    expect(result.formatted).toBe("1-ABC-123");
    expect(result.visual).toEqual({ background: "WHITE", foreground: "RED" });
  });

  it("resolves uniquely in country-less detection", () => {
    const result = detect("2-XYZ-789");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("BE");
  });

  it("rejects a mis-shaped plate", () => {
    expect(parse("AB-123-CD", { country: "BE" }).status).toBe("INVALID");
  });
});

describe("Netherlands", () => {
  it("validates the current 2024 series", () => {
    const result = parse("GBB-01-B", { country: "NL" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("NL_CURRENT");
    expect(result.visual).toEqual({ background: "YELLOW", foreground: "BLACK" });
  });

  it("recognises the recent sidecodes", () => {
    expect(parse("G-001-BB", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_10");
    expect(parse("GB-001-B", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_9");
    expect(parse("1-KBB-00", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_8");
  });

  it("rejects vowels and other omitted letters", () => {
    // A is a vowel; Dutch plates omit vowels, C, Q, M, W.
    expect(parse("AAA-01-B", { country: "NL" }).status).toBe("INVALID");
    expect(parse("MWB-01-B", { country: "NL" }).status).toBe("INVALID");
  });

  it("resolves uniquely in country-less detection", () => {
    const result = detect("GBB-01-B");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("NL");
    expect(result.scheme?.id).toBe("NL_CURRENT");
  });

  it("recognises the older sidecodes with a country hint", () => {
    expect(parse("ND-00-01", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_1");
    expect(parse("00-01-AD", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_2");
    expect(parse("00-AD-01", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_3");
    expect(parse("DB-01-BB", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_4");
    expect(parse("DB-BB-01", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_5");
    expect(parse("01-DB-BB", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_6");
    expect(parse("01-GBB-1", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_7");
    expect(parse("V-01-BBB", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_12");
  });

  it("allows vowels in sidecodes 1-3 but not from sidecode 4 on", () => {
    // AB-00-84 is a register-attested 1961 plate; vowels only disappeared
    // with sidecode 4 (1978).
    expect(parse("AB-00-84", { country: "NL" }).status).toBe("VALID");
    expect(parse("AB-12-CD", { country: "NL" }).status).toBe("INVALID");
  });

  it("keeps legacy sidecodes opt-in in country-less detection", () => {
    // Sidecode 1 is legacy: invisible without the flag…
    expect(detect("ND-00-01").status).toBe("INVALID");
    // …and with it, XX-99-99 collides with the Portuguese pre-1992 series.
    const result = detect("ND-00-01", { includeHistorical: true });
    expect(result.status).toBe("AMBIGUOUS");
    const countries = result.candidates?.map((c) => c.country).sort();
    expect(countries).toEqual(["NL", "PT"]);
  });

  it("resolves a Dutch trailer-shaped plate to Portugal without the flag", () => {
    // XX-99-XX (sidecode 4, still current for NL trailers) has the same
    // compact shape as the current Portuguese AA-00-AA series. Without a
    // country hint the non-legacy PT reading wins; the flag restores the
    // ambiguity.
    expect(detect("DB-01-BB").country).toBe("PT");
    expect(detect("DB-01-BB", { includeHistorical: true }).status).toBe("AMBIGUOUS");
  });
});
