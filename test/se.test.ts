import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Sweden — ordinary series", () => {
  it("parses three letters + three digits", () => {
    const result = parse("ABC 123", { country: "SE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SE_ORDINARY");
    expect(result.formatted).toBe("ABC 123");
    expect(result.scheme?.components).toEqual({ letters: "ABC", number: "123" });
    // The same characters serve every vehicle kind and the taxi, temporary,
    // provisional and competition plates, so nothing is inferable.
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("rejects the letters Transportstyrelsen does not use", () => {
    for (const plate of ["IBC 123", "AQC 123", "ABV 123"]) {
      expect(parse(plate, { country: "SE" }).status).toBe("INVALID");
    }
    expect(parse("OBC 123", { country: "SE" }).scheme?.id).toBe("SE_ORDINARY");
  });

  it("parses the 2019 format whose last character is a letter", () => {
    const result = parse("ABC 12A", { country: "SE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SE_ORDINARY_LETTER_SUFFIX");
    expect(result.scheme?.components).toEqual({ letters: "ABC", serial: "12A" });
    // It only exists since 2019-01-16.
    expect(parse("ABC 12A", { country: "SE", referenceDate: "2018-06-01" }).status).toBe(
      "INVALID",
    );
    // …while the digit form is not date-limited.
    expect(
      parse("ABC 123", { country: "SE", referenceDate: "2018-06-01" }).scheme?.id,
    ).toBe("SE_ORDINARY");
  });

  it("never uses O as the last character", () => {
    expect(parse("ABC 12O", { country: "SE" }).status).toBe("INVALID");
    expect(parse("ABC 12P", { country: "SE" }).scheme?.id).toBe(
      "SE_ORDINARY_LETTER_SUFFIX",
    );
  });
});

describe("Sweden — diplomatic plates", () => {
  it("parses country code + serial + category code", () => {
    const result = parse("AB 123 C", { country: "SE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SE_DIPLOMATIC");
    expect(result.scheme?.components).toEqual({
      mission: "AB",
      serial: "123",
      category: "C",
    });
    expect(result.registration?.type).toBe("DIPLOMATIC");
    expect(result.visual).toEqual({ background: "BLUE", foreground: "BLACK" });
  });

  it("shares its shape with Italian and French series", () => {
    // Two letters + three digits + one letter is also an Italian
    // agricultural-machine plate, so country-less detection must not pick one.
    const result = detect("AB 123 C");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      result.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["IT", "SE"]);
    // The closed 2004-2015 French moped series joins them when legacy series
    // are opted in.
    const withLegacy = detect("AB 123 C", { includeHistorical: true });
    expect(
      withLegacy.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["FR", "IT", "SE"]);
  });
});
