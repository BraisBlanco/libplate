import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Portugal", () => {
  it("validates the current general series", () => {
    const result = parse("AA 01 AA", { country: "PT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_GENERAL_CURRENT");
    expect(result.normalized).toBe("AA01AA");
    expect(result.formatted).toBe("AA 01 AA");
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
  });

  it("rejects the wrong digit count", () => {
    expect(parse("AA 000 AA", { country: "PT" }).status).toBe("INVALID");
  });
});

describe("France", () => {
  it("validates the current SIV series", () => {
    const result = parse("AA-123-AA", { country: "FR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FR_SIV_CURRENT");
    expect(result.formatted).toBe("AA-123-AA");
    expect(result.vehicle?.inferenceLevel).toBe("REGISTRY_REQUIRED");
  });

  it("rejects excluded letters (I, O, U)", () => {
    expect(parse("IO-123-AA", { country: "FR" }).status).toBe("INVALID");
  });
});

describe("Italy", () => {
  it("validates the current ordinary series", () => {
    const result = parse("AB 123 CD", { country: "IT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("IT_CURRENT");
    expect(result.formatted).toBe("AB 123 CD");
  });

  it("rejects excluded letters (I, O, Q, U)", () => {
    expect(parse("AQ 123 AA", { country: "IT" }).status).toBe("INVALID");
  });
});

describe("Portugal — trailers, export and industrial machines", () => {
  it("validates a trailer plate and infers the category", () => {
    const result = parse("L 808970", { country: "PT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_TRAILER");
    expect(result.vehicle?.category).toBe("TRAILER_OR_SEMITRAILER");
    expect(result.vehicle?.inferenceLevel).toBe("DETERMINISTIC");
  });

  it("rejects a service code outside the official table", () => {
    expect(parse("XY 12345", { country: "PT" }).status).toBe("INVALID");
  });

  it("validates an export plate", () => {
    const result = parse("24783 L", { country: "PT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_EXPORT");
    expect(result.visual).toEqual({ background: "YELLOW", foreground: "BLACK" });
  });

  it("validates industrial-machine plates of both eras", () => {
    const current = parse("AA 08 AM B", { country: "PT" });
    expect(current.scheme?.id).toBe("PT_INDUSTRIAL_CURRENT");
    expect(current.vehicle?.category).toBe("INDUSTRIAL_MACHINE");
    expect(parse("08-AM-08 A", { country: "PT" }).scheme?.id).toBe(
      "PT_INDUSTRIAL_2006_2020",
    );
    // K is not a circulation class.
    expect(parse("AA 08 AM K", { country: "PT" }).status).toBe("INVALID");
  });

  it("uses separators to split trailer codes from the pre-1992 series", () => {
    // A two-letter service code plus four digits shares its compact shape
    // with the pre-1992 general series.
    expect(parse("SE1234", { country: "PT" }).status).toBe("AMBIGUOUS");
    // Separators at both boundaries only fit the general-series reading.
    expect(parse("SE-12-34", { country: "PT" }).scheme?.id).toBe("PT_GENERAL_UNTIL_1992");
  });
});

describe("Italy — beyond the ordinary series", () => {
  it("validates a motorcycle plate with honest inference", () => {
    const result = parse("AB 12345", { country: "IT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("IT_MOTORCYCLE");
    // The shape is shared with pre-2013 "Rimorchio" trailer plates.
    expect(result.vehicle?.inferenceLevel).toBe("VISUAL_EVIDENCE_REQUIRED");
  });

  it("validates a moped code and enforces its base-28 character set", () => {
    expect(parse("X5FJPD", { country: "IT" }).scheme?.id).toBe("IT_MOPED");
    // Vowels, Q, 0 and 1 are outside the moped character base.
    expect(parse("X01BCD", { country: "IT" }).status).toBe("INVALID");
  });

  it("routes EE plates to the Escursionisti Esteri scheme, not the car series", () => {
    const car = parse("EE 123 AB", { country: "IT" });
    expect(car.scheme?.id).toBe("IT_EE");
    expect(parse("EE 456 C", { country: "IT" }).scheme?.id).toBe("IT_EE");
  });

  it("validates machine and test plates", () => {
    const agri = parse("AE 123 B", { country: "IT" });
    expect(agri.scheme?.id).toBe("IT_AGRICULTURAL");
    expect(agri.vehicle?.category).toBe("AGRICULTURAL_VEHICLE");
    const op = parse("AE B 123", { country: "IT" });
    expect(op.scheme?.id).toBe("IT_OPERATING_MACHINE");
    expect(op.vehicle?.category).toBe("INDUSTRIAL_MACHINE");
    expect(parse("A1 P 23B45", { country: "IT" }).scheme?.id).toBe("IT_PROVA");
  });

  it("reports the compact machine/moped overlap and resolves it via separators", () => {
    // Every character of BB234C is in the moped base-28 set, and it also
    // reads as an agricultural plate (BB 234 C).
    expect(parse("BB234C", { country: "IT" }).status).toBe("AMBIGUOUS");
    expect(parse("BB 234 C", { country: "IT" }).scheme?.id).toBe("IT_AGRICULTURAL");
  });
});

describe("cross-country ambiguity", () => {
  it("reports FR, IT and SK as candidates for a shared LL-NNN-LL shape", () => {
    // "AB123CD" is a valid SIV plate, a valid Italian plate and a valid Slovak
    // one; without a country hint the library must not guess.
    const result = detect("AB-123-CD");
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_COUNTRY");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["FR", "IT", "SK"]);
  });

  it("drops a candidate when its alphabet excludes a letter", () => {
    // Q is allowed in the French and Slovak alphabets but excluded in the
    // Italian one, so Italy leaves the candidate list. FR and SK stay: neither
    // restricts the letter, which is exactly why the library reports both
    // instead of picking.
    const result = detect("AQ-123-AB");
    expect(result.status).toBe("AMBIGUOUS");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["FR", "SK"]);
  });
});
