import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("France — WW provisional and SIV reserved pairs", () => {
  it("validates a WW provisional plate as its own regime", () => {
    const result = parse("WW-123-AA", { country: "FR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FR_WW_PROVISIONAL");
    expect(result.registration?.type).toBe("TEMPORARY_WW");
    expect(result.registration?.temporary).toBe(true);
  });

  it("does not accept the reserved SS pair as an ordinary SIV plate", () => {
    const result = parse("SS-123-AA", { country: "FR" });
    expect(result.status).toBe("INVALID");
  });

  it("does not classify a WW plate as ordinary SIV", () => {
    expect(parse("WW-123-AA", { country: "FR" }).scheme?.id).not.toBe("FR_SIV_CURRENT");
  });

  it("detects a WW plate as ambiguous between FR and IT", () => {
    // Italy's alphabet allows W, so WW-123-AA is also a valid Italian plate.
    const result = detect("WW-123-AA");
    expect(result.status).toBe("AMBIGUOUS");
    const countries = result.candidates
      ?.map((c) => c.country)
      .sort((a, b) => a.localeCompare(b));
    expect(countries).toEqual(["FR", "IT"]);
  });
});

describe("Spain — regime prefixes", () => {
  it("marks an H-prefixed plate as historical", () => {
    const result = parse("H 1234 BCD", { country: "ES" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("ES_HISTORICAL");
    expect(result.registration?.type).toBe("HISTORICAL");
    expect(result.registration?.historical).toBe(true);
  });

  it("keeps historical null for an ordinary plate (cannot tell from text)", () => {
    expect(parse("1234 BCD", { country: "ES" }).registration?.historical).toBeNull();
  });

  it("recognises the tourist, temporary-private and company regimes", () => {
    expect(parse("T 1234 BCD", { country: "ES" }).registration?.type).toBe("TOURIST");
    const p = parse("P 1234 BCD", { country: "ES" });
    expect(p.registration?.type).toBe("TEMPORARY_PRIVATE");
    expect(p.registration?.temporary).toBe(true);
    expect(p.visual).toEqual({ background: "GREEN", foreground: "WHITE" });
    expect(parse("S 1234 BCD", { country: "ES" }).registration?.type).toBe(
      "TEMPORARY_COMPANY",
    );
    expect(parse("V 1234 BCD", { country: "ES" }).registration?.type).toBe(
      "TEMPORARY_COMPANY",
    );
  });
});

describe("Portugal — historical series", () => {
  it("validates a historical series when the country is given", () => {
    const result = parse("00-00-AA", { country: "PT" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_GENERAL_1992_2005");
  });

  it("excludes historical series from country-less detection by default", () => {
    // "AA-00-00" only matches the pre-1992 historical series, which is opt-in.
    expect(detect("AA-00-00").status).toBe("INVALID");
  });

  it("includes historical series when explicitly requested", () => {
    const result = detect("AA-00-00", { includeHistorical: true });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_GENERAL_UNTIL_1992");
  });

  it("honours the reference date within a historical period", () => {
    const result = parse("00-AA-00", { country: "PT", referenceDate: "2010-01-01" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("PT_GENERAL_2005_2020");
  });
});
