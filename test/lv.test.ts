import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Latvia — the general-use series", () => {
  it("parses two letters and one to four digits, hyphenated", () => {
    const result = parse("AB1234", { country: "LV" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LV_ORDINARY");
    // 7. pielikuma 2.3. apakšpunkts prescribes the hyphen; 9. punkts writes the
    // number without it in the register, which is `normalized`.
    expect(result.formatted).toBe("AB-1234");
    expect(result.normalized).toBe("AB1234");
    expect(result.scheme?.components).toEqual({ series: "AB", number: "1234" });
  });

  it("treats the digits as a number from 1 to 9999", () => {
    expect(parse("KR-1", { country: "LV" }).status).toBe("VALID");
    expect(parse("AB-9999", { country: "LV" }).status).toBe("VALID");
    expect(parse("AB-0123", { country: "LV" }).status).toBe("INVALID");
    expect(parse("AB-0", { country: "LV" }).status).toBe("INVALID");
    expect(parse("AB-12345", { country: "LV" }).status).toBe("INVALID");
  });

  it("asserts no colour and infers no category", () => {
    const result = parse("AB-1234", { country: "LV" });
    // The ordinary plate's colours live in LVS 20:2009, which is not published
    // free of charge — and the taxi (yellow) and electric-vehicle (blue-symbol)
    // series carry these very characters anyway.
    expect(result.visual).toBeUndefined();
    // Transit numbers (13.1. punkts) share the composition and are issued to any
    // vehicle being taken out of Latvia, trailers included; the off-road series
    // brings mopeds in. That leaves no category to exclude.
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
  });

  it("withholds CC and CD, so diplomatic plates stay readable", () => {
    // 4.4.2. apakšpunkts reserves C, CC and CD to diplomatic plates and
    // 7. punkts forbids duplicate combinations, so the two pairs are kept out of
    // the general-use series.
    const result = parse("CD 1234", { country: "LV" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LV_DIPLOMATIC");
    expect(parse("CC 12", { country: "LV" }).scheme?.id).toBe("LV_DIPLOMATIC");
  });
});

describe("Latvia — trailers and mopeds", () => {
  it("reads a one-letter number as a towed vehicle or a moped", () => {
    // 7. pielikuma 2.2. apakšpunkts gives the one-letter number to trailers,
    // semitrailers and mopeds, and to nothing else in the general-use series.
    const result = parse("P-1234", { country: "LV" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LV_TRAILER_MOPED");
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
    expect(result.vehicle?.possibleCategories).toEqual([
      "TRAILER_OR_SEMITRAILER",
      "MOPED_OR_MOTOR_CYCLE",
    ]);
  });

  it("lets letters stand in for the last two digits", () => {
    // "Piekabēm, puspiekabēm un mopēdiem paredzēto numura zīmju pēdējo divu
    // ciparu simbolu vietā var lietot burtu simbolus."
    expect(parse("Z-12AB", { country: "LV" }).scheme?.id).toBe("LV_TRAILER_MOPED");
    expect(parse("M-123A", { country: "LV" }).scheme?.id).toBe("LV_TRAILER_MOPED");
    // Only the LAST two, and at least one digit must remain — the digits still
    // have to form "skaitļus no 1 līdz 9999".
    for (const plate of ["P-AB12", "P-AB"]) {
      expect(parse(plate, { country: "LV" }).status).toBe("INVALID");
    }
    // "P-A123" is not a one-letter number either, but it is not rejected: with
    // the separators stripped it is the general-use number PA-123, and a
    // separator never rejects an otherwise-unique reading.
    expect(parse("P-A123", { country: "LV" }).scheme?.id).toBe("LV_ORDINARY");
  });

  it("stops at four symbols behind the letter", () => {
    expect(parse("P-12345", { country: "LV" }).status).toBe("INVALID");
    expect(parse("P-123AB", { country: "LV" }).status).toBe("INVALID");
  });
});

describe("Latvia — special-purpose series", () => {
  it("reports the red diplomatic background for C, CC and CD", () => {
    const result = parse("CD-12345", { country: "LV" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LV_DIPLOMATIC");
    expect(result.scheme?.components).toEqual({ kind: "CD", number: "12345" });
    // 4.4.3. apakšpunkts gives the background only; the symbol colour is not in
    // the regulation, so none is asserted.
    expect(result.visual).toEqual({ background: "RED" });
    // Unlike the general-use series, the digits carry no range, so a
    // zero-opened group is accepted.
    expect(parse("CD 00123", { country: "LV" }).status).toBe("VALID");
    // Seven symbols is the ceiling (4.4.1.1.).
    expect(parse("CD 123456", { country: "LV" }).status).toBe("INVALID");
  });

  it("keeps the trade plate's validity year as a component", () => {
    const result = parse("A12345", { country: "LV" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LV_TRADE");
    // 4.2.2. apakšpunkts: type letter, then the number, then the last digit —
    // "gadu, līdz kuram tirdzniecības numura zīme ir derīga".
    expect(result.scheme?.components).toEqual({
      kind: "A",
      number: "1234",
      year: "5",
    });
    expect(result.visual).toEqual({ foreground: "RED" });
    expect(result.registration?.type).toBe("PROFESSIONAL_TEMPORARY");
    // The type letter is one of A-E only.
    expect(parse("F12345", { country: "LV" }).status).toBe("INVALID");
  });

  it("anchors the test series on IZM", () => {
    const result = parse("IZM 123", { country: "LV" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LV_TEST");
    expect(result.registration?.type).toBe("PROFESSIONAL_TEMPORARY");
    expect(parse("IZM 1234", { country: "LV" }).status).toBe("INVALID");
    expect(parse("IZN 123", { country: "LV" }).status).toBe("INVALID");
  });

  it("reports the overlaps the regulation leaves to the plate's colour", () => {
    // Latvia's number space is small and several series share it. A single
    // letter over an all-digit tail is a trailer/moped number (white), a trade
    // number (red symbols) and — behind C — a diplomatic one (red background).
    const trade = parse("A 1234", { country: "LV" });
    expect(trade.status).toBe("AMBIGUOUS");
    expect(trade.errors[0]?.reason).toBe("AMBIGUOUS_SCHEME");
    expect(
      trade.candidates?.map((c) => c.scheme).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["LV_TRADE", "LV_TRAILER_MOPED"]);

    const diplomatic = parse("C 123", { country: "LV" });
    expect(diplomatic.status).toBe("AMBIGUOUS");
    expect(
      diplomatic.candidates?.map((c) => c.scheme).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["LV_DIPLOMATIC", "LV_TRADE", "LV_TRAILER_MOPED"]);
  });
});

describe("Latvia — country-less detection", () => {
  it("collides with the German, Danish, Polish and Romanian shapes", () => {
    const result = detect("AB-1234");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      result.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["DE", "DK", "LV", "NO", "PL", "RO"]);
  });

  it("collides with the Lithuanian ordinary series on IZM", () => {
    // I, Z and M are all Lithuanian alphabet letters, so IZM123 is a valid
    // Lithuanian car number as well as a Latvian test number.
    const result = detect("IZM 123");
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.candidates?.map((c) => c.scheme)).toContain("LT_ORDINARY");
    expect(result.candidates?.map((c) => c.scheme)).toContain("LV_TEST");
  });
});
