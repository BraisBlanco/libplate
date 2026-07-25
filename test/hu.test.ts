import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Hungary — the 2022 series", () => {
  it("parses four letters and three digits", () => {
    const result = parse("MM PT-761", { country: "HU" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("HU_ORDINARY");
    expect(result.formatted).toBe("MM PT-761");
    expect(result.scheme?.components).toEqual({
      opening: "MM",
      letters: "PT",
      number: "761",
    });
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("requires the opening pair to be two vowels or two consonants", () => {
    // § 53 (6): "két magánhangzóból vagy két mássalhangzóból".
    expect(parse("AA BB-123", { country: "HU" }).status).toBe("VALID");
    expect(parse("EI KL-001", { country: "HU" }).status).toBe("VALID");
    expect(parse("AB CD-123", { country: "HU" }).status).toBe("INVALID");
    expect(parse("BA CD-123", { country: "HU" }).status).toBe("INVALID");
  });

  it("excludes the seven Hungarian digraphs from the opening pair", () => {
    for (const digraph of ["CS", "GY", "LY", "NY", "SZ", "TY", "ZS"]) {
      expect(parse(`${digraph} AB-123`, { country: "HU" }).status).toBe("INVALID");
    }
    // The same letters in the other order are ordinary consonant pairs.
    expect(parse("SC AB-123", { country: "HU" }).status).toBe("VALID");
  });

  it("runs the digits from 001 to 999", () => {
    expect(parse("AA BB-001", { country: "HU" }).status).toBe("VALID");
    expect(parse("AA BB-000", { country: "HU" }).status).toBe("INVALID");
    expect(parse("AA BB-12", { country: "HU" }).status).toBe("INVALID");
  });

  it("still parses the pre-2022 three-letter series, opt-in for detection", () => {
    const hinted = parse("ABC-123", { country: "HU" });
    expect(hinted.status).toBe("VALID");
    expect(hinted.scheme?.id).toBe("HU_ORDINARY_2004");
    // Three letters over three digits is also the Swedish ordinary series (and
    // reads as a German district plus letters and digits), so country-less
    // detection keeps the Hungarian reading behind includeHistorical.
    const plain = detect("FKM 987");
    expect(plain.candidates?.map((c) => c.country)).not.toContain("HU");
    const optIn = detect("FKM 987", { includeHistorical: true });
    expect(optIn.candidates?.map((c) => c.country)).toContain("HU");
  });
});

describe("Hungary — special and temporary series", () => {
  it("parses the diplomatic and temporary diplomatic plates apart by digit count", () => {
    const permanent = parse("CD 123-456", { country: "HU" });
    expect(permanent.scheme?.id).toBe("HU_DIPLOMATIC");
    expect(permanent.registration?.type).toBe("DIPLOMATIC");
    expect(permanent.visual).toEqual({ background: "BLUE", foreground: "WHITE" });
    const temporary = parse("CD 1234", { country: "HU" });
    expect(temporary.scheme?.id).toBe("HU_TEMPORARY_CD");
    // `registrationType` carries the holder regime, so the temporary CD plate
    // reports DIPLOMATIC (and `temporary: false`); the four-digit width and the
    // white face are what tell it from the permanent six-digit plate.
    expect(temporary.registration?.type).toBe("DIPLOMATIC");
    expect(temporary.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("parses the OT museum plate in both its shapes", () => {
    const current = parse("OT AB-123", { country: "HU" });
    expect(current.scheme?.id).toBe("HU_MUSEUM");
    expect(current.registration?.type).toBe("HISTORICAL");
    const legacy = parse("OT 12-345", { country: "HU" });
    expect(legacy.scheme?.id).toBe("HU_MUSEUM_2004");
  });

  it("parses the yellow TX taxi plate, whose pair the serial series cannot use", () => {
    const taxi = parse("TX AB-123", { country: "HU" });
    expect(taxi.status).toBe("VALID");
    expect(taxi.scheme?.id).toBe("HU_TAXI");
    expect(taxi.vehicle?.category).toBe("PASSENGER_CAR");
    expect(taxi.visual).toEqual({ background: "YELLOW", foreground: "BLACK" });
  });

  it("parses the state-body plates", () => {
    // Annex 13/A point 4: BA, HA, MA, NA and RA over two digits and three.
    for (const prefix of ["BA", "HA", "MA", "NA", "RA"]) {
      const result = parse(`${prefix} 12-345`, { country: "HU" });
      expect(result.status).toBe("VALID");
      expect(result.scheme?.id).toBe("HU_STATE");
      expect(result.registration?.type).toBe("STATE_OR_MILITARY");
    }
    expect(parse("CA 12-345", { country: "HU" }).status).toBe("INVALID");
  });

  it("parses the I temporary plate in both widths and asserts no colour", () => {
    const short = parse("I 12-AB", { country: "HU" });
    expect(short.scheme?.id).toBe("HU_TEMPORARY_I");
    expect(parse("I 123-SP", { country: "HU" }).scheme?.id).toBe("HU_TEMPORARY_I");
    // Annex 14/A gives one variant black characters and the other red, so the
    // scheme reports neither.
    expect(short.visual).toBeUndefined();
    expect(parse("I 00-AB", { country: "HU" }).status).toBe("INVALID");
  });
});
