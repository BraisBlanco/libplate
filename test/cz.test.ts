import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Czechia — the standard mark", () => {
  it("parses a mark in the 3 + 4 grouping the sticker gap imposes", () => {
    const result = parse("1A2 3456", { country: "CZ" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("CZ_ORDINARY");
    expect(result.formatted).toBe("1A2 3456");
    expect(result.scheme?.components).toEqual({ series: "1A2", serial: "3456" });
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("accepts the whole 5-8 character range of § 24 odst. 2", () => {
    for (const mark of ["1A2 34", "1A2 345", "1A2 3456", "1A2 34567", "9Z9 99999"]) {
      expect(parse(mark, { country: "CZ" }).status).toBe("VALID");
    }
    expect(parse("1A23", { country: "CZ" }).status).toBe("INVALID");
    expect(parse("1A2345678", { country: "CZ" }).status).toBe("INVALID");
  });

  it("rejects G, O, Q and W, which have no glyph on a Czech plate", () => {
    // § 27 odst. 3 lists the twenty-two letters that may follow the kraj code
    // or the first mandatory character, and příloha č. 16 draws only those.
    for (const letter of ["G", "O", "Q", "W"]) {
      expect(parse(`1${letter}2 3456`, { country: "CZ" }).status).toBe("INVALID");
    }
    expect(parse("1V2 3456", { country: "CZ" }).status).toBe("VALID");
  });

  it("stays out of country-less detection, being a free-form space", () => {
    // Any 5-8 alphanumeric string is a well-formed Czech standard mark, so the
    // scheme is flagged legacySeries: without a country hint it would make
    // most European plates ambiguous. Spanish detection is unaffected.
    expect(detect("1234 BCD").country).toBe("ES");
    expect(detect("1A2 3456").status).toBe("INVALID");
    const optIn = detect("1A2 3456", { includeHistorical: true });
    expect(optIn.status).toBe("VALID");
    expect(optIn.country).toBe("CZ");
  });

  it("covers marks on request, which may be all letters or all digits", () => {
    // § 25 + § 7b odst. 1 of zákon 56/2001 Sb.: eight freely chosen characters
    // (seven for motorcycles, five for mopeds), letters *or* digits. They are
    // not separable in text from the serial series, so one scheme covers both.
    expect(parse("ABCDEFHI", { country: "CZ" }).status).toBe("VALID");
    expect(parse("12345678", { country: "CZ" }).status).toBe("VALID");
  });
});

describe("Czechia — the anchored series", () => {
  it("parses a diplomatic mark with the letters last", () => {
    // MZV's diplomatic protocol, in force since 2025-07-01: CD sits "na šesté
    // a sedmé pozici" over the five digits of § 24 odst. 3.
    const result = parse("12345 CD", { country: "CZ" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("CZ_DIPLOMATIC");
    expect(result.registration?.type).toBe("DIPLOMATIC");
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLUE" });
    expect(parse("12345 XX", { country: "CZ" }).scheme?.id).toBe("CZ_DIPLOMATIC_ADMIN");
    expect(parse("12345 XS", { country: "CZ" }).scheme?.id).toBe("CZ_DIPLOMATIC_SERVICE");
  });

  it("puts the honorary-consul pair at positions 4-5 instead", () => {
    const result = parse("123 HC 45", { country: "CZ" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("CZ_HONORARY_CONSUL");
    expect(result.registration?.type).toBe("CONSULAR");
    expect(result.scheme?.components).toEqual({
      prefix: "123",
      status: "HC",
      serial: "45",
    });
  });

  it("parses the historical and sports series behind a place code", () => {
    // A separator inside the place code + "V" group contradicts the standard
    // 3 + rest grouping, which leaves the historical reading alone.
    const historic = parse("01-V-1234", { country: "CZ" });
    expect(historic.status).toBe("VALID");
    expect(historic.scheme?.id).toBe("CZ_HISTORIC");
    expect(historic.registration?.type).toBe("HISTORICAL");
    expect(historic.visual).toEqual({ background: "WHITE", foreground: "GREEN" });
    expect(parse("01-R-1234", { country: "CZ" }).scheme?.id).toBe("CZ_SPORT");

    // Only the fourteen registration-place codes of § 26 odst. 6 exist, and the
    // sports series takes digits where the historical one also takes letters.
    // Both inputs remain well-formed *standard* marks, so what changes is the
    // scheme, not the validity.
    const notAPlace = parse("15-V-1234", { country: "CZ" });
    expect(notAPlace.scheme?.id).not.toBe("CZ_HISTORIC");
    expect(parse("05-V-12AB", { country: "CZ" }).scheme?.id).toBe("CZ_HISTORIC");
    expect(parse("01-R-12AB", { country: "CZ" }).scheme?.id).not.toBe("CZ_SPORT");
  });

  it("parses electric and test marks", () => {
    const electric = parse("EL-12345", { country: "CZ" });
    expect(electric.status).toBe("VALID");
    expect(electric.scheme?.id).toBe("CZ_ELECTRIC");
    expect(electric.vehicle?.possibleCategories).not.toContain("TRAILER_OR_SEMITRAILER");
    const test = parse("F-1234", { country: "CZ" });
    expect(test.status).toBe("VALID");
    expect(test.scheme?.id).toBe("CZ_TEST");
    expect(test.registration?.temporary).toBe(true);
    expect(test.visual).toEqual({ background: "WHITE", foreground: "GREEN" });
  });

  it("reports the anchored series as ambiguous with the standard mark when nothing separates them", () => {
    // Every anchored Czech series is inside the 5-8 character standard space,
    // so a compact input carries both readings and libplate says so.
    const compact = parse("123CD", { country: "CZ" });
    expect(compact.status).toBe("AMBIGUOUS");
    expect(
      compact.candidates?.map((c) => c.scheme).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["CZ_DIPLOMATIC", "CZ_ORDINARY"]);
    // Separators written where the standard 3 + rest grouping cannot take one
    // are evidence, and they resolve it.
    expect(parse("12345 CD", { country: "CZ" }).scheme?.id).toBe("CZ_DIPLOMATIC");
  });
});
