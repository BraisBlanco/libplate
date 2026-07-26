import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Norway — the two number series", () => {
  it("reads two letters and five digits as a car or a lorry", () => {
    // Statens vegvesen: "Tallseriene for biler og lastebiler er fra 10000 til
    // 99999, mens for andre kjøretøy er det fra 1000 til 9999."
    const result = parse("AB12345", { country: "NO" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("NO_ORDINARY");
    expect(result.formatted).toBe("AB 12345");
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
    expect(result.vehicle?.possibleCategories).toEqual([
      "PASSENGER_CAR",
      "VAN",
      "TRUCK",
      "BUS",
    ]);
  });

  it("reads two letters and four digits as everything else, trailers included", () => {
    const result = parse("AB 1234", { country: "NO" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("NO_ORDINARY_OTHER");
    expect(result.vehicle?.possibleCategories).toContain("TRAILER_OR_SEMITRAILER");
    expect(result.vehicle?.possibleCategories).not.toContain("TRUCK");
  });

  it("enforces the range floors, not just the digit counts", () => {
    expect(parse("AB 09999", { country: "NO" }).status).toBe("INVALID");
    expect(parse("AB 0999", { country: "NO" }).status).toBe("INVALID");
    expect(parse("AB 10000", { country: "NO" }).status).toBe("VALID");
    expect(parse("AB 1000", { country: "NO" }).status).toBe("VALID");
  });

  it("accepts the full alphabet, because the series list is not a rule", () => {
    // The Skiltserier page introduces its letter table with "ofte basert på
    // hvilken trafikkstasjon", so the pairs it happens to omit (no I, M, O or Q
    // anywhere) are an observation, not a published exclusion.
    expect(parse("QI 12345", { country: "NO" }).status).toBe("VALID");
  });

  it("asserts no colours on the general series", () => {
    // § 2-11 (3) of the bruksforskrift: black on white is the rule, but a
    // varebil klasse 2 carries the same mark on green, an off-road vehicle on
    // black, a Forsvaret vehicle on yellow and a rally car on black.
    expect(parse("AB 12345", { country: "NO" }).visual).toBeUndefined();
  });
});

describe("Norway — the reserved letter combinations", () => {
  it("splits the electric series off the ordinary one", () => {
    const result = parse("EL 12345", { country: "NO" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("NO_ELECTRIC");
    // ES, ET, EX, EY and EZ are ordinary district series, not electric ones.
    expect(parse("ES 12345", { country: "NO" }).scheme?.id).toBe("NO_ORDINARY");
  });

  it("covers the gas, hydrogen and embassy series", () => {
    expect(parse("GA 12345", { country: "NO" }).scheme?.id).toBe("NO_GAS");
    expect(parse("HY 12345", { country: "NO" }).scheme?.id).toBe("NO_HYDROGEN");
    const cd = parse("CD 12345", { country: "NO" });
    expect(cd.scheme?.id).toBe("NO_DIPLOMATIC");
    expect(cd.registration?.diplomatic).toBe(true);
    // The one Norwegian series whose colours the forskrift fixes: § 2-11 (3) d).
    expect(cd.visual).toEqual({ background: "BLUE", foreground: "YELLOW" });
  });

  it("reports NOT_INFERABLE on the fuel series, which union both widths", () => {
    expect(parse("EL 1234", { country: "NO" }).vehicle?.inferenceLevel).toBe(
      "NOT_INFERABLE",
    );
    expect(parse("EL 12345", { country: "NO" }).vehicle?.inferenceLevel).toBe(
      "NOT_INFERABLE",
    );
  });
});

describe("Norway — the pre-1971 registration order", () => {
  it("parses a county letter and three to six digits", () => {
    // § 2-16 (1) a) of the bruksforskrift, issuable today under § 2-15 (1).
    const result = parse("A-1234", { country: "NO" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("NO_PRE_1971_LETTER");
    expect(result.formatted).toBe("A-1234");
    // § 2-15 conditions the whole order on a 30-year-old vehicle, so the
    // historic regime is certain even though the category is not.
    expect(result.registration?.historical).toBe(true);
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
  });

  it("uses the § 2-16 (4) county letters, not the modern alphabet", () => {
    // The enumerated list is A B C D E F G H I K L O R S T U V W X Y Z.
    expect(parse("I-1234", { country: "NO" }).status).toBe("VALID");
    expect(parse("O-1234", { country: "NO" }).status).toBe("VALID");
    expect(parse("J-1234", { country: "NO" }).status).toBe("INVALID");
    expect(parse("M-1234", { country: "NO" }).status).toBe("INVALID");
  });

  it("parses the six-digit variant in pairs", () => {
    const result = parse("12-34-56", { country: "NO" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("NO_PRE_1971_DIGITS");
    expect(result.formatted).toBe("12-34-56");
  });
});

describe("Norway — country-less detection", () => {
  it("collides with the Danish, Italian and Polish two-plus-five shape", () => {
    const result = detect("WA 12345");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      result.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["DK", "IT", "NO", "PL"]);
  });

  it("keeps the structureless pre-1971 series out of country-less detection", () => {
    const result = detect("123456");
    expect(result.candidates?.map((c) => c.scheme) ?? []).not.toContain(
      "NO_PRE_1971_DIGITS",
    );
    expect(parse("123456", { country: "NO" }).scheme?.id).toBe("NO_PRE_1971_DIGITS");
  });
});
