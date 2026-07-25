import { describe, expect, it } from "vitest";
import { parse } from "../src/index.js";

describe("Denmark — ordinary series", () => {
  it("parses two letters + one to five digits", () => {
    const result = parse("AB 12345", { country: "DK" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("DK_ORDINARY");
    expect(result.formatted).toBe("AB 12345");
    expect(result.scheme?.components).toEqual({ letters: "AB", number: "12345" });
    // § 68, stk. 2 gives every registered vehicle the same composition.
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
  });

  it("accepts the shorter numbers the order allows", () => {
    expect(parse("XY 1", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
    expect(parse("XY 123", { country: "DK" }).scheme?.id).toBe("DK_ORDINARY");
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
});
