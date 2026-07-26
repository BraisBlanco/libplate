import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Germany — standard plates", () => {
  it("validates and parses a standard plate", () => {
    const result = parse("B-XY 1234", { country: "DE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("DE_STANDARD");
    expect(result.formatted).toBe("B-XY 1234");
    expect(result.scheme?.components).toEqual({
      district: "B",
      letters: "XY",
      number: "1234",
    });
    expect(result.registration?.historical).toBeNull();
  });

  it("accepts umlaut district codes", () => {
    const result = parse("WÜ-AB 12", { country: "DE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.components?.["district"]).toBe("WÜ");
  });

  it("rejects district codes outside the official table", () => {
    expect(parse("XX-AB 123", { country: "DE" }).status).toBe("INVALID");
  });

  it("rejects a leading zero in the Erkennungsnummer", () => {
    expect(parse("B-AB 0123", { country: "DE" }).status).toBe("INVALID");
  });

  it("enforces the eight-character limit of Anlage 4", () => {
    expect(parse("HH-AB 1234", { country: "DE" }).status).toBe("VALID"); // 8
    expect(parse("BIT-XY 1234", { country: "DE" }).status).toBe("INVALID"); // 9
  });
});

describe("Germany — segmentation ambiguity", () => {
  it("reports AMBIGUOUS when the compact form admits several splits", () => {
    // B|AB 123 (Berlin) and BA|B 123 (Bamberg) are both valid readings.
    const result = parse("BAB123", { country: "DE" });
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_SEGMENTATION");
    const districts = result.candidates?.map((c) => c.components["district"]);
    expect(districts).toEqual(["B", "BA"]);
  });

  it("uses the caller's separators as evidence to resolve the split", () => {
    const berlin = parse("B-AB 123", { country: "DE" });
    expect(berlin.status).toBe("VALID");
    expect(berlin.scheme?.components?.["district"]).toBe("B");
    expect(berlin.formatted).toBe("B-AB 123");

    const bamberg = parse("BA-B 123", { country: "DE" });
    expect(bamberg.status).toBe("VALID");
    expect(bamberg.scheme?.components?.["district"]).toBe("BA");
    expect(bamberg.formatted).toBe("BA-B 123");
  });

  it("keeps every reading when the separators match none of them", () => {
    // A separator inside every candidate's segments must not reject a plate
    // whose compact form is valid; the ambiguity is simply reported.
    const result = parse("B A B 1 2 3", { country: "DE" });
    expect(result.status).toBe("AMBIGUOUS");
  });
});

describe("Germany — H and E suffixes", () => {
  it("validates an Oldtimer plate and reports the historical regime", () => {
    const result = parse("B-XY 123H", { country: "DE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("DE_HISTORIC");
    expect(result.formatted).toBe("B-XY 123H");
    expect(result.registration?.historical).toBe(true);
  });

  it("validates an E plate as an ordinary registration", () => {
    const result = parse("M-XY 123E", { country: "DE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("DE_ELECTRIC");
    expect(result.registration?.historical).toBeNull();
  });

  it("applies the tighter H/E length limits of Anlage 4", () => {
    // 3+2+3 = 8 characters: too long for a one-line plate (max 7) but the
    // identifier fits a two-line plate (max 5), so it is accepted.
    expect(parse("BIT-AB 123H", { country: "DE" }).status).toBe("VALID");
    // 2+2+4 = 8 with a six-character identifier: allowed on no layout.
    expect(parse("HH-AB 1234H", { country: "DE" }).status).toBe("INVALID");
    expect(parse("HH-AB 1234E", { country: "DE" }).status).toBe("INVALID");
    // The same combination without a suffix is a valid standard plate.
    expect(parse("HH-AB 1234", { country: "DE" }).status).toBe("VALID");
  });
});

describe("Germany — detection without a country hint", () => {
  it("resolves a separator-written plate to DE", () => {
    const result = detect("WÜ-AB 12");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("DE");
    expect(result.scheme?.id).toBe("DE_STANDARD");
  });

  it("does not clash with the FR/IT cross-country ambiguity", () => {
    const result = detect("AB-123-CD");
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_COUNTRY");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["FR", "IT", "SK"]);
  });
});
