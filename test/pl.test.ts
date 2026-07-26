import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Poland — ordinary plates", () => {
  it("parses a car plate with a one-letter powiat discriminant", () => {
    const result = parse("WA 12345", { country: "PL" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PL_ORDINARY_CAR");
    expect(result.formatted).toBe("WA 12345");
    expect(result.scheme?.components).toEqual({ prefix: "WA", serial: "12345" });
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
  });

  it("distinguishes car and motorcycle plates by serial length", () => {
    // One-letter powiat discriminants: cars carry 5 characters, motorcycles
    // and mopeds 4 (§ 30 ust. 2 pkt 1 lit. a vs pkt 3 lit. a).
    const car = parse("KR 1JC38", { country: "PL" });
    expect(car.scheme?.id).toBe("PL_ORDINARY_CAR");
    const moto = parse("KR 1J38", { country: "PL" });
    expect(moto.scheme?.id).toBe("PL_ORDINARY_MOTORCYCLE");
    expect(moto.vehicle?.possibleCategories).toContain("MOTORCYCLE");
  });

  it("parses a plate with a two-letter powiat discriminant", () => {
    const result = parse("KRA A123", { country: "PL" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PL_ORDINARY_POWIAT");
    expect(result.scheme?.components).toEqual({ prefix: "KRA", serial: "A123" });
  });

  it("rejects arrangements the regulation does not permit", () => {
    // NNNN is a one-letter-powiat motorcycle arrangement; with a two-letter
    // powiat discriminant it does not exist (§ 30 ust. 2 pkt 1 lit. b).
    expect(parse("KRA 1234", { country: "PL" }).status).toBe("INVALID");
    // All-zero digit blocks are outside every range (00001-99999 etc.).
    expect(parse("WA 00000", { country: "PL" }).status).toBe("INVALID");
    // B, D, I, O, Z never appear in an authority-built serial (§ 31 ust. 1).
    expect(parse("WA 1234B", { country: "PL" }).status).toBe("INVALID");
  });

  it("accepts serial letters excluded for authorities on individual plates", () => {
    // The owner picks the individual discriminant (§ 32 ust. 2), so B/D/I/O/Z
    // are allowed there — only Q is outside the base set (§ 30 ust. 1).
    expect(parse("W0 BOND7", { country: "PL" }).status).toBe("VALID");
    expect(parse("W0 QQQ", { country: "PL" }).status).toBe("INVALID");
  });

  it("rejects prefixes outside the Załącznik 13 table", () => {
    expect(parse("XY 12345", { country: "PL" }).status).toBe("INVALID");
    expect(parse("WXX 1234", { country: "PL" }).status).toBe("INVALID");
  });

  it("accepts the powiat codes added by the 2025 amendment", () => {
    // wrocławski gained WW (Dz.U. 2025 poz. 939); D and V both prefix it.
    expect(parse("DWW 12345", { country: "PL" }).status).toBe("VALID");
    expect(parse("VWW 12345", { country: "PL" }).status).toBe("VALID");
  });

  it("was not valid before the 2000 discriminant system", () => {
    const result = parse("WA 12345", { country: "PL", referenceDate: "1999-01-01" });
    expect(result.status).toBe("INVALID");
  });
});

describe("Poland — special plate types", () => {
  it("parses temporary plates and reports the temporary regime", () => {
    const result = parse("W0 1234", { country: "PL" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PL_TEMPORARY");
    expect(result.registration?.temporary).toBe(true);
    expect(result.visual?.foreground).toBe("RED");
  });

  it("parses historic plates and reports the historical regime", () => {
    const twoLetter = parse("WA 123", { country: "PL" });
    expect(twoLetter.scheme?.id).toBe("PL_HISTORIC_2LETTER");
    expect(twoLetter.registration?.historical).toBe(true);
    expect(twoLetter.visual?.background).toBe("YELLOW");

    const threeLetter = parse("KRA 1A", { country: "PL" });
    expect(threeLetter.scheme?.id).toBe("PL_HISTORIC_3LETTER");
    expect(threeLetter.registration?.historical).toBe(true);
  });

  it("parses diplomatic plates on any voivodeship letter", () => {
    const warsaw = parse("W 123456", { country: "PL" });
    expect(warsaw.scheme?.id).toBe("PL_DIPLOMATIC");
    expect(warsaw.registration?.diplomatic).toBe(true);
    expect(warsaw.visual?.background).toBe("BLUE");
    // The regulation prescribes the voivodeship letter, not W specifically.
    expect(parse("T 123456", { country: "PL" }).scheme?.id).toBe("PL_DIPLOMATIC");
    // 000000 is outside the 000001-999999 range.
    expect(parse("W 000000", { country: "PL" }).status).toBe("INVALID");
  });

  it("parses professional plates with the fixed P marker", () => {
    const result = parse("W01 23P45", { country: "PL" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PL_PROFESSIONAL");
    expect(result.registration?.temporary).toBe(true);
    expect(result.visual?.foreground).toBe("GREEN");
    // Powiat number 00 does not exist (01-99).
    expect(parse("W00 23P45", { country: "PL" }).status).toBe("INVALID");
    // The professional annex assigns one letter per voivodeship — V is an
    // ordinary-series second letter only.
    expect(parse("V01 23P45", { country: "PL" }).status).toBe("INVALID");
  });

  it("parses reduced-size plates on the voivodeship letter alone", () => {
    const result = parse("W 123", { country: "PL", referenceDate: "2026-01-01" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PL_REDUCED");
    // Shared by ordinary/temporary/historic reduced variants, so the regime
    // is not claimed.
    expect(result.registration?.type).toBe("UNKNOWN");
    expect(result.registration?.historical).toBeNull();
  });

  it("filters reduced plates by their 2018 introduction date", () => {
    expect(parse("W 123", { country: "PL", referenceDate: "2017-01-01" }).status).toBe(
      "INVALID",
    );
  });
});

describe("Poland — detection and cross-country collisions", () => {
  it("detects an unambiguous powiat plate without a country hint", () => {
    const result = detect("KRA A123");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("PL");
  });

  it("reports the PL/IT/DK collision on two letters + five digits", () => {
    // WA 12345 is a Polish car plate, an Italian motorcycle plate and a
    // Danish number.
    const result = detect("WA 12345");
    expect(result.status).toBe("AMBIGUOUS");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["DK", "IT", "NO", "PL"]);
  });

  it("reports the PL/DE collision on historic-format plates", () => {
    // "WA 123" reads as PL zabytkowe (WA 123), DE (W-A 123), a Danish number, a
    // Finnish two-letter mark and a Latvian general-use number; the Austrian
    // Wunschkennzeichen reading W-A123 is contradicted by the separator.
    const result = detect("WA 123");
    expect(result.status).toBe("AMBIGUOUS");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["DE", "DK", "FI", "LV", "PL"]);
  });
});
