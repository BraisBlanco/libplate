import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Greece — the ordinary car series", () => {
  it("parses three letters and four digits", () => {
    const result = parse("ABE 1234", { country: "GR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("GR_ORDINARY");
    expect(result.formatted).toBe("ABE 1234");
    expect(result.scheme?.components).toEqual({ letters: "ABE", number: "1234" });
  });

  it("accepts only the fourteen Greek/Latin look-alike letters", () => {
    // άρθρο 1 παρ. 2: Α, Β, Ε, Ζ, Η, Ι, Κ, Μ, Ν, Ο, Ρ, Τ, Υ, Χ — matched as
    // A, B, E, Z, H, I, K, M, N, O, P, T, Y, X.
    expect(parse("PYX 1234", { country: "GR" }).status).toBe("VALID");
    expect(parse("ZHT 1234", { country: "GR" }).status).toBe("VALID");
    // Greek Ρ is rho, so its look-alike is P — Latin R is not a plate letter,
    // and neither are C, D, F, G, J, L, Q, S, U, V or W.
    for (const plate of ["ABR 1234", "ABC 1234", "ABW 1234"]) {
      expect(parse(plate, { country: "GR" }).status).toBe("INVALID");
    }
  });

  it("bounds the number at 1000-9999", () => {
    expect(parse("ABE 0999", { country: "GR" }).status).toBe("INVALID");
    expect(parse("ABE 1000", { country: "GR" }).status).toBe("VALID");
    expect(parse("ABE 9999", { country: "GR" }).status).toBe("VALID");
  });

  it("asserts no colour, because Ι.Χ. and Δ.Χ. share the composition", () => {
    // άρθρο 2 παρ. 5: black on WHITE for private cars, black on YELLOW for
    // public-use ones (taxis, buses, hired lorries). The number does not say
    // which, so no colour is reported.
    expect(parse("ABE 1234", { country: "GR" }).visual).toBeUndefined();
  });

  it("rules trailers and motorcycles out, but not mopeds", () => {
    // άρθρο 1 gives motorcycles one to three digits (παρ. 3) and trailers the
    // letter Ρ (παρ. 4). The police-issued moped number of Υ.Α. 2513/2/218-ιδ
    // άρθρο 12 παρ. 1, however, is three of the SAME letters over a number from
    // 1 to 9999 — so a four-digit number can also be a moped.
    const result = parse("ABE 1234", { country: "GR" });
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
    expect(result.vehicle?.possibleCategories).toEqual([
      "PASSENGER_CAR",
      "VAN",
      "TRUCK",
      "BUS",
      "MOPED_OR_MOTOR_CYCLE",
    ]);
    expect(result.vehicle?.possibleCategories).not.toContain("TRAILER_OR_SEMITRAILER");
  });
});

describe("Greece — motorcycles", () => {
  it("takes one to three digits, zero-padded or not", () => {
    for (const plate of ["ABE 007", "ABE 7", "ABE 45", "ABE 999"]) {
      const result = parse(plate, { country: "GR" });
      expect(result.status).toBe("VALID");
      expect(result.scheme?.id).toBe("GR_MOTORCYCLE");
    }
    // The stated range is 001-999, so an all-zero number is out...
    expect(parse("ABE 000", { country: "GR" }).status).toBe("INVALID");
    // ...and four digits is the car series.
    expect(parse("ABE 1234", { country: "GR" }).scheme?.id).toBe("GR_ORDINARY");
  });

  it("is white and never a car or a trailer", () => {
    const result = parse("ABE 123", { country: "GR" });
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
    expect(result.vehicle?.possibleCategories).toEqual([
      "MOTORCYCLE",
      "TRICYCLE",
      "MOPED_OR_MOTOR_CYCLE",
    ]);
  });
});

describe("Greece — trailers", () => {
  it("infers a towed vehicle deterministically from the Ρ series", () => {
    const result = parse("P 12345", { country: "GR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("GR_TRAILER");
    expect(result.vehicle?.inferenceLevel).toBe("DETERMINISTIC");
    expect(result.vehicle?.category).toBe("TRAILER_OR_SEMITRAILER");
    // άρθρο 1 παρ. 4: 1000 to 99999, i.e. four or five digits.
    expect(parse("P 1000", { country: "GR" }).status).toBe("VALID");
    expect(parse("P 999", { country: "GR" }).status).toBe("INVALID");
    expect(parse("P 123456", { country: "GR" }).status).toBe("INVALID");
  });

  it("infers it from the 2019 Τ series too", () => {
    const result = parse("TA 12345", { country: "GR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("GR_TRAILER_PRIVATE");
    expect(result.formatted).toBe("TA 12345");
    expect(result.scheme?.components).toEqual({
      kind: "T",
      series: "A",
      number: "12345",
    });
    expect(result.vehicle?.category).toBe("TRAILER_OR_SEMITRAILER");
  });

  it("keeps the private series out of circulation before 2019-09-12", () => {
    // άρθρο 11 of Υ.Α. Γ9/46447/2397/2019: nine months after publication in
    // general, three months for special-purpose category O vehicles — which is
    // the earliest this series could be issued.
    expect(parse("TA 12345", { country: "GR", referenceDate: "2019-01-01" }).status).toBe(
      "INVALID",
    );
    expect(parse("TA 12345", { country: "GR", referenceDate: "2020-06-01" }).status).toBe(
      "VALID",
    );
    // The Ρ series carries no start date: it is older, and since 2020 it is the
    // public-use (Δ.Χ.) plate.
    expect(parse("P 12345", { country: "GR", referenceDate: "2005-01-01" }).status).toBe(
      "VALID",
    );
  });

  it("bounds the private series at 10000-99999 behind Τ + one letter", () => {
    expect(parse("TT 10000", { country: "GR" }).status).toBe("VALID");
    expect(parse("TA 1234", { country: "GR" }).status).toBe("INVALID");
    // The second character comes from the same fourteen letters.
    expect(parse("TR 12345", { country: "GR" }).status).toBe("INVALID");
    // The first is fixed.
    expect(parse("AT 12345", { country: "GR" }).status).toBe("INVALID");
  });
});

describe("Greece — country-less detection", () => {
  it("reports the German overlap on the car series", () => {
    // ABE1234 also reads as a German plate — AB-E 1234 (Aschaffenburg) or
    // A-BE 1234 (Augsburg) — so the country cannot be picked.
    const result = detect("ABE 1234");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      [...new Set(result.candidates?.map((c) => c.country))].sort((a, b) =>
        a.localeCompare(b),
      ),
    ).toEqual(["DE", "GR"]);
  });

  it("reports the Portuguese and Polish overlap on the Ρ trailer series", () => {
    // P12345 is a Portuguese trailer number (service code + order number) and a
    // Polish temporary number as well.
    const result = detect("P 12345");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      result.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["GR", "PL", "PT"]);
  });
});
