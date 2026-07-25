import { describe, expect, it } from "vitest";
import { parse } from "../src/index.js";

describe("Denmark — ordinary series", () => {
  it("parses two letters + one to five digits", () => {
    const result = parse("AB 12345", { country: "DK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("DK_ORDINARY");
    expect(result.formatted).toBe("AB 12345");
    expect(result.scheme?.components).toEqual({ letters: "AB", number: "12345" });
    // § 68, stk. 2 gives every registered vehicle the same composition, and
    // Motorstyrelsen's series division is by digit width, not by category.
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
  });

  it("accepts the shorter numbers the order allows", () => {
    expect(parse("XY 1", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
    expect(parse("XY 123", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
    expect(parse("XY 1234", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
    expect(parse("XY 123456", { country: "DK" }).status).toBe("INVALID");
    expect(parse("XYZ 12345", { country: "DK" }).status).toBe("INVALID");
  });

  it("reads the conventional 2-3 grouping of the digits", () => {
    // "AB 12 345" is how a Danish plate is written; the grouping is
    // typographic, so the number stays one segment.
    const result = parse("AB 12 345", { country: "DK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.components).toEqual({ letters: "AB", number: "12345" });
  });

  it("asserts no colours, because they follow the vehicle's tax status", () => {
    // White, yellow and the yellow/white "papegøjeplade" all carry a § 68,
    // stk. 2 number; only diplomatic plates get a colour in the order itself.
    expect(parse("AB 12345", { country: "DK" }).visual).toBeUndefined();
  });

  it("leaves the ranges Motorstyrelsen allocates to another series", () => {
    // 10-99 is the prøveskilt series, 76.000-77.999 the diplomatic one and RF
    // the airport one, so none of these is an ordinary number.
    for (const input of ["AB 12", "AB 76500", "RF 12345"]) {
      const result = parse(input, { country: "DK" });
      expect(result.scheme?.id).not.toBe("DK_ORDINARY");
    }
    // Ranges the catalogue leaves unallocated stay in the ordinary series.
    expect(parse("AB 98000", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
    expect(parse("AB 01234", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
  });
});

describe("Denmark — special series", () => {
  it("reads 76.000-77.999 as the diplomatic series, on blue", () => {
    const result = parse("AB 76123", { country: "DK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("DK_DIPLOMATIC");
    expect(result.registration?.type).toBe("DIPLOMATIC");
    expect(result.scheme?.components).toEqual({ letters: "AB", number: "76123" });
    expect(result.visual).toEqual({ background: "BLUE", foreground: "WHITE" });
  });

  it("keeps the diplomatic range disjoint from the ordinary one", () => {
    expect(parse("AB 75999", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
    expect(parse("AB 78000", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
  });

  it("reads two letters + two digits as a fast prøveskilt", () => {
    const result = parse("AB 42", { country: "DK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("DK_TRADE_PLATE");
    expect(result.registration?.type).toBe("PROFESSIONAL_TEMPORARY");
    expect(result.registration?.temporary).toBe(true);
    expect(result.visual).toEqual({ background: "WHITE", foreground: "RED" });
    // The plate is issued to a business and moved between unregistered
    // vehicles, so it says nothing about what is under it.
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
    // The series is 10-99: a leading zero is not part of it, and nothing else
    // takes its place.
    expect(parse("AB 09", { country: "DK" }).status).toBe("INVALID");
  });

  it("reads the RF series as airport plates", () => {
    const result = parse("RF 12345", { country: "DK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("DK_AIRPORT");
    expect(result.scheme?.components).toEqual({ prefix: "RF", number: "12345" });
    expect(result.visual).toEqual({ background: "YELLOW", foreground: "RED" });
    expect(parse("RF 1000", { country: "DK" }).scheme?.id).toBe("DK_AIRPORT");
    // Four digits is the trailer product; three is not an airport number.
    expect(parse("RF 999", { country: "DK" }).status).toBe("INVALID");
  });
});
