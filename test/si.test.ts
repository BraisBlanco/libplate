import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Slovenia — ordinary series", () => {
  it("parses an area designation plus a five-character mark", () => {
    const result = parse("LJ 12-ABC", { country: "SI" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SI_ORDINARY_NN_LL");
    expect(result.formatted).toBe("LJ 12-ABC");
    expect(result.scheme?.components).toEqual({
      area: "LJ",
      number: "12",
      letters: "ABC",
    });
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("keeps the article 28(1) hyphen on a segment boundary", () => {
    // The hyphen sits after the first run of letters or digits, so each
    // arrangement is its own scheme and the official spelling never contradicts
    // the segmentation. That is what keeps a Slovenian plate in the running
    // when a German reading of the same string exists.
    expect(parse("MB AB-123", { country: "SI" }).formatted).toBe("MB AB-123");
    expect(parse("PO 123-A", { country: "SI" }).formatted).toBe("PO 123-A");
    expect(parse("GO 1-ABC2", { country: "SI" }).formatted).toBe("GO 1-ABC2");
  });

  it("accepts only the arrangements article 30(3)-(4) enumerates", () => {
    for (const mark of [
      "CE 123-AB",
      "MB AB-123",
      "LJ 12-ABC",
      "KP ABC-12",
      "GO 1-ABC2",
      "NM 12-AB",
      "SG AB-12",
      "PO 123-A",
      "KK 1-AB2",
    ]) {
      expect(parse(mark, { country: "SI" }).status).toBe("VALID");
    }
    // Four digits, or four digits and a letter, are not among them.
    expect(parse("LJ 12-34", { country: "SI" }).status).toBe("INVALID");
    expect(parse("LJ 1234A", { country: "SI" }).status).toBe("INVALID");
    expect(parse("LJ 12-ABCD", { country: "SI" }).status).toBe("INVALID");
  });

  it("rejects designations outside Priloga IV", () => {
    expect(parse("XY 12-ABC", { country: "SI" }).status).toBe("INVALID");
    expect(parse("SI 12-ABC", { country: "SI" }).status).toBe("INVALID");
  });

  it("rejects O and the letters missing from the Slovenian alphabet", () => {
    // Article 30(2): the mark uses the Slovenian alphabet without Č, Š and Ž,
    // and "Črka »O« se ne sme uporabiti" — Q, W, X and Y are not in it at all.
    for (const letter of ["O", "Q", "W", "X", "Y"]) {
      expect(parse(`LJ 12-AB${letter}`, { country: "SI" }).status).toBe("INVALID");
    }
  });

  it("reports the German and Hungarian overlaps when no country is given", () => {
    // "MB AB-123" is also a German plate (MB is a district code, over the letter
    // pair AB and 123) and a Hungarian 2022-series plate (MB is a consonant
    // pair, AB the following letters, 123 the digits). Nothing in the text
    // decides it — and Slovenia stays in the running because the hyphen sits on
    // a segment boundary here.
    const result = detect("MB AB-123");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      result.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["DE", "HU", "SI"]);
    // Short Slovenian marks collide widely: two digits over three letters also
    // reads as a Portuguese industrial-machine plate, and three digits between
    // letter pairs as a French SIV or Italian number.
    expect(
      detect("LJ 12-ABC")
        .candidates?.map((c) => c.country)
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(["PT", "SI"]);
    // The digit-letters-digit arrangement is Slovenian and nothing else.
    const unique = detect("GO 1-ABC2");
    expect(unique.status).toBe("VALID");
    expect(unique.country).toBe("SI");
  });
});

describe("Slovenia — historic and test plates", () => {
  it("parses the MV historic plate and reports its light-blue face", () => {
    const result = parse("MV 12-ABC", { country: "SI" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SI_HISTORIC");
    expect(result.registration?.type).toBe("HISTORICAL");
    // Article 40(2): light blue background, white MV, mark and border.
    expect(result.visual).toEqual({ background: "BLUE", foreground: "WHITE" });
  });

  it("parses the PR test plate", () => {
    const result = parse("PR 12-ABC", { country: "SI" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SI_TEST");
    expect(result.registration?.type).toBe("PROFESSIONAL_TEMPORARY");
    expect(result.registration?.temporary).toBe(true);
  });

  it("keeps MV and PR disjoint from the area designations", () => {
    // Neither is in Priloga IV, so no Slovenian scheme competes with another.
    expect(parse("MV 12-ABC", { country: "SI" }).scheme?.id).toBe("SI_HISTORIC");
    expect(parse("PO 12-ABC", { country: "SI" }).scheme?.id).toBe("SI_ORDINARY_NN_LL");
  });
});
