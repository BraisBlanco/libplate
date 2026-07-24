import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Austria — standard-issue plates", () => {
  it("parses a standard plate (digits then letters)", () => {
    const result = parse("KI 234AB", { country: "AT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("AT_STANDARD");
    expect(result.formatted).toBe("KI-234AB");
    expect(result.scheme?.components).toEqual({ district: "KI", serial: "234AB" });
  });

  it("accepts serials from three to six characters", () => {
    // 3 = single-line historic / moped lengths; 6 = Land capitals and Vienna.
    expect(parse("W 12A", { country: "AT" }).status).toBe("VALID");
    expect(parse("W 12345A", { country: "AT" }).status).toBe("VALID");
    expect(parse("B 1A", { country: "AT" }).status).toBe("INVALID");
    expect(parse("W 123456A", { country: "AT" }).status).toBe("INVALID");
  });

  it("keeps codes retired by district mergers valid (plates in circulation)", () => {
    // Judenburg (JU) merged into Murtal (MT) in 2012; both remain legal text.
    expect(parse("JU 123A", { country: "AT" }).status).toBe("VALID");
    expect(parse("MT 123A", { country: "AT" }).status).toBe("VALID");
  });

  it("enforces the KDV § 26 letter and digit rules", () => {
    // Q is prohibited (Abs. 6 Z 4); 0 never leads the digit block (Z 5).
    expect(parse("W 12Q", { country: "AT" }).status).toBe("INVALID");
    expect(parse("W 0123A", { country: "AT" }).status).toBe("INVALID");
    // Standard serials need at least one trailing letter; all-digit serials
    // belong to the unmodelled A/Land/authority series.
    expect(parse("W 1234", { country: "AT" }).status).toBe("INVALID");
  });

  it("rejects authority codes outside Anlage 5d", () => {
    expect(parse("X 123A", { country: "AT" }).status).toBe("INVALID");
    expect(parse("XY 123A", { country: "AT" }).status).toBe("INVALID");
  });

  it("was not valid before the 1989 white-plate changeover", () => {
    const result = parse("KI 234AB", { country: "AT", referenceDate: "1988-06-01" });
    expect(result.status).toBe("INVALID");
  });
});

describe("Austria — Wunschkennzeichen", () => {
  it("parses a chosen serial (letters then digits)", () => {
    const result = parse("W ABC123", { country: "AT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("AT_WUNSCHKENNZEICHEN");
    expect(result.formatted).toBe("W-ABC123");
  });

  it("resolves the district/serial split with the caller's separators", () => {
    // Compact KIAB12 reads as KI-AB12 or K-IAB12; both are Wunschkennzeichen.
    const compact = parse("KIAB12", { country: "AT" });
    expect(compact.status).toBe("AMBIGUOUS");
    expect(compact.errors[0]?.reason).toBe("AMBIGUOUS_SEGMENTATION");

    const separated = parse("KI AB12", { country: "AT" });
    expect(separated.status).toBe("VALID");
    expect(separated.scheme?.components?.["district"]).toBe("KI");
  });

  it("requires letters first, digits last, in closed blocks", () => {
    expect(parse("W ABC", { country: "AT" }).status).toBe("INVALID");
    expect(parse("W AB1C2", { country: "AT" }).status).toBe("INVALID");
    expect(parse("W A0123", { country: "AT" }).status).toBe("INVALID");
  });
});

describe("Austria — diplomatic and consular plates", () => {
  it("parses diplomatic and consular prefixes", () => {
    const diplomatic = parse("WD 123AB", { country: "AT" });
    expect(diplomatic.status).toBe("VALID");
    expect(diplomatic.scheme?.id).toBe("AT_DIPLOMATIC");
    expect(diplomatic.registration?.diplomatic).toBe(true);

    // Graz uses the Anlage 5d code G instead of the Land letter (§ 26 Abs. 5).
    expect(parse("GK 1234A", { country: "AT" }).scheme?.id).toBe("AT_DIPLOMATIC");
    expect(parse("STD 12ABC", { country: "AT" }).scheme?.id).toBe("AT_DIPLOMATIC");
  });

  it("uses the separator to split prefix from an all-digit serial", () => {
    // Written with its separator the diplomatic reading is unique; compact,
    // W-D12345 is also a well-formed Wunschkennzeichen.
    const separated = parse("WD 12345", { country: "AT" });
    expect(separated.status).toBe("VALID");
    expect(separated.scheme?.id).toBe("AT_DIPLOMATIC");

    const compact = parse("WD12345", { country: "AT" });
    expect(compact.status).toBe("AMBIGUOUS");
    const schemes = compact.candidates
      ?.map((c) => c.scheme)
      .sort((a, b) => a.localeCompare(b));
    expect(schemes).toEqual(["AT_DIPLOMATIC", "AT_WUNSCHKENNZEICHEN"]);
  });

  it("reports the genuine collision between Land+D/K and district codes", () => {
    // ND is both Niederösterreich+D (diplomatic) and Neusiedl am See
    // (Anlage 5d); a mixed serial fits both compositions.
    const result = parse("ND 123AB", { country: "AT" });
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_SCHEME");
    const schemes = result.candidates
      ?.map((c) => c.scheme)
      .sort((a, b) => a.localeCompare(b));
    expect(schemes).toEqual(["AT_DIPLOMATIC", "AT_STANDARD"]);
  });
});

describe("Austria — detection without a country hint", () => {
  it("resolves an Austrian-only shape to AT", () => {
    const result = detect("W 12345A");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("AT");
    expect(result.scheme?.id).toBe("AT_STANDARD");
  });

  it("keeps the existing FR/IT ambiguity untouched", () => {
    // AB-123-CD: the Polish and Austrian readings are contradicted by the
    // separators, so the historical FR/IT pair remains.
    const result = detect("AB-123-CD");
    expect(result.status).toBe("AMBIGUOUS");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["FR", "IT"]);
  });
});
