import { describe, expect, it } from "vitest";
import { detect, parse } from "../src/index.js";

describe("France — SIV and provisional series", () => {
  it("parses the ordinary SIV format", () => {
    const result = parse("AB-123-CD", { country: "FR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FR_SIV_CURRENT");
    expect(result.formatted).toBe("AB-123-CD");
  });

  it("routes W and WW prefixes to their own schemes", () => {
    expect(parse("W-123-AB", { country: "FR" }).scheme?.id).toBe("FR_W_GARAGE");
    expect(parse("WW-123-AB", { country: "FR" }).scheme?.id).toBe("FR_WW_PROVISIONAL");
  });
});

describe("France — FNI legacy series (1950-2009)", () => {
  it("parses metropolitan numbers including the Corsican 2A/2B codes", () => {
    const result = parse("5723 HB 62", { country: "FR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FR_FNI_METROPOLE");
    expect(result.scheme?.components).toEqual({
      ordinal: "5723",
      series: "HB",
      dept: "62",
    });
    expect(parse("34 BXY 2A", { country: "FR" }).status).toBe("VALID");
  });

  it("enforces the 8-character cap (no 4-digit + 3-letter combination)", () => {
    expect(parse("448 NRC 75", { country: "FR" }).status).toBe("VALID");
    expect(parse("4482 NRC 75", { country: "FR" }).status).toBe("INVALID");
  });

  it("parses DOM numbers with their 3-digit department", () => {
    expect(parse("182 ABE 974", { country: "FR" }).scheme?.id).toBe("FR_FNI_DOM");
  });

  it("is opt-in for country-less detection like other legacy series", () => {
    expect(detect("5723 HB 62").status).toBe("INVALID");
    const optIn = detect("5723 HB 62", { includeHistorical: true });
    expect(optIn.status).toBe("VALID");
    expect(optIn.scheme?.id).toBe("FR_FNI_METROPOLE");
  });
});

describe("France — diplomatic, consular and K series", () => {
  it("parses each entity range of the CMD/CD series", () => {
    expect(parse("5 CD 1234", { country: "FR" }).scheme?.id).toBe("FR_DIPLOMATIC_CD");
    expect(parse("100 CD 2026", { country: "FR" }).scheme?.id).toBe("FR_DIPLOMATIC_CD");
    expect(parse("U 305 CD 12", { country: "FR" }).scheme?.id).toBe("FR_DIPLOMATIC_CD");
    expect(parse("500 CD 7", { country: "FR" }).scheme?.id).toBe("FR_DIPLOMATIC_CD");
    expect(parse("401 CD 5", { country: "FR" }).scheme?.id).toBe(
      "FR_INTERNATIONAL_ORG_CD",
    );
  });

  it("keeps the diplomatic and registration inferences honest", () => {
    const result = parse("U 305 CD 12", { country: "FR" });
    expect(result.registration?.diplomatic).toBe(true);
    expect(result.visual).toEqual({ background: "GREEN", foreground: "ORANGE" });
  });

  it("writes the consular department after a dot and formats it back", () => {
    const result = parse("105 C 1.75", { country: "FR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FR_CONSULAR_C");
    expect(result.scheme?.components).toEqual({
      country: "105",
      status: "C",
      serial: "1",
      dept: "75",
    });
    expect(result.formatted).toBe("105 C 1.75");
  });

  it("reports the genuine FNI/diplomatic text collision as ambiguous", () => {
    // "100 CD 20" is a well-formed FNI number (ordinal 100, series CD,
    // department 20) AND a well-formed embassy plate. Identical segment
    // boundaries, so separators cannot resolve it.
    const result = parse("100 CD 20", { country: "FR" });
    expect(result.status).toBe("AMBIGUOUS");
    const schemes = result.candidates?.map((c) => c.scheme).sort();
    expect(schemes).toEqual(["FR_DIPLOMATIC_CD", "FR_FNI_METROPOLE"]);
  });

  it("accepts K plates for embassies, delegations and organizations", () => {
    expect(parse("105 K 100", { country: "FR" }).scheme?.id).toBe(
      "FR_DIPLOMATIC_STAFF_K",
    );
    expect(parse("U 305 K 10", { country: "FR" }).scheme?.id).toBe(
      "FR_DIPLOMATIC_STAFF_K",
    );
    expect(parse("401 K 1000", { country: "FR" }).scheme?.id).toBe(
      "FR_DIPLOMATIC_STAFF_K",
    );
  });
});

describe("France — moped series (2004-2015)", () => {
  it("parses the dedicated cyclomoteur composition deterministically", () => {
    const result = parse("AB 123 C", { country: "FR" });
    expect(result.status).toBe("VALID");
    expect(result.scheme?.id).toBe("FR_MOPED_2004");
    expect(result.vehicle?.category).toBe("MOPED_OR_MOTOR_CYCLE");
    expect(result.vehicle?.inferenceLevel).toBe("DETERMINISTIC");
  });

  it("was closed to new issues on 2015-06-30", () => {
    const result = parse("AB 123 C", { country: "FR", referenceDate: "2016-01-01" });
    expect(result.status).toBe("INVALID");
  });
});
