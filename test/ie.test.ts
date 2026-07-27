import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Ireland — the current series", () => {
  it("parses the year, the half-year, the index mark and the sequence", () => {
    const result = parse("241-D-12345", { country: "IE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("IE_ORDINARY");
    expect(result.formatted).toBe("241-D-12345");
    expect(result.normalized).toBe("241D12345");
    expect(result.scheme?.components).toEqual({
      year: "24",
      half: "1",
      index: "D",
      sequence: "12345",
    });
  });

  it("exposes the registration period as its own component", () => {
    // Reg. 9(1B)(b): 1 is January-June, 2 is July-December. Modelling it apart
    // from the year is what lets a caller read the period without slicing.
    expect(parse("262-D-111", { country: "IE" }).scheme?.components?.half).toBe("2");
    expect(parse("261-D-111", { country: "IE" }).scheme?.components?.half).toBe("1");
    expect(parse("263-D-111", { country: "IE" }).status).toBe("INVALID");
    expect(parse("260-D-111", { country: "IE" }).status).toBe("INVALID");
  });

  it("accepts a compact input and restores the official hyphens", () => {
    expect(parse("241d12345", { country: "IE" }).formatted).toBe("241-D-12345");
    expect(parse(" 241 D 12345 ", { country: "IE" }).formatted).toBe("241-D-12345");
  });

  it("rejects a padded sequence but not an internal zero", () => {
    // First Schedule para. 3(b): the mark shall not incorporate a nought unless
    // the Commissioners assigned it, and the sequence runs from 1.
    expect(parse("241-D-0123", { country: "IE" }).status).toBe("INVALID");
    expect(parse("241-D-1024", { country: "IE" }).status).toBe("VALID");
  });

  it("bounds the sequence at six digits, the bound libplate had to choose", () => {
    // Reg. 9 prescribes no width; six comes from the permissive reading of the
    // First Schedule geometry and is documented as libplate's own bound.
    expect(parse("241-D-123456", { country: "IE" }).status).toBe("VALID");
    expect(parse("241-D-1234567", { country: "IE" }).status).toBe("INVALID");
  });
});

describe("Ireland — the year of first use picks the index-mark table", () => {
  it("gives 2014 onwards the post-amalgamation marks", () => {
    // S.I. No. 452/2013 reg. 5(d): the paragraph 4A Table merged Limerick,
    // Tipperary and Waterford.
    expect(parse("141-T-1", { country: "IE" }).scheme?.id).toBe("IE_ORDINARY");
    expect(parse("241-LK-1", { country: "IE" }).status).toBe("INVALID");
    expect(parse("241-TN-1", { country: "IE" }).status).toBe("INVALID");
    expect(parse("241-TS-1", { country: "IE" }).status).toBe("INVALID");
    expect(parse("241-WD-1", { country: "IE" }).status).toBe("INVALID");
  });

  it("keeps 2013 on the pre-amalgamation marks", () => {
    // Reg. 9(1A)(c) still points at the paragraph 4 Table, so 131-LK- is real
    // and 131-T- never existed.
    const result = parse("131-LK-1234", { country: "IE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("IE_ORDINARY_2013");
    expect(parse("132-TS-1", { country: "IE" }).scheme?.id).toBe("IE_ORDINARY_2013");
    expect(parse("131-T-1", { country: "IE" }).status).toBe("INVALID");
  });

  it("reads a two-digit year as a vehicle first used up to 2012", () => {
    const result = parse("12-D-12345", { country: "IE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("IE_ORDINARY_PRE_2013");
    expect(result.formatted).toBe("12-D-12345");
    expect(result.scheme?.components).toEqual({
      year: "12",
      index: "D",
      sequence: "12345",
    });
  });

  it("does not read the two-digit year as a date of issue", () => {
    // Reg. 9(1)(a) numbers the year the vehicle was first brought into use
    // ANYWHERE, so an old import registered today wears an old year — including
    // one with a leading zero. That is also why the scheme carries no validFrom.
    expect(parse("05-C-1", { country: "IE" }).status).toBe("VALID");
    expect(parse("00-WD-123456", { country: "IE" }).status).toBe("VALID");
    expect(parse("12-D-1", { country: "IE", referenceDate: "1996-01-01" }).status).toBe(
      "VALID",
    );
  });

  it("keeps the 2013 and 2014 schemes out of each other's period", () => {
    expect(parse("141-D-1", { country: "IE", referenceDate: "2013-06-01" }).status).toBe(
      "INVALID",
    );
    expect(parse("131-D-1", { country: "IE", referenceDate: "2012-06-01" }).status).toBe(
      "INVALID",
    );
    // A year the three-digit form can never carry: paragraphs (1A) and (1B)
    // only reach vehicles first used from 2013.
    expect(parse("121-D-1", { country: "IE" }).status).toBe("INVALID");
  });
});

describe("Ireland — what an Irish number says about the vehicle", () => {
  it("reports every motor category but never a trailer", () => {
    // S. 130 of the Finance Act 1992 registers mechanically propelled vehicles
    // only; reg. 9(8) puts a DUPLICATE of the towing vehicle's mark on the
    // trailer, so a plate read off an Irish semitrailer is the tractor's.
    const result = parse("241-D-12345", { country: "IE" });
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
    expect(result.vehicle?.possibleCategories).toContain("TRUCK");
    expect(result.vehicle?.possibleCategories).not.toContain("TRAILER");
    expect(result.vehicle?.possibleCategories).not.toContain("SEMITRAILER");
    expect(result.vehicle?.possibleCategories).not.toContain("TRAILER_OR_SEMITRAILER");
  });

  it("prescribes black on white with no colour variants", () => {
    // First Schedule para. 9 is unconditional — Ireland runs no green electric,
    // yellow rear or taxi plate.
    const result = parse("241-D-12345", { country: "IE" });
    expect(result.visual?.background).toBe("WHITE");
    expect(result.visual?.foreground).toBe("BLACK");
  });
});

describe("Ireland — the ZV and ZZ series", () => {
  it("reads ZV as a historical registration", () => {
    // Reg. 9(1C) reserves it for vehicles more than 30 years old at
    // registration, so the regime is readable from the text for once.
    const result = parse("ZV 4723", { country: "IE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("IE_VINTAGE_ZV");
    expect(result.registration?.type).toBe("HISTORICAL");
    expect(result.registration?.historical).toBe(true);
  });

  it("asserts no colours for a ZV plate", () => {
    // First Schedule para. 23 lets it follow the 1982 Third Schedule instead,
    // which allows silver on black and black on red as well.
    const result = parse("ZV 4723", { country: "IE" });
    expect(result.visual).toBeUndefined();
  });

  it("leaves the ordinary series open to vintage vehicles too", () => {
    // The ZV mark is granted only "if the person applying for registration so
    // requests"; otherwise the vehicle takes its own year of first use.
    expect(parse("27-D-1", { country: "IE" }).scheme?.id).toBe("IE_ORDINARY_PRE_2013");
  });

  it("reads ZZ as a five-digit export registration", () => {
    const result = parse("ZZ 12345", { country: "IE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("IE_ZZ_TEMPORARY");
    expect(result.registration?.type).toBe("EXPORT");
    // Revenue states the width, and only the width — a padded 00001 is still a
    // five-digit number, so no leading-zero rule applies here.
    expect(parse("ZZ 00001", { country: "IE" }).status).toBe("VALID");
    expect(parse("ZZ 1234", { country: "IE" }).status).toBe("INVALID");
    expect(parse("ZZ 123456", { country: "IE" }).status).toBe("INVALID");
  });
});

describe("Ireland — country-less detection", () => {
  it("detects the hyphenated series uniquely", () => {
    // Nothing else in the library puts digits, a table letter and digits in
    // this arrangement.
    expect(detect("241-D-12345").country).toBe("IE");
    expect(detect("131-LK-1").country).toBe("IE");
    expect(detect("12-D-12345").country).toBe("IE");
  });

  it("reports the two-letter series as ambiguous, which is honest", () => {
    // ZV and ZZ are two letters over a number, the commonest shape in Europe:
    // ZV 4723 is also a German, Danish, Latvian and Norwegian plate.
    const zv = detect("ZV 4723");
    expect(zv.status).toBe("AMBIGUOUS");
    expect((zv.candidates ?? []).map((c) => c.country)).toContain("IE");
    const zz = detect("ZZ 12345");
    expect(zz.status).toBe("AMBIGUOUS");
    expect((zz.candidates ?? []).map((c) => c.scheme)).toContain("IE_ZZ_TEMPORARY");
  });
});
