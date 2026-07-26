import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("Finland — ordinary series", () => {
  it("parses letters + number", () => {
    const result = parse("ABC-123", { country: "FI" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FI_ORDINARY");
    expect(result.formatted).toBe("ABC-123");
    expect(result.scheme?.components).toEqual({ letters: "ABC", number: "123" });
    expect(result.visual).toEqual({ background: "WHITE", foreground: "BLACK" });
  });

  it("accepts the older two-letter marks and short numbers", () => {
    expect(parse("AB-1", { country: "FI" }).scheme?.id).toBe("FI_ORDINARY");
    expect(parse("AB 12", { country: "FI" }).scheme?.id).toBe("FI_ORDINARY");
  });

  it("treats the number as a number, so no leading zero", () => {
    expect(parse("ABC-012", { country: "FI" }).status).toBe("INVALID");
    expect(parse("ABC-0", { country: "FI" }).status).toBe("INVALID");
  });

  it("keeps CD for diplomatic vehicles without touching CDE", () => {
    const diplomatic = parse("CD-123", { country: "FI" });
    expect(diplomatic.status).toBe("VALID");
    expect(diplomatic.scheme?.id).toBe("FI_DIPLOMATIC");
    // A three-letter group that merely begins with CD is an ordinary mark.
    expect(parse("CDE-123", { country: "FI" }).scheme?.id).toBe("FI_ORDINARY");
  });
});

describe("Finland — L-class, tractor and machinery marks", () => {
  it("parses the number-first order", () => {
    const result = parse("123-ABC", { country: "FI" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FI_L_CLASS_TRACTOR");
    expect(result.scheme?.components).toEqual({ number: "123", letters: "ABC" });
    expect(result.vehicle?.inferenceLevel).toBe("CATEGORY_ONLY");
    expect(result.vehicle?.possibleCategories).toContain("MOTORCYCLE");
    expect(result.vehicle?.possibleCategories).toContain("AGRICULTURAL_VEHICLE");
    expect(result.vehicle?.possibleCategories).not.toContain("PASSENGER_CAR");
  });

  it("covers the one-letter machinery marks in the same scheme", () => {
    // The tractor/snowmobile space (1-3 letters) contains the L-class one
    // (2-3), and they differ only by colour — hence a single scheme with no
    // colours asserted.
    const result = parse("99-A", { country: "FI" });
    expect(result.scheme?.id).toBe("FI_L_CLASS_TRACTOR");
    expect(result.visual).toBeUndefined();
  });
});

describe("Finland — special series", () => {
  it("parses CD and C mission marks", () => {
    const cd = parse("CD-1234", { country: "FI" });
    expect(cd.scheme?.id).toBe("FI_DIPLOMATIC");
    expect(cd.visual).toEqual({ background: "BLUE", foreground: "WHITE" });

    const c = parse("C-12345", { country: "FI" });
    expect(c.scheme?.id).toBe("FI_MISSION_TAXFREE");
    expect(c.registration?.type).toBe("DIPLOMATIC_STAFF");
  });

  it("parses export and test plates", () => {
    const exported = parse("V-1234", { country: "FI" });
    expect(exported.scheme?.id).toBe("FI_EXPORT");
    expect(exported.registration?.type).toBe("EXPORT");

    const test = parse("KOE A-123", { country: "FI" });
    expect(test.scheme?.id).toBe("FI_TEST");
    expect(test.visual).toEqual({ background: "YELLOW", foreground: "BLACK" });
  });

  it("reports the export/mission overlap on C + up to four digits", () => {
    // Nothing in the text separates a C mission mark from an export mark
    // whose letter happens to be C — the plates differ by colour only.
    const result = parse("C-1234", { country: "FI" });
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_SCHEME");
    expect(
      result.candidates?.map((c) => c.scheme).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["FI_EXPORT", "FI_MISSION_TAXFREE"]);
  });
});

describe("Finland — country-less detection", () => {
  it("shares the ordinary shape with Sweden, Germany, Italy and Lithuania", () => {
    const result = detect("ABC 123");
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.errors[0]?.reason).toBe("AMBIGUOUS_COUNTRY");
    expect(
      [...new Set(result.candidates?.map((c) => c.country))].sort((a, b) =>
        a.localeCompare(b),
      ),
    ).toEqual(["DE", "FI", "IT", "LT", "SE"]);
  });

  it("shares the number-first shape with the Estonian standard mark", () => {
    const result = detect("123-ABC");
    expect(result.status).toBe("AMBIGUOUS");
    expect(
      result.candidates?.map((c) => c.country).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["EE", "FI"]);
  });
});
