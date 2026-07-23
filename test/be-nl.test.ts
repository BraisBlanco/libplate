import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Belgium", () => {
  it("validates the standard series", () => {
    const result = parse("1-ABC-123", { country: "BE" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("BE_STANDARD_CURRENT");
    expect(result.formatted).toBe("1-ABC-123");
    expect(result.visual).toEqual({ background: "WHITE", foreground: "RED" });
  });

  it("resolves uniquely in country-less detection", () => {
    const result = detect("2-XYZ-789");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("BE");
  });

  it("rejects a mis-shaped plate", () => {
    expect(parse("AB-123-CD", { country: "BE" }).status).toBe("INVALID");
  });
});

describe("Netherlands", () => {
  it("validates the current 2024 series", () => {
    const result = parse("GBB-01-B", { country: "NL" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("NL_CURRENT");
    expect(result.visual).toEqual({ background: "YELLOW", foreground: "BLACK" });
  });

  it("recognises the recent sidecodes", () => {
    expect(parse("G-001-BB", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_10");
    expect(parse("GB-001-B", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_9");
    expect(parse("1-KBB-00", { country: "NL" }).scheme?.id).toBe("NL_SIDECODE_8");
  });

  it("rejects vowels and other omitted letters", () => {
    // A is a vowel; Dutch plates omit vowels, C, Q, M, W.
    expect(parse("AAA-01-B", { country: "NL" }).status).toBe("INVALID");
    expect(parse("MWB-01-B", { country: "NL" }).status).toBe("INVALID");
  });

  it("resolves uniquely in country-less detection", () => {
    const result = detect("GBB-01-B");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("NL");
    expect(result.scheme?.id).toBe("NL_CURRENT");
  });
});
