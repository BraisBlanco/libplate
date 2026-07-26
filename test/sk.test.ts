import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Slovakia — the ordinary series", () => {
  it("parses two letters, three digits and two letters", () => {
    const result = parse("AA203SO", { country: "SK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SK_ORDINARY");
    // The príloha č. 17 specimen groups the mark as [AA][203SO], the state
    // emblem standing where the space is.
    expect(result.formatted).toBe("AA 203SO");
    expect(result.normalized).toBe("AA203SO");
    expect(result.scheme?.components).toEqual({
      series: "AA",
      number: "203",
      seriesTail: "S",
      seriesTailSecond: "O",
    });
  });

  it("accepts the full alphabet and any three digits", () => {
    // § 124 ods. 3 písm. f) bans diacritics and lower case for CHOSEN numbers
    // only, and the official specimen itself uses Q, O, S and X.
    expect(parse("EL 586QX", { country: "SK" }).status).toBe("VALID");
    expect(parse("AA 000AA", { country: "SK" }).status).toBe("VALID");
    expect(parse("AA 12AB", { country: "SK" }).status).toBe("INVALID");
    expect(parse("AAA 123AB", { country: "SK" }).status).toBe("INVALID");
  });

  it("does not read a district out of the opening pair", () => {
    // Zákon č. 128/2021 Z. z. deleted the second sentence of § 124 ods. 1 with
    // effect from 1 January 2023, so BA is a sequence value, not Bratislava.
    // The scheme therefore exposes no area component and no table.
    const result = parse("BA-123AB", { country: "SK" });
    expect(result.status).toBe("VALID");
    expect(Object.keys(result.scheme?.components ?? {})).not.toContain("area");
  });
});

describe("Slovakia — the towed-vehicle block", () => {
  it("reads a Y after the emblem as a trailer or an agricultural vehicle", () => {
    // § 35 ods. 3 vyhlášky gives category O and R vehicles the letter Y in the
    // first position of the pair after the state emblem.
    const result = parse("AA 123YB", { country: "SK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SK_TRAILER");
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
    // Not DETERMINISTIC: ods. 4 lets a category T or C tractor take the same Y
    // "v odôvodnených prípadoch".
    expect(result.vehicle?.possibleCategories).toEqual([
      "TRAILER_OR_SEMITRAILER",
      "AGRICULTURAL_VEHICLE",
    ]);
  });

  it("keeps the Y block out of the ordinary series", () => {
    expect(parse("AA 123YB", { country: "SK" }).scheme?.id).not.toBe("SK_ORDINARY");
    // Only the FIRST letter of the closing pair is reserved.
    expect(parse("AA 123AY", { country: "SK" }).scheme?.id).toBe("SK_ORDINARY");
  });
});

describe("Slovakia — the electric and hydrogen series", () => {
  it("recognises EL and EV, and only those two", () => {
    // § 35 ods. 7 vyhlášky: the letters "začínajú písmenami EL alebo EV".
    expect(parse("EL 586QX", { country: "SK" }).scheme?.id).toBe("SK_ELECTRIC");
    expect(parse("EV 536MK", { country: "SK" }).scheme?.id).toBe("SK_ELECTRIC");
    expect(parse("EK 586QX", { country: "SK" }).scheme?.id).toBe("SK_ORDINARY");
  });

  it("asserts the white ground but not the green characters", () => {
    // § 35 ods. 6 and 10 say the characters MAY be green, so only the
    // background can be stated.
    const result = parse("EL 586QX", { country: "SK" });
    expect(result.visual?.background).toBe("WHITE");
    expect(result.visual?.foreground).toBeUndefined();
  });
});

describe("Slovakia — diplomatic, state and special numbers", () => {
  it("separates the four § 125 series by their letter pair", () => {
    expect(parse("CD 12345", { country: "SK" }).scheme?.id).toBe("SK_DIPLOMATIC");
    expect(parse("CC 12345", { country: "SK" }).scheme?.id).toBe("SK_CONSULAR");
    expect(parse("ZZ 12345", { country: "SK" }).scheme?.id).toBe("SK_DIPLOMATIC_STAFF");
    expect(parse("CH 12345", { country: "SK" }).scheme?.id).toBe("SK_HONORARY_CONSUL");
    expect(parse("CD 12345", { country: "SK" }).registration?.diplomatic).toBe(true);
  });

  it("allows the optional second letter on a police number", () => {
    // § 126 ods. 3 písm. a) with ods. 7.
    expect(parse("P 12345", { country: "SK" }).scheme?.id).toBe("SK_POLICE");
    expect(parse("PZ 12345", { country: "SK" }).scheme?.id).toBe("SK_POLICE");
    expect(parse("PZZ 12345", { country: "SK" }).status).toBe("INVALID");
  });

  it("takes the armed-forces number with the emblem or a hyphen", () => {
    // § 126 ods. 3 písm. b) and ods. 4.
    const result = parse("12-34567", { country: "SK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("SK_ARMED_FORCES");
    expect(result.formatted).toBe("12-34567");
    expect(parse("1234567", { country: "SK" }).scheme?.id).toBe("SK_ARMED_FORCES");
  });

  it("maps each zvláštne letter to its own regime", () => {
    // § 127 ods. 1-2: the first row carries C, F, H, M, S or V and the second
    // five free characters.
    expect(parse("H 12345", { country: "SK" }).registration?.historical).toBe(true);
    expect(parse("V 12345", { country: "SK" }).registration?.type).toBe("EXPORT");
    expect(parse("M 12345", { country: "SK" }).registration?.type).toBe(
      "PROFESSIONAL_TEMPORARY",
    );
    expect(parse("M 12345", { country: "SK" }).registration?.temporary).toBe(true);
    // Letters are allowed in the second row, digits are not required.
    expect(parse("C ABCDE", { country: "SK" }).scheme?.id).toBe("SK_SPECIAL_C");
    expect(parse("C ABCD", { country: "SK" }).status).toBe("INVALID");
  });
});

describe("Slovakia — country-less detection", () => {
  it("joins the French and Italian LL-NNN-LL collision", () => {
    const result = detect("AB-123-CD");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      result.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["FR", "IT", "SK"]);
  });

  it("keeps the wide zvláštne series out of country-less detection", () => {
    // M + five free characters would otherwise shadow the German M-AB 123.
    const result = detect("MAB123");
    expect(result.candidates?.map((c) => c.scheme) ?? []).not.toContain("SK_SPECIAL_M");
    // With a country hint it resolves normally.
    expect(parse("MAB123", { country: "SK" }).scheme?.id).toBe("SK_SPECIAL_M");
  });
});
