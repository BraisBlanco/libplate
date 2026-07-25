import { describe, expect, it } from "vitest";
import { parse } from "../src/index.js";

describe("Bulgaria — ordinary series", () => {
  it("parses code + four digits + series", () => {
    const result = parse("CA 1234 AB", { country: "BG" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("BG_ORDINARY");
    expect(result.formatted).toBe("CA 1234 AB");
    expect(result.scheme?.components).toEqual({
      code: "CA",
      number: "1234",
      series: "AB",
    });
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
  });

  it("accepts one-letter codes and one-letter series", () => {
    expect(parse("B 4321 K", { country: "BG" }).scheme?.id).toBe("BG_ORDINARY");
    expect(parse("PB 0001 BM", { country: "BG" }).scheme?.id).toBe("BG_ORDINARY");
  });

  it("accepts only the twelve Cyrillic/Latin look-alike letters", () => {
    // A, B, E, K, M, H, O, P, C, T, Y, X — anything else is not on a plate.
    expect(parse("CD 1234 AB", { country: "BG" }).status).toBe("INVALID");
    expect(parse("CA 1234 AZ", { country: "BG" }).status).toBe("INVALID");
    expect(parse("CA 1234 AY", { country: "BG" }).scheme?.id).toBe("BG_ORDINARY");
  });

  it("splits every compact input uniquely thanks to the fixed four digits", () => {
    const compact = parse("A1234BC", { country: "BG" });
    expect(compact.status).toBe("VALID");
    expect(compact.scheme?.components).toEqual({
      code: "A",
      number: "1234",
      series: "BC",
    });
  });

  it("reads the third plate's extra digit as its own series", () => {
    const third = parse("CA 51234 AB", { country: "BG" });
    expect(third.status).toBe("VALID");
    expect(third.scheme?.id).toBe("BG_THIRD_PLATE");
    expect(third.visual).toEqual({ background: "WHITE", foreground: "RED" });
    // It only exists since 2015-06-01.
    expect(
      parse("CA 51234 AB", { country: "BG", referenceDate: "2014-01-01" }).status,
    ).toBe("INVALID");
  });
});

describe("Bulgaria — transit and trader plates", () => {
  it("parses transit numbers split by T, H or M", () => {
    const result = parse("123 T 456", { country: "BG" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("BG_TRANSIT");
    expect(result.registration?.temporary).toBe(true);
    expect(parse("999 H 000", { country: "BG" }).scheme?.id).toBe("BG_TRANSIT");
    expect(parse("123 X 456", { country: "BG" }).status).toBe("INVALID");
  });

  it("parses the five-digit category-L transit variant in both splits", () => {
    // The ordinance does not say where the М sits in the five-digit variant.
    const twoThree = parse("12 M 345", { country: "BG" });
    expect(twoThree.scheme?.id).toBe("BG_TRANSIT_L");
    expect(twoThree.vehicle?.possibleCategories).toContain("MOTORCYCLE");
    expect(parse("123 M 45", { country: "BG" }).scheme?.id).toBe("BG_TRANSIT_L");
  });

  it("parses traders' temporary numbers split by B", () => {
    const cars = parse("123 B 456", { country: "BG" });
    expect(cars.status).toBe("VALID");
    expect(cars.scheme?.id).toBe("BG_TRADER_TEMPORARY");
    expect(cars.registration?.temporary).toBe(true);
    expect(parse("12 B 345", { country: "BG" }).scheme?.id).toBe("BG_TRADER_TEMPORARY_L");
  });
});
