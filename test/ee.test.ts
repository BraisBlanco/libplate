import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Estonia — ordinary marks", () => {
  it("parses the standard three-digit + three-letter mark (type A1)", () => {
    const result = parse("053 EEN", { country: "EE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("EE_STANDARD");
    expect(result.formatted).toBe("053 EEN");
    expect(result.scheme?.components).toEqual({ number: "053", letters: "EEN" });
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
    expect(result.vehicle?.possibleCategories).toContain("TRAILER_OR_SEMITRAILER");
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("separates the reduced-size mark by its digit count (type A3)", () => {
    // The 302×152 mm plate carries two digits, not three (lisa 3 näidis 3).
    expect(parse("17 ELH", { country: "EE" }).scheme?.id).toBe("EE_STANDARD_REDUCED");
    expect(parse("053 EEN", { country: "EE" }).scheme?.id).toBe("EE_STANDARD");
  });

  it("enforces the W ban on the plates that carry it", () => {
    // § 6 lg 4: W is forbidden on A3, B1, B2, B3 and D2 marks.
    expect(parse("17 WLH", { country: "EE" }).status).toBe("INVALID");
    expect(parse("53 WF", { country: "EE" }).status).toBe("INVALID");
    expect(parse("533 W", { country: "EE" }).status).toBe("INVALID");
    // …but W is allowed once on the full-size A1 mark (general § 6 lg 4 case).
    expect(parse("053 WEN", { country: "EE" }).scheme?.id).toBe("EE_STANDARD");
  });

  it("accepts both digit/letter arrangements of motorcycle marks", () => {
    // § 7 lg 2: on a B1 mark the digits may sit before or after the letters.
    const digitsFirst = parse("53 HF", { country: "EE" });
    expect(digitsFirst.scheme?.id).toBe("EE_MOTORCYCLE");
    expect(digitsFirst.vehicle?.possibleCategories).toContain("MOTORCYCLE");
    expect(parse("HF 53", { country: "EE" }).scheme?.id).toBe("EE_MOTORCYCLE");
  });

  it("parses moped marks and reports the green plate", () => {
    const result = parse("533 F", { country: "EE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("EE_MOPED");
    expect(result.visual).toEqual({ background: "GREEN", foreground: "BLACK" });
  });

  it("parses tractor and self-propelled machine marks (types E1/E2)", () => {
    const result = parse("6269 EO", { country: "EE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("EE_TRACTOR");
    expect(result.vehicle?.possibleCategories).toEqual([
      "AGRICULTURAL_VEHICLE",
      "INDUSTRIAL_MACHINE",
      "TRAILER",
    ]);
    // W may be used only once (§ 6 lg 4), so WW is not issued.
    expect(parse("6269 WW", { country: "EE" }).status).toBe("INVALID");
  });
});

describe("Estonia — special marks", () => {
  it("parses diplomatic marks and reports the blue plate", () => {
    const staff = parse("CD 2345", { country: "EE" });
    expect(staff.status).toBe("VALID");
    expect(staff.scheme?.id).toBe("EE_DIPLOMATIC");
    expect(staff.registration?.diplomatic).toBe(true);
    expect(staff.visual).toEqual({ background: "BLUE", foreground: "WHITE" });

    // The reduced-size A6 variant carries three digits.
    expect(parse("CD 000", { country: "EE" }).scheme?.id).toBe("EE_DIPLOMATIC");
    // Heads of mission carry CMD (types A5/A7).
    expect(parse("CMD 234", { country: "EE" }).scheme?.id).toBe("EE_DIPLOMATIC_HEAD");
    expect(parse("CMD 00", { country: "EE" }).scheme?.id).toBe("EE_DIPLOMATIC_HEAD");
  });

  it("parses transferable dealer marks", () => {
    const result = parse("PROOV 1203", { country: "EE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("EE_DEALER");
    expect(result.registration?.temporary).toBe(true);
  });

  it("parses veteran marks and reports the historical regime", () => {
    const result = parse("W 433", { country: "EE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("EE_HISTORICAL");
    expect(result.registration?.historical).toBe(true);
    expect(result.visual).toEqual({ background: "BLACK", foreground: "WHITE" });
  });

  it("uses separators to split veteran marks from letter-first moped marks", () => {
    // Both series are one letter and three digits; § 7 lg 2 allows the moped
    // letter to lead, so the compact form is genuinely ambiguous.
    const compact = parse("M433", { country: "EE" });
    expect(compact.status).toBe("AMBIGUOUS");
    expect(compact.errors[0]?.reason).toBe("AMBIGUOUS_SCHEME");
    expect(
      compact.candidates?.map((c) => c.scheme).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["EE_HISTORICAL", "EE_MOPED"]);
    // A veteran mark writes its two fields apart; the moped's single field
    // cannot take a separator there.
    expect(parse("M 433", { country: "EE" }).scheme?.id).toBe("EE_HISTORICAL");
  });
});

describe("Estonia — country-less detection", () => {
  it("resolves the standard series uniquely", () => {
    const result = detect("053 EEN");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("EE");
  });

  it("reports the CD overlap with Germany and Spain", () => {
    const result = detect("CD1245");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      result.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["DE", "EE", "ES"]);
  });
});
