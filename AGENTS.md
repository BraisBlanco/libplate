# AGENTS.md

Guidance for AI coding agents (and humans) working on **libplate**. This file
is intentionally tool-agnostic — it follows the cross-editor `AGENTS.md`
convention and does not assume any particular assistant.

## What this project is

libplate validates the **format** of European vehicle registration plates,
parses them into structured segments, formats them, and infers what can be
inferred (registration regime, and — secondarily — a broad vehicle category).

**Critical framing, never violate it:** the library proves nothing about
_existence_. A `VALID` result means "the text matches a known, regulated
format", **not** that the plate was issued, is assigned, belongs to a vehicle,
or is genuine. Never write code, docs, or messages that conflate format
validity with existence.

Supported today: Spain (ordinary + `R`/`E`/`C` prefixes), Portugal, France,
Italy — current series. See `README.md` for the user-facing view.

## The golden rule: metadata is the source of truth

Plate rules live as **declarative YAML** in `metadata/<COUNTRY>/*.yaml`. A build
step validates them against a JSON Schema and compiles them into an embedded
TypeScript module. The runtime ships no YAML parser.

- ✅ Add or change a scheme by editing YAML under `metadata/`.
- ❌ **Never hand-edit `src/generated/metadata.ts`** — it is auto-generated
  (`scripts/build-metadata.mjs`) and overwritten on every build/test.
- ❌ **Never write raw regex** in metadata. Patterns are expressed as
  fixed-length tokens; the compiler turns them into a single anchored regex.

## How it works (data flow)

```
metadata/**/*.yaml            ← source of truth (declarative)
   │  scripts/build-metadata.mjs  (validates vs schema/plate-metadata.schema.json)
   ▼
src/generated/metadata.ts     ← embedded canonical bundle (committed, generated)
   ▼
src/engine/*                  ← normalize · parse · validate · format · detect
   ▼
src/index.ts                  ← public API
```

The token grammar (`src/tokens/`) has four fixed-length kinds: `LITERAL`,
`DIGITS`, `CHARSET`, `LETTERS`. Fixed length buys two things: a single anchored
regex with **no backtracking** (no ReDoS), and deterministic segment extraction
by slicing at offsets.

## Repository layout

| Path                                | What                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `metadata/<CC>/*.yaml`              | Plate schemes, one file per scheme. Source of truth.                    |
| `metadata/version.json`             | `metadataVersion` (versioned independently of the code).                |
| `schema/plate-metadata.schema.json` | JSON Schema every scheme is validated against.                          |
| `scripts/build-metadata.mjs`        | Validates YAML → emits `src/generated/metadata.ts`.                     |
| `src/model/`                        | Public types (the stable contract).                                     |
| `src/tokens/`                       | Token grammar → anchored regex + extraction.                            |
| `src/metadata/types.ts`             | Canonical scheme types + segment→token conversion.                      |
| `src/engine/`                       | Normalization and the API implementation.                               |
| `src/index.ts`                      | Public entry point.                                                     |
| `test/`                             | Vitest suites, incl. conformance generated from each scheme's examples. |
| `docs/SOURCES.md`                   | Registry of legal/regulatory references, keyed by source id.            |

## Public API (keep it small)

`parse` (primary; returns the rich result), `validate`, `format`, `detect`
(no country hint), `getSupportedCountries`, `getSupportedSchemes`,
`getMetadataVersion`, `getLibraryVersion`. Prefer adding capability to `parse`'s
result over adding new top-level functions.

## Commands

```bash
npm run metadata     # validate YAML and regenerate src/generated/metadata.ts
npm test             # regenerates metadata, then runs Vitest
npm run build        # emits dist/ (ESM + CJS + .d.ts)
npm run check        # typecheck + lint + format:check + knip + coverage
```

**Before committing, `npm run check` must pass (exit 0).** It is the same gate
CI runs. Individual gates: `typecheck`, `lint` (ESLint + typescript-eslint +
sonarjs + unused-imports + complexity budgets), `format:check` (Prettier),
`knip` (unused files/exports/deps), `coverage` (Vitest v8 with thresholds).

## Design invariants (do not break)

- **Never guess a country.** If input matches schemes in more than one country
  without a `country` option, return `AMBIGUOUS` with `candidates` — never pick
  one. (FR and IT share the `LL-NNN-LL` shape; this path is real.)
- **`historical` is `null` when it can't be told from text.** Text alone can
  rarely rule historical status in or out; don't report `false` as if certain.
- **Vehicle inference always carries `inferenceLevel` + `evidence`.** Never
  expose a bare nullable `vehicleType`.
- **Preserve the raw input.** Keep `input.raw`; normalize into `input.compact`
  for matching, don't destroy the original.
- **Every scheme cites a source.** Add the reference to `docs/SOURCES.md` and
  reference its id from the YAML `sources`. No blogs/photos — official texts
  only.
- **Stable codes.** `ValidationReason` / status strings and enum members are a
  contract; don't rename without a major version bump.

## Adding a scheme (recipe)

1. Create `metadata/<CC>/<name>.yaml`. Copy an existing scheme as a template.
2. Give it a stable `id`, `registrationType`, `validFrom`, token `segments`,
   `formats`, `vehicleInference` (`level` at minimum), and `visual`.
3. Add `examples.valid` and `examples.invalid` — these run as conformance tests.
4. Add/point to a `sources` entry documented in `docs/SOURCES.md`.
5. `npm run check`. Fix anything red. The conformance suite verifies every
   example behaves as declared.

## House conventions worth knowing

- Strict TypeScript (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
- Sort strings with a comparator: `.sort((a, b) => a.localeCompare(b))`, not
  bare `.sort()` (enforced by sonarjs).
- Keep functions within the complexity/length budgets ESLint enforces; extract
  helpers rather than raising the limits.

## Known limitations (accepted, documented — don't "silently fix" wrongly)

- **PT current series** accepts the full A-Z alphabet; the positional
  vowel-exclusion rule (with double-vowel exceptions) is not yet modelled.
- **FR SIV** accepts the reserved pairs `SS`/`WW`; `WW` is actually the
  provisional regime. Properly excluding whole-segment values needs a grammar
  feature — a good future task.
- **IT `validFrom`** (1994) is an approximation.

These need grammar or scope work, not a quick patch. Discuss before changing.
