# libplate

Format validation, parsing and structured analysis of **European vehicle
registration plates** — conceptually a "libphonenumber for licence plates".

> **What this library does and does not do.** libplate validates known plate
> _formats_ and extracts the information encoded in them. It **cannot** prove
> that a plate has been issued, is currently assigned, belongs to the observed
> vehicle, or has not been forged. That requires authorized access to
> administrative registries.

**Status:** early. This first release supports **Spain** (current ordinary
series plus the deterministic `R`, `E` and `C` prefixes). Portugal, France and
European detection are planned.

## Install

```bash
npm install libplate
```

## Usage

```ts
import { parse } from "libplate";

const result = parse("R-1234-BCD", { country: "ES" });
// result.status                    -> "VALID"
// result.normalized                -> "R1234BCD"
// result.formatted                 -> "R 1234 BCD"
// result.scheme.id                 -> "ES_TRAILER_CURRENT"
// result.vehicle.category          -> "TRAILER_OR_SEMITRAILER"
// result.vehicle.inferenceLevel    -> "DETERMINISTIC"
```

### Detecting without a country hint

```ts
import { detect } from "libplate";

const result = detect("C 1234 BCD");
// Resolves to ES / ES_MOPED_CURRENT. When more than one scheme matches,
// status is "AMBIGUOUS" and `result.candidates` lists them — the library
// never guesses a single country.
```

### Convenience helpers

```ts
import { validate, format } from "libplate";

validate("1234 BCD", { country: "ES" }); // true
format("1234-bcd", { country: "ES" }); // "1234 BCD"
```

`parse` is the primary API — use it when you need the reason, the matched
scheme, or the inferences. `validate` / `format` are thin conveniences.

## Design

- **Validation ≠ existence ≠ vehicle type.** These are modelled as separate
  concerns. Vehicle-category inference is secondary and always carries an
  `inferenceLevel` and supporting `evidence`.
- **Metadata is the source of truth.** Each scheme lives in a declarative YAML
  file under `metadata/`, validated against `schema/plate-metadata.schema.json`
  and compiled into an embedded module — the runtime ships no YAML parser and
  is browser-safe.
- **No hand-written regex.** Patterns are expressed as fixed-length tokens
  (`LITERAL`, `DIGITS`, `CHARSET`, `LETTERS`) that compile to a single anchored
  regex with no backtracking (no ReDoS) and deterministic segment extraction.
- Every scheme cites its regulatory source and ships positive/negative
  examples that are exercised as conformance tests. The legal references are
  catalogued in [`docs/SOURCES.md`](docs/SOURCES.md) and are traceable from a
  result via `scheme.sourceRefs`.

## Development

```bash
npm install
npm run metadata      # validate YAML and regenerate src/generated/metadata.ts
npm test              # runs the metadata build first, then the suite
npm run build         # emits dist/ (ESM + CJS + .d.ts)
```

Quality gates (all run in CI):

```bash
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # ESLint: unused imports, code smells, complexity (sonarjs)
npm run format:check  # Prettier
npm run knip          # unused files / exports / dependencies
npm run coverage      # Vitest coverage with thresholds
npm run check         # all of the above in sequence
```

### Adding a scheme

1. Add a YAML file under `metadata/<COUNTRY>/`.
2. Give it positive and negative `examples` and at least one regulatory
   `source`.
3. Run `npm test` — the conformance suite verifies the examples behave as
   declared.

## License

MIT
