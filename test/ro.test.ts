import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Romania — ordinary series", () => {
  it("parses a county plate", () => {
    const result = parse("CJ 01 XYZ", { country: "RO" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("RO_ORDINARY");
    expect(result.formatted).toBe("CJ 01 XYZ");
    expect(result.scheme?.components).toEqual({
      indicative: "CJ",
      number: "01",
      letters: "XYZ",
    });
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("allows a third digit only behind the single-letter Bucharest indicative", () => {
    // A plate holds seven characters: B + 3 digits + 3 letters fits, a
    // two-letter county code + 3 digits + 3 letters does not.
    expect(parse("B 117 VAY", { country: "RO" }).scheme?.id).toBe("RO_ORDINARY");
    expect(parse("B 12 ABC", { country: "RO" }).scheme?.id).toBe("RO_ORDINARY");
    expect(parse("CJ 117 VAY", { country: "RO" }).status).toBe("INVALID");
  });

  it("rejects order numbers outside the issued ranges", () => {
    // Two digits run 01-99, three digits 100-999.
    expect(parse("B 00 ABC", { country: "RO" }).status).toBe("INVALID");
    expect(parse("B 099 ABC", { country: "RO" }).status).toBe("INVALID");
    expect(parse("B 1 ABC", { country: "RO" }).status).toBe("INVALID");
  });

  it("rejects indicatives outside the official list", () => {
    expect(parse("XY 12 ABC", { country: "RO" }).status).toBe("INVALID");
    expect(parse("RO 12 ABC", { country: "RO" }).status).toBe("INVALID");
  });

  it("needs separators to tell a compact Bucharest plate from an Austrian one", () => {
    // "B12ABC" also reads as the Austrian plate B (Burgenland-Land) 12ABC.
    const compact = detect("B12ABC");
    expect(compact.status).toBe("AMBIGUOUS");
    expect(
      compact.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["AT", "RO"]);
    // The Romanian reading has a boundary after the order number as well.
    expect(detect("B 12 ABC").country).toBe("RO");
  });

  it("covers motorcycles, which are înmatriculate", () => {
    // Art. 26 alin. (1) of the Regulament has the owner fit the plate "la
    // motocicletă ... numai la partea din spate"; mopeds are înregistrate.
    const categories = parse("CJ 01 XYZ", { country: "RO" }).vehicle?.possibleCategories;
    expect(categories).toContain("MOTORCYCLE");
    expect(categories).not.toContain("MOPED_OR_MOTOR_CYCLE");
  });
});

describe("Romania — provisional and probe numbers", () => {
  it("parses a provisional number, leading zeros included", () => {
    const result = parse("B 012345", { country: "RO" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("RO_PROVISIONAL");
    expect(result.registration?.type).toBe("TEMPORARY_PRIVATE");
    expect(result.registration?.temporary).toBe(true);
    expect(result.scheme?.components).toEqual({ indicative: "B", number: "012345" });
    // Art. 26 alin. (1) of Ordinul 181/2024 sends provisional plate colours to
    // the unpublished state standard, so the red-on-white is not asserted.
    expect(result.visual).toBeUndefined();
  });

  it("bounds the provisional order number by the plate's seven characters", () => {
    expect(parse("CJ 12345", { country: "RO" }).status).toBe("VALID");
    expect(parse("CJ 123456", { country: "RO" }).status).toBe("INVALID");
    expect(parse("B 123456", { country: "RO" }).status).toBe("VALID");
    expect(parse("B 1234567", { country: "RO" }).status).toBe("INVALID");
  });

  it("parses a probe number and keeps the PROBE inscription last", () => {
    const result = parse("TM-12-PROBE", { country: "RO" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("RO_PROBE");
    expect(result.registration?.type).toBe("PROFESSIONAL_TEMPORARY");
    expect(result.formatted).toBe("TM 12 PROBE");
    // Art. 23 alin. (5) fixes the order: indicative, order number, inscription.
    expect(parse("TM-PROBE-12", { country: "RO" }).status).toBe("INVALID");
  });

  it("leaves a provisional number ambiguous without a country hint", () => {
    // Indicative + digits alone is the widest shape libplate models for RO, and
    // it collides with the Austrian Land/authority series among others.
    const compact = detect("B 12345");
    expect(compact.status).toBe("AMBIGUOUS");
    expect(compact.candidates?.map((c) => c.country)).toContain("AT");
    expect(compact.candidates?.map((c) => c.country)).toContain("RO");
    // The PROBE inscription anchors its scheme, so that one needs no hint.
    expect(detect("B 12 PROBE").scheme?.id).toBe("RO_PROBE");
  });
});
