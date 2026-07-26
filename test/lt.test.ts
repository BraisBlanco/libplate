import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Lithuania — the ordinary series", () => {
  it("parses three letters and three digits", () => {
    const result = parse("ABC 123", { country: "LT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LT_ORDINARY");
    expect(result.formatted).toBe("ABC 123");
    expect(result.scheme?.components).toEqual({ series: "ABC", number: "123" });
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("rules trailers out of the ordinary series", () => {
    // 21.1 p. assigns three letters + three digits to categories M and N only.
    // Category O has its own composition, so unlike most European ordinary
    // series this one can say "not a trailer" from the text.
    const result = parse("ABC 123", { country: "LT" });
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
    expect(result.vehicle?.possibleCategories).toEqual([
      "PASSENGER_CAR",
      "VAN",
      "TRUCK",
      "BUS",
    ]);
    expect(result.vehicle?.possibleCategories).not.toContain("TRAILER_OR_SEMITRAILER");
  });

  it("excludes the letters missing from the Lithuanian alphabet", () => {
    // 21 p.: automatically composed numbers use "lietuvių kalbos abėcėlėje
    // esančios lotyniškos raidės", and that alphabet has no Q, W or X.
    for (const plate of ["AQC 123", "AWC 123", "AXC 123"]) {
      expect(parse(plate, { country: "LT" }).status).toBe("INVALID");
    }
    // Y is a Lithuanian letter and is not excluded.
    expect(parse("AYC 123", { country: "LT" }).status).toBe("VALID");
  });
});

describe("Lithuania — the trailer series", () => {
  it("infers a towed vehicle deterministically", () => {
    // The headline of Lithuanian coverage: 21.3 p. gives two letters + three
    // digits to category O and to nothing else, so the number itself says
    // "trailer or semitrailer".
    const result = parse("AB 123", { country: "LT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LT_TRAILER");
    expect(result.vehicle?.inferenceLevel).toBe("DETERMINISTIC");
    expect(result.vehicle?.category).toBe("TRAILER_OR_SEMITRAILER");
  });

  it("does not accept the ordinary letter count", () => {
    expect(parse("ABC 123", { country: "LT" }).scheme?.id).toBe("LT_ORDINARY");
    expect(parse("A 123", { country: "LT" }).status).toBe("INVALID");
  });
});

describe("Lithuania — L-category vehicles", () => {
  it("separates mopeds from motorcycles by digit count, not by order", () => {
    // Both 21.4 and 21.5 p. put the digits first. What splits them is how many:
    // two digits + three letters is a moped, three digits + two letters is a
    // motorcycle. Same five characters, different vehicle.
    const moped = parse("12 ABC", { country: "LT" });
    expect(moped.scheme?.id).toBe("LT_MOPED");
    expect(moped.vehicle?.possibleCategories).toEqual([
      "MOPED_OR_MOTOR_CYCLE",
      "QUADRICYCLE",
    ]);

    const motorcycle = parse("123 AB", { country: "LT" });
    expect(motorcycle.scheme?.id).toBe("LT_MOTORCYCLE");
    expect(motorcycle.vehicle?.possibleCategories).toEqual([
      "MOTORCYCLE",
      "TRICYCLE",
      "QUADRICYCLE",
    ]);
  });

  it("keeps the moped shape apart from the trailer shape", () => {
    // Two letters + three digits is a trailer; two digits + three letters is a
    // moped. Neither reading can claim the other's string.
    expect(parse("AB 123", { country: "LT" }).scheme?.id).toBe("LT_TRAILER");
    expect(parse("12 ABC", { country: "LT" }).scheme?.id).toBe("LT_MOPED");
  });
});

describe("Lithuania — the special plate types", () => {
  it("parses an electromobile number behind its mandatory E", () => {
    const result = parse("EV 1234", { country: "LT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LT_ELECTRIC");
    expect(result.formatted).toBe("EV 1234");
    expect(result.vehicle?.possibleCategories).toEqual(["PASSENGER_CAR", "VAN"]);
    // The second letter is not restricted to the groups issued so far.
    expect(parse("EB 5678", { country: "LT" }).status).toBe("VALID");
    expect(parse("AV 1234", { country: "LT" }).status).toBe("INVALID");
  });

  it("infers a passenger car from a taxi number", () => {
    const result = parse("T 01244", { country: "LT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LT_TAXI");
    expect(result.vehicle?.inferenceLevel).toBe("DETERMINISTIC");
    expect(result.vehicle?.category).toBe("PASSENGER_CAR");
  });

  it("infers a quadricycle from the four-character number", () => {
    const result = parse("AB 12", { country: "LT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LT_QUADRICYCLE");
    expect(result.vehicle?.category).toBe("QUADRICYCLE");
  });

  it("mirrors the historic H by vehicle category", () => {
    // 21.6.1 p. puts the H first for M and N, 21.6.2 p. puts it last for L.
    const car = parse("H 12345", { country: "LT" });
    expect(car.scheme?.id).toBe("LT_HISTORIC");
    expect(car.registration?.historical).toBe(true);

    const bike = parse("1234 H", { country: "LT" });
    expect(bike.scheme?.id).toBe("LT_HISTORIC_L");
    expect(bike.registration?.historical).toBe(true);

    // Neither position is interchangeable.
    expect(parse("H 1234", { country: "LT" }).status).toBe("INVALID");
    expect(parse("12345 H", { country: "LT" }).status).toBe("INVALID");
  });
});

describe("Lithuania — export plates", () => {
  it("reports the red characters of the export plate", () => {
    const result = parse("1234 AB", { country: "LT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("LT_EXPORT");
    expect(result.registration?.type).toBe("EXPORT");
    expect(result.visual).toEqual({ background: "WHITE", foreground: "RED" });
  });

  it("lumps trailers in with motor vehicles, unlike the ordinary series", () => {
    // 21.9.1 p. reads "M ir N ir O kategorijų" — one composition for all three.
    expect(parse("1234 AB", { country: "LT" }).vehicle?.possibleCategories).toContain(
      "TRAILER_OR_SEMITRAILER",
    );
  });

  it("withholds H from the single-letter export number", () => {
    // 21.9.2 p. does not restrict the letter, but 21.6.2 p. reserves four
    // digits + a final H for historic L vehicles and 21 p. requires numbers to
    // be unique. Keeping H would swallow LT_HISTORIC_L whole.
    expect(parse("1234 A", { country: "LT" }).scheme?.id).toBe("LT_EXPORT_L");
    expect(parse("1234 H", { country: "LT" }).scheme?.id).toBe("LT_HISTORIC_L");
    expect(parse("1234 H", { country: "LT" }).status).toBe("VALID");
  });
});

describe("Lithuania — diplomatic plates", () => {
  it("parses the six- and five-digit numbers behind a country hint", () => {
    const car = parse("123456", { country: "LT" });
    expect(car.status).toBe("VALID");
    expect(car.scheme?.id).toBe("LT_DIPLOMATIC");
    expect(car.registration?.diplomatic).toBe(true);
    // 1 priedas 4 p.: green material, white digits.
    expect(car.visual).toEqual({ background: "GREEN", foreground: "WHITE" });

    const trailer = parse("12345", { country: "LT" });
    expect(trailer.scheme?.id).toBe("LT_DIPLOMATIC_L_O");
    expect(trailer.vehicle?.possibleCategories).toContain("TRAILER_OR_SEMITRAILER");
  });

  it("stays out of country-less detection", () => {
    // Bare digits carry no anchor, and nothing else in the library matches
    // them at these widths — so without the legacySeries flag every six-digit
    // string on earth would resolve as a Lithuanian diplomatic plate.
    expect(detect("123456").status).not.toBe("VALID");
    expect(detect("12345").status).not.toBe("VALID");
  });
});

describe("Lithuania — country-less detection", () => {
  it("shares the ordinary shape with Sweden, Finland, Germany and Italy", () => {
    const result = detect("ABC 123");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      [...new Set(result.candidates?.map((c) => c.country))].sort((a, b) =>
        a.localeCompare(b),
      ),
    ).toEqual(["DE", "FI", "IT", "LT", "SE"]);
  });

  it("resolves the historic L number on its own", () => {
    // Four digits closed by a literal H is anchored enough to stand alone.
    const result = detect("1234 H");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("LT");
    expect(result.scheme?.id).toBe("LT_HISTORIC_L");
  });
});
