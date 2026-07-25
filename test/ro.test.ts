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
});
