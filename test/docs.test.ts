import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { METADATA } from "../src/generated/metadata.js";
import {
  getLibraryVersion,
  getMetadataVersion,
  getSupportedCountries,
  getSupportedSchemes,
  parse,
} from "../src/index.js";

/**
 * Executable documentation. Every claim in the README and in
 * `examples/index.html` that can be checked mechanically is checked here.
 *
 * This suite exists because those claims silently rotted once already: the
 * example page still advertised nine supported countries, and a `detect` result
 * documented as INVALID had become AMBIGUOUS, because nothing executed the
 * prose. Adding a country now fails this suite instead of quietly making the
 * docs wrong.
 */

const read = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

const README = read("README.md");
const EXAMPLES = read("examples/index.html");
const PACKAGE_JSON = JSON.parse(read("package.json")) as { version: string };

/** The two-letter code behind a flag emoji (🇪🇸 -> "ES"). */
function countryFromFlag(flag: string): string {
  const REGIONAL_INDICATOR_A = 0x1f1e6;
  return [...flag]
    .map((ch) => String.fromCharCode(0x41 + (ch.codePointAt(0)! - REGIONAL_INDICATOR_A)))
    .join("");
}

describe("versions are in sync", () => {
  it("LIBRARY_VERSION matches package.json", () => {
    // src/version.ts restates the version by hand; nothing else catches a drift.
    expect(getLibraryVersion()).toBe(PACKAGE_JSON.version);
  });

  it("the metadata version matches metadata/version.json", () => {
    const declared = JSON.parse(read("metadata/version.json")) as {
      metadataVersion: string;
    };
    expect(getMetadataVersion()).toBe(declared.metadataVersion);
  });
});

describe("README — coverage figures", () => {
  it("the headline country and scheme counts are current", () => {
    const headline = /\*\*(\d+) countries, (\d+) schemes\.\*\*/.exec(README);
    expect(headline, "coverage headline not found in README").not.toBeNull();
    expect(Number(headline![1])).toBe(getSupportedCountries().length);
    expect(Number(headline![2])).toBe(METADATA.schemes.length);
  });

  it("every per-country row states the real number of schemes", () => {
    // Rows look like: | [🇪🇸 Spain](#-spain) | 15 | Ordinary; … |
    const rows = [
      ...README.matchAll(
        /^\|\s*\[([\u{1F1E6}-\u{1F1FF}]{2})[^\]]*\]\([^)]*\)\s*\|\s*(\d+)\s*\|/gmu,
      ),
    ];
    expect(rows.length, "no country rows matched").toBeGreaterThan(0);

    const documented = new Map(
      rows.map((row) => [countryFromFlag(row[1]!), Number(row[2])]),
    );
    const actual = new Map(
      getSupportedCountries().map((country) => [
        country,
        getSupportedSchemes(country).length,
      ]),
    );
    expect(documented).toEqual(actual);
  });
});

/**
 * Compare a documented JSON fragment against a real result: every key the doc
 * shows must match, keys it omits are ignored (several blocks are deliberately
 * abridged), and the string `…` is a wildcard for values the doc elides.
 */
function expectDocumentedSubset(doc: unknown, real: unknown, path = "result"): void {
  if (doc === "…") return;
  if (Array.isArray(doc)) {
    expect(real, `${path} should be an array`).toBeInstanceOf(Array);
    const realArray = real as unknown[];
    expect(realArray, `${path} length`).toHaveLength(doc.length);
    doc.forEach((entry, i) => {
      expectDocumentedSubset(entry, realArray[i], `${path}[${i}]`);
    });
    return;
  }
  if (typeof doc === "object" && doc !== null) {
    expect(real, `${path} should be an object`).toBeTypeOf("object");
    for (const [key, value] of Object.entries(doc)) {
      expectDocumentedSubset(
        value,
        (real as Record<string, unknown>)[key],
        `${path}.${key}`,
      );
    }
    return;
  }
  expect(real, `${path} differs from the README`).toEqual(doc);
}

/** The ```json block containing `marker`, with `// …` comment lines stripped. */
function documentedJson(marker: string): unknown {
  const block = [...README.matchAll(/```json\n([\s\S]*?)```/g)]
    .map((match) => match[1]!)
    .find((body) => body.includes(marker));
  expect(block, `no README JSON block mentions ${marker}`).toBeDefined();
  const stripped = block!
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  return JSON.parse(stripped);
}

describe("README — the documented result shapes are real", () => {
  it("the full VALID result matches parse()", () => {
    expectDocumentedSubset(
      documentedJson('"ES_TRAILER_CURRENT"'),
      parse("R-1234-BCD", { country: "ES" }),
    );
  });

  it("the INVALID example matches parse()", () => {
    expectDocumentedSubset(
      documentedJson('"INVALID_STRUCTURE"'),
      parse("R 123 BCD", { country: "ES" }),
    );
  });

  it("the AMBIGUOUS_SEGMENTATION example matches parse()", () => {
    expectDocumentedSubset(
      documentedJson('"AMBIGUOUS_SEGMENTATION"'),
      parse("BAB123", { country: "DE" }),
    );
  });

  it("the UNSUPPORTED example matches parse()", () => {
    expectDocumentedSubset(
      documentedJson('"UNSUPPORTED_COUNTRY"'),
      parse("ABC123", { country: "GB" }),
    );
  });
});

describe("README — reason codes", () => {
  it("the 'emitted today' list is exactly what the engine can produce", () => {
    // Every reason the engine actually constructs, gathered from the source so
    // a new code cannot be added without the README noticing.
    const engineSource = read("src/engine/index.ts");
    const emitted = new Set(
      [...engineSource.matchAll(/\berror\(\s*"([A-Z_]+)"/g)].map((m) => m[1]!),
    );
    // The three AMBIGUOUS_* codes go through a variable, not a literal call.
    for (const code of [
      "AMBIGUOUS_COUNTRY",
      "AMBIGUOUS_SCHEME",
      "AMBIGUOUS_SEGMENTATION",
    ]) {
      expect(engineSource).toContain(`"${code}"`);
      emitted.add(code);
    }

    const section = /#### Reason codes\n([\s\S]*?)\n#### /.exec(README);
    expect(section, "reason-codes section not found").not.toBeNull();
    const [emittedPart, reservedPart] = section![1]!.split("Also declared");
    expect(reservedPart, "the 'also declared' paragraph is missing").toBeDefined();

    for (const code of emitted) {
      expect(emittedPart, `${code} is emitted but not documented as such`).toContain(
        code,
      );
      expect(
        reservedPart!.split(".")[0],
        `${code} is emitted but listed as reserved`,
      ).not.toContain(code);
    }
  });
});

describe("examples/index.html — the documented outputs are real", () => {
  it("lists every supported country", () => {
    const claim =
      /getSupportedCountries\(\);\s*\n<span class="comment">\/\/ (\[[^\]]*\])/.exec(
        EXAMPLES,
      );
    expect(claim, "getSupportedCountries claim not found").not.toBeNull();
    expect(JSON.parse(claim![1]!)).toEqual(getSupportedCountries());
  });

  it("lists the real leading Spanish scheme ids", () => {
    const claim =
      /getSupportedSchemes\("ES"\);\s*<span class="comment">\/\/ \[([^\]]*), \.\.\.\]/.exec(
        EXAMPLES,
      );
    expect(claim, "getSupportedSchemes claim not found").not.toBeNull();
    const documented = claim![1]!.split(", ").map((id) => JSON.parse(id) as string);
    expect(getSupportedSchemes("ES").slice(0, documented.length)).toEqual(documented);
  });

  it("only switches on reason codes the engine can emit", () => {
    // The page used to branch on TOO_SHORT and INVALID_LENGTH, which no code
    // path produces — dead advice in a copy-paste example.
    const uiSwitch = /function plateFieldFeedback[\s\S]*?\n}<\/code><\/pre>/.exec(
      EXAMPLES,
    );
    expect(uiSwitch, "the reason-code switch was not found").not.toBeNull();
    const cases = [...uiSwitch![0].matchAll(/case "([A-Z_]+)":/g)].map((m) => m[1]!);
    expect(cases.length).toBeGreaterThan(0);

    const statuses = new Set(["VALID", "AMBIGUOUS"]);
    const unreachable = new Set([
      "TOO_SHORT",
      "INVALID_LENGTH",
      "OUTSIDE_VALIDITY_PERIOD",
    ]);
    for (const code of cases) {
      if (statuses.has(code)) continue;
      expect(unreachable, `example switches on unreachable ${code}`).not.toContain(code);
    }
  });

  it("states outcomes that the library still produces", () => {
    // Each pair is a claim written in the page as a `// status: "X"` comment.
    const claims: { call: () => string; documented: string }[] = [
      { call: () => parse("R-1234-BCD", { country: "ES" }).status, documented: "VALID" },
      { call: () => parse("00-00-AA", { country: "PT" }).status, documented: "VALID" },
      {
        call: () =>
          parse("00-00-AA", { country: "PT", referenceDate: "2019-06-01" }).status,
        documented: "INVALID",
      },
      { call: () => parse("BAB123", { country: "DE" }).status, documented: "AMBIGUOUS" },
      { call: () => parse("B-AB 123").status, documented: "VALID" },
    ];
    for (const { call, documented } of claims) {
      expect(call()).toBe(documented);
    }
  });
});
