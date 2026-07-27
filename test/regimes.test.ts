import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("France — WW provisional and SIV reserved pairs", () => {
  it("validates a WW provisional plate as its own regime", () => {
    const result = parse("WW-123-AA", { country: "FR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FR_WW_PROVISIONAL");
    expect(result.registration?.type).toBe("TEMPORARY_WW");
    expect(result.registration?.temporary).toBe(true);
  });

  it("does not accept the reserved SS pair as an ordinary SIV plate", () => {
    const result = parse("SS-123-AA", { country: "FR" });
    expect(result.status).toBe("INVALID");
  });

  it("does not classify a WW plate as ordinary SIV", () => {
    expect(parse("WW-123-AA", { country: "FR" }).scheme?.id).not.toBe("FR_SIV_CURRENT");
  });

  it("detects a WW plate as ambiguous between FR, IT and SK", () => {
    // Italy's alphabet allows W, so WW-123-AA is also a valid Italian plate,
    // and Slovakia's ordinary series has the same shape with no letter excluded
    // from its opening pair (§ 124 ods. 1 zákona č. 8/2009 Z. z.).
    const result = detect("WW-123-AA");
    expect(result.status).toBe("AMBIGUOUS");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["FR", "IT", "SK"]);
  });
});

describe("Spain — regime prefixes", () => {
  it("marks an H-prefixed plate as historical", () => {
    const result = parse("H 1234 BCD", { country: "ES" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("ES_HISTORICAL");
    expect(result.registration?.type).toBe("HISTORICAL");
    expect(result.registration?.historical).toBe(true);
  });

  it("keeps historical null for an ordinary plate (cannot tell from text)", () => {
    expect(parse("1234 BCD", { country: "ES" }).registration?.historical).toBeNull();
  });

  it("recognises the tourist, temporary-private and company regimes", () => {
    expect(parse("T 1234 BCD", { country: "ES" }).registration?.type).toBe("TOURIST");
    const p = parse("P 1234 BCD", { country: "ES" });
    expect(p.registration?.type).toBe("TEMPORARY_PRIVATE");
    expect(p.registration?.temporary).toBe(true);
    expect(p.visual).toEqual({ background: "GREEN", foreground: "WHITE" });
    // The `temporary` flag is derived from the type, so assert both: checking
    // only the type let a mutation that drops TEMPORARY_COMPANY from the
    // derivation survive.
    for (const prefix of ["S", "V"]) {
      const company = parse(`${prefix} 1234 BCD`, { country: "ES" });
      expect(company.registration?.type).toBe("TEMPORARY_COMPANY");
      expect(company.registration?.temporary).toBe(true);
    }
    expect(parse("T 1234 BCD", { country: "ES" }).registration?.temporary).toBe(false);
  });
});

describe("Spain — diplomatic regime (CD/CC/OI/TA)", () => {
  it("validates the four series with their registration types and colours", () => {
    const cd = parse("CD 12 345", { country: "ES" });
    expect(cd.status).toBe("VALID");
    expect(cd.scheme?.id).toBe("ES_DIPLOMATIC_CD");
    expect(cd.registration?.type).toBe("DIPLOMATIC");
    expect(cd.visual).toEqual({ background: "RED", foreground: "WHITE" });

    const cc = parse("CC 12 345", { country: "ES" });
    expect(cc.scheme?.id).toBe("ES_CONSULAR_CC");
    expect(cc.registration?.type).toBe("CONSULAR");
    expect(cc.visual).toEqual({ background: "GREEN", foreground: "WHITE" });

    const oi = parse("OI 12 34", { country: "ES" });
    expect(oi.scheme?.id).toBe("ES_INTERNATIONAL_OI");
    expect(oi.registration?.type).toBe("INTERNATIONAL_ORGANIZATION");
    expect(oi.visual).toEqual({ background: "BLUE", foreground: "WHITE" });

    const ta = parse("TA 123 45", { country: "ES" });
    expect(ta.scheme?.id).toBe("ES_TA");
    expect(ta.registration?.type).toBe("DIPLOMATIC_STAFF");
    expect(ta.visual).toEqual({ background: "YELLOW", foreground: "BLACK" });
  });

  it("sets the diplomatic flag on all four series", () => {
    for (const plate of ["CD 12 345", "CC 12 345", "OI 12 34", "TA 123 45"]) {
      const result = parse(plate, { country: "ES" });
      expect(result.registration?.diplomatic).toBe(true);
      expect(result.registration?.temporary).toBe(false);
      expect(result.registration?.historical).toBeNull();
    }
  });

  it("reports AMBIGUOUS for a 5-digit compact OI/TA form", () => {
    // OI 12 345 and OI 123 45 are both valid readings of OI12345.
    const result = parse("OI12345", { country: "ES" });
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_SEGMENTATION");
    expect(result.candidates).toHaveLength(2);
  });

  it("uses the caller's separators as evidence to resolve the OI/TA split", () => {
    const short = parse("OI 12 345", { country: "ES" });
    expect(short.status).toBe("VALID");
    expect(short.scheme?.components).toEqual({
      prefix: "OI",
      organization: "12",
      serial: "345",
    });

    const long = parse("TA-123-45", { country: "ES" });
    expect(long.status).toBe("VALID");
    expect(long.scheme?.components).toEqual({
      prefix: "TA",
      mission: "123",
      serial: "45",
    });
  });

  it("never rejects a unique split because of separator placement", () => {
    // OI1234 admits only the 2+2 split; the odd separators are ignored.
    const result = parse("OI 1 234", { country: "ES" });
    expect(result.status).toBe("VALID");
    expect(result.formatted).toBe("OI 12 34");
  });

  it("detects CD + 4 digits as ambiguous between ES, DE, DK, EE, FI, HU, LV and NO", () => {
    // Compact CD1245 also reads as the German plate C-D 1245 (C = Chemnitz),
    // an Estonian A4 diplomatic mark, a Danish number (two letters + four
    // digits), a Finnish CD mark, a Hungarian temporary diplomatic mark
    // (CD + four digits, annex 14/A point 3), a Latvian diplomatic mark
    // (7. pielikuma 4.4.2. apakšpunkts) and a Norwegian embassy mark (the CD
    // series over the 1000-9999 number series).
    const result = detect("CD1245");
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_COUNTRY");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["DE", "DK", "EE", "ES", "FI", "HU", "LV", "NO"]);
  });

  it("detects the 7-character and TA forms as uniquely Spanish", () => {
    // Five digits exceed the German number group (max 4), and neither T nor
    // TA is a German district code.
    const seven = detect("CD 12 345");
    expect(seven.status).toBe("VALID");
    expect(seven.country).toBe("ES");

    const ta = detect("TA 123 45");
    expect(ta.status).toBe("VALID");
    expect(ta.scheme?.id).toBe("ES_TA");
  });
});

describe("Spain — provincial series", () => {
  it("validates the 1971-2000 series with one or two serial letters", () => {
    const two = parse("M-1234-AB", { country: "ES" });
    expect(two.status).toBe("VALID");
    expect(two.scheme?.id).toBe("ES_PROVINCIAL_1971_2000");
    expect(parse("B-0000-A", { country: "ES" }).scheme?.id).toBe(
      "ES_PROVINCIAL_1971_2000",
    );
  });

  it("validates the pre-1971 numeric series", () => {
    expect(parse("M-123456", { country: "ES" }).scheme?.id).toBe(
      "ES_PROVINCIAL_1900_1971",
    );
    expect(parse("B-9", { country: "ES" }).scheme?.id).toBe("ES_PROVINCIAL_1900_1971");
  });

  it("rejects codes outside the official province table", () => {
    expect(parse("XX-1234-AB", { country: "ES" }).status).toBe("INVALID");
    expect(parse("ET-1234-A", { country: "ES" }).status).toBe("INVALID");
  });

  it("keeps provincial series opt-in in country-less detection", () => {
    // Without includeHistorical the provincial series is not considered at all:
    // "SE-1234-AB" then reads only as the Austrian plate SE (Steyr) 1234AB.
    const withoutHistorical = detect("SE-1234-AB");
    expect(withoutHistorical.scheme?.id).not.toBe("ES_PROVINCIAL_1971_2000");
    expect(withoutHistorical.country).toBe("AT");
    expect(detect("SE-1234-AB", { includeHistorical: true }).scheme?.id).toBe(
      "ES_PROVINCIAL_1971_2000",
    );
  });

  it("reports the Bulgarian overlap of the provincial shape", () => {
    // A province code, four digits and two serial letters also describe a
    // Bulgarian ordinary plate whenever every letter is one of the twelve
    // Cyrillic/Latin look-alikes (М 1234 АВ).
    expect(detect("M-1234-AB").scheme?.id).toBe("BG_ORDINARY");
    const both = detect("M-1234-AB", { includeHistorical: true });
    expect(both.status).toBe("AMBIGUOUS");
    expect(both.errors[0]?.reason).toBe("AMBIGUOUS_COUNTRY");
    expect(
      both.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["BG", "ES"]);
  });

  it("reports the compact CC overlap with the consular series", () => {
    // CC + four digits is a Cáceres pre-1971 plate and a compact consular
    // form at once; the separators decide.
    expect(parse("CC1245", { country: "ES" }).status).toBe("AMBIGUOUS");
    expect(parse("CC 12 45", { country: "ES" }).scheme?.id).toBe("ES_CONSULAR_CC");
    // "CC-1245" stays ambiguous: its single separator is a boundary of both
    // readings, and separators never reject an otherwise-consistent match.
    expect(parse("CC-1245", { country: "ES" }).status).toBe("AMBIGUOUS");
  });
});

describe("Portugal — historical series", () => {
  it("validates a historical series when the country is given", () => {
    const result = parse("00-00-AA", { country: "PT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_GENERAL_1992_2005");
  });

  it("excludes historical series from country-less detection by default", () => {
    // Of the Portuguese series, "AA-00-00" only matches the pre-1992 one,
    // which is opt-in — so the current-series reading left is the Danish
    // number, and no Portuguese candidate appears.
    const result = detect("AA-00-00");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("DK");
  });

  it("includes historical series when explicitly requested", () => {
    // With legacy series opted in, XX-99-99 is shared with Dutch sidecode 1,
    // so country-less detection reports both candidates. The Danish reading
    // (two letters + four digits) is contradicted by the second separator,
    // which would fall inside its digit group.
    const result = detect("AA-00-00", { includeHistorical: true });
    expect(result.status).toBe("AMBIGUOUS");
    const countries = result.candidates?.map((c) => c.country).sort();
    expect(countries).toEqual(["NL", "PT"]);
    // A country hint resolves it.
    expect(parse("AA-00-00", { country: "PT" }).scheme?.id).toBe("PT_GENERAL_UNTIL_1992");
  });

  it("honours the reference date within a historical period", () => {
    const result = parse("00-AA-00", { country: "PT", referenceDate: "2010-01-01" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_GENERAL_2005_2020");
  });
});
