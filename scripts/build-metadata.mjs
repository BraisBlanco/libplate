// Reads every YAML scheme under metadata/, validates it against the JSON
// Schema, and emits a single embedded TypeScript module the runtime imports.
// Keeping metadata out of the runtime dependency graph (no YAML/fs at runtime)
// makes the library browser-safe.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const metadataDir = join(root, "metadata");
const tablesDir = join(metadataDir, "tables");
const schemaPath = join(root, "schema", "plate-metadata.schema.json");
const outPath = join(root, "src", "generated", "metadata.ts");

// Mirrors MAX_EXPANSIONS in src/tokens/index.ts: catch runaway variable-length
// metadata at build time rather than at runtime.
const MAX_EXPANSIONS = 64;
const TABLE_VALUE_PATTERN = /^[A-ZÄÖÜ0-9]{1,8}$/;

function walkYaml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    // Value tables live under metadata/tables/ as JSON, not as schemes.
    if (entry.isDirectory() && full !== tablesDir) out.push(...walkYaml(full));
    else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) out.push(full);
  }
  return out;
}

let hadError = false;
function fail(rel, message) {
  hadError = true;
  console.error(`✗ ${rel}: ${message}`);
}

/** Load and validate metadata/tables/*.json into { id -> values }. */
function loadTables() {
  const tables = {};
  if (!existsSync(tablesDir)) return tables;
  for (const entry of readdirSync(tablesDir).sort()) {
    if (!entry.endsWith(".json")) continue;
    const rel = join("metadata", "tables", entry);
    const table = JSON.parse(readFileSync(join(tablesDir, entry), "utf8"));
    const expectedId = basename(entry, ".json");
    if (table.id !== expectedId) {
      fail(rel, `table id "${table.id}" must match the filename ("${expectedId}")`);
      continue;
    }
    if (!Array.isArray(table.sources) || table.sources.length === 0) {
      fail(rel, "table must cite at least one source (sources[])");
      continue;
    }
    if (!Array.isArray(table.values) || table.values.length === 0) {
      fail(rel, "table must define a non-empty values[] array");
      continue;
    }
    const seen = new Set();
    let valuesOk = true;
    for (const value of table.values) {
      if (typeof value !== "string" || !TABLE_VALUE_PATTERN.test(value)) {
        fail(rel, `value ${JSON.stringify(value)} does not match ${TABLE_VALUE_PATTERN}`);
        valuesOk = false;
      } else if (seen.has(value)) {
        fail(rel, `duplicate value "${value}"`);
        valuesOk = false;
      }
      seen.add(value);
    }
    if (valuesOk) tables[table.id] = [...table.values].sort((a, b) => a.localeCompare(b));
  }
  return tables;
}

/** How many concrete lengths a segment can take (for the expansion budget). */
function lengthChoices(segment, tables) {
  if (segment.type === "LITERAL") return 1;
  if (segment.type === "TABLE") {
    return new Set((tables[segment.table] ?? []).map((v) => v.length)).size || 1;
  }
  if (segment.type === "PATTERNS") {
    return new Set(segment.patterns.map((p) => p.length)).size || 1;
  }
  if (segment.length !== undefined) return 1;
  return segment.maxLength - segment.minLength + 1;
}

/** Semantic checks the JSON Schema cannot express. Returns true when clean. */
function checkSchemeSemantics(rel, scheme, tables, referencedTables) {
  let ok = true;
  const segmentNames = new Set(scheme.segments.map((s) => s.name));
  let expansions = 1;
  for (const segment of scheme.segments) {
    if (segment.minLength !== undefined && segment.minLength >= segment.maxLength) {
      fail(rel, `segment "${segment.name}": minLength must be < maxLength`);
      ok = false;
    }
    for (const value of segment.excludedValues ?? []) {
      // A value is applied to the expansion whose length it equals, so it must
      // be a length the segment can actually take: the fixed length, or one
      // inside the declared range (Finnish "CD" over a 2-3 letter group).
      const min = segment.length ?? segment.minLength;
      const max = segment.length ?? segment.maxLength;
      if (value.length < min || value.length > max) {
        const bounds = min === max ? `${min}` : `${min}-${max}`;
        fail(
          rel,
          `segment "${segment.name}" excludedValues entry "${value}" ` +
            `is ${value.length} chars but the segment length is ${bounds}`,
        );
        ok = false;
      }
    }
    if (segment.type === "PATTERNS") {
      const seenPatterns = new Set();
      for (const pattern of segment.patterns) {
        if (seenPatterns.has(pattern)) {
          fail(rel, `segment "${segment.name}": duplicate pattern "${pattern}"`);
          ok = false;
        }
        seenPatterns.add(pattern);
      }
    }
    if (segment.type === "TABLE") {
      if (!tables[segment.table]) {
        fail(
          rel,
          `segment "${segment.name}" references unknown table "${segment.table}"`,
        );
        ok = false;
      } else {
        referencedTables.add(segment.table);
      }
    }
    expansions *= lengthChoices(segment, tables);
  }
  if (expansions > MAX_EXPANSIONS) {
    fail(rel, `pattern expands to ${expansions} shapes (max ${MAX_EXPANSIONS})`);
    ok = false;
  }
  for (const rule of scheme.lengthRules?.anyOf ?? []) {
    for (const name of rule.segments) {
      if (!segmentNames.has(name)) {
        fail(rel, `lengthRules references unknown segment "${name}"`);
        ok = false;
      }
    }
  }
  return ok;
}

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const { metadataVersion } = JSON.parse(
  readFileSync(join(metadataDir, "version.json"), "utf8"),
);

const tables = loadTables();
const referencedTables = new Set();
const files = walkYaml(metadataDir).sort();
const schemes = [];
const seenIds = new Set();

for (const file of files) {
  const rel = file.slice(root.length + 1);
  const scheme = parseYaml(readFileSync(file, "utf8"));

  if (!validate(scheme)) {
    hadError = true;
    console.error(`✗ ${rel}`);
    for (const err of validate.errors ?? []) {
      console.error(`    ${err.instancePath || "/"} ${err.message}`);
    }
    continue;
  }

  if (seenIds.has(scheme.id)) {
    fail(rel, `duplicate scheme id "${scheme.id}"`);
    continue;
  }
  seenIds.add(scheme.id);

  if (!checkSchemeSemantics(rel, scheme, tables, referencedTables)) continue;

  // Default optional fields so the runtime never has to.
  scheme.legacySeries ??= false;
  schemes.push(scheme);
}

for (const id of Object.keys(tables)) {
  if (!referencedTables.has(id)) {
    fail(
      join("metadata", "tables", `${id}.json`),
      "table is not referenced by any scheme",
    );
  }
}

if (hadError) {
  console.error("\nMetadata build failed.");
  process.exit(1);
}

schemes.sort((a, b) => a.id.localeCompare(b.id));

const banner =
  "// AUTO-GENERATED by scripts/build-metadata.mjs. Do not edit by hand.\n" +
  "// Source of truth: metadata/**/*.yaml (+ metadata/tables/*.json)\n";
const body =
  `import type { MetadataBundle } from "../metadata/types.js";\n\n` +
  `export const METADATA: MetadataBundle = ${JSON.stringify(
    { metadataVersion, tables, schemes },
    null,
    2,
  )};\n`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, banner + body);
console.log(
  `✓ ${schemes.length} scheme(s), ${Object.keys(tables).length} table(s) -> ${outPath.slice(root.length + 1)}`,
);
