import { describe, expect, it } from "vitest";
import {
  detect,
  format,
  getMetadataVersion,
  getSupportedCountries,
  getSupportedSchemes,
  parse,
  validate,
} from "../src/index.js";

describe("parse — known country", () => {
  it("validates and parses a trailer plate with deterministic inference", () => {
    const result = parse("R-1234-BCD", { country: "ES" });
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("ES");
    expect(result.normalized).toBe("R1234BCD");
    expect(result.formatted).toBe("R 1234 BCD");
    expect(result.scheme?.id).toBe("ES_TRAILER_CURRENT");
    expect(result.scheme?.components).toEqual({
      prefix: "R",
      serial: "1234",
      series: "BCD",
    });
    expect(result.vehicle?.category).toBe("TRAILER_OR_SEMITRAILER");
    expect(result.vehicle?.inferenceLevel).toBe("DETERMINISTIC");
  });

  it("normalizes case and separators", () => {
    const result = parse("r 1234 bcd", { country: "ES" });
    expect(result.status).toBe("VALID");
    expect(result.normalized).toBe("R1234BCD");
  });

  it("cannot infer a category from the ordinary series", () => {
    const result = parse("1234 BCD", { country: "ES" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("ES_ORDINARY_CURRENT");
    expect(result.vehicle?.inferenceLevel).toBe("NOT_INFERABLE");
    expect(result.vehicle?.category).toBeUndefined();
  });

  it("never rules historical status in or out from text alone", () => {
    const result = parse("1234 BCD", { country: "ES" });
    expect(result.registration?.historical).toBeNull();
  });

  it("reports expected visual appearance", () => {
    const result = parse("C-1234-BCD", { country: "ES" });
    expect(result.visual).toEqual({ background: "YELLOW", foreground: "BLACK" });
  });
});

describe("parse — rejections", () => {
  it("rejects empty input", () => {
    const result = parse("   ", { country: "ES" });
    expect(result.status).toBe("INVALID");
    expect(result.errors[0]?.reason).toBe("EMPTY_INPUT");
  });

  it("rejects invalid characters", () => {
    const result = parse("1234@BCD", { country: "ES" });
    expect(result.status).toBe("INVALID");
    expect(result.errors[0]?.reason).toBe("INVALID_CHARACTERS");
  });

  it("rejects a well-formed-looking but non-matching plate", () => {
    // Q is excluded from the Spanish series alphabet.
    const result = parse("9999 QQQ", { country: "ES" });
    expect(result.status).toBe("INVALID");
    expect(result.errors[0]?.reason).toBe("INVALID_STRUCTURE");
  });

  it("reports unsupported countries", () => {
    const result = parse("1234 BCD", { country: "DE" });
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.errors[0]?.reason).toBe("UNSUPPORTED_COUNTRY");
  });

  it("respects the reference date for historical filtering", () => {
    // The current ordinary series did not exist in 1990.
    const result = parse("1234 BCD", { country: "ES", referenceDate: "1990-01-01" });
    expect(result.status).toBe("INVALID");
  });
});

describe("detect — no country hint", () => {
  it("resolves the country when a single scheme matches", () => {
    const result = detect("C 1234 BCD");
    expect(result.status).toBe("VALID");
    expect(result.country).toBe("ES");
    expect(result.scheme?.id).toBe("ES_MOPED_CURRENT");
    expect(result.vehicle?.category).toBe("MOPED_OR_MOTOR_CYCLE");
  });
});

describe("convenience helpers", () => {
  it("validate returns a boolean", () => {
    expect(validate("1234 BCD", { country: "ES" })).toBe(true);
    expect(validate("nope!", { country: "ES" })).toBe(false);
  });

  it("format returns the national format or null", () => {
    expect(format("1234-BCD", { country: "ES" })).toBe("1234 BCD");
    expect(format("nope!", { country: "ES" })).toBeNull();
  });

  it("exposes supported countries, schemes and versions", () => {
    expect(getSupportedCountries()).toEqual(["BE", "ES", "FR", "IT", "NL", "PT"]);
    expect(getSupportedSchemes("ES")).toContain("ES_TRAILER_CURRENT");
    expect(getSupportedSchemes()).toHaveLength(21);
    expect(getMetadataVersion()).toMatch(/^\d{4}\.\d{2}\.\d+$/);
  });
});
