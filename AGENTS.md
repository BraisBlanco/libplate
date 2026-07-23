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

Supported today: Spain (ordinary + `R`/`E`/`C`/`H`/`T`/`P`/`S`/`V` + diplomatic
`CD`/`CC`/`OI`/`TA` + the 1900-1971 and 1971-2000 provincial series), Portugal
(current + three historical series + trailers, export and industrial
machines), France (SIV + `WW` provisional), Italy (ordinary — also trailer
rears since 2013 — + motorcycles, mopeds, agricultural/operating machines,
`EE`, targa prova), Germany (standard + `H` Oldtimer + `E` electric), Belgium
(standard), Netherlands (sidecodes 1-12). See `README.md` for the full
matrix.

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

The token grammar (`src/tokens/`) has five kinds: `LITERAL`, `DIGITS`,
`CHARSET`, `LETTERS`, `TABLE`. `DIGITS`/`CHARSET`/`LETTERS` take a fixed
`length` or a bounded `minLength`/`maxLength` range; `DIGITS` also takes
`noLeadingZero`. `LETTERS` also takes `excluded` (per-position letters removed
from A-Z) and `excludedValues` (whole-segment blacklist, e.g. `SS`/`WW`,
compiled to a negative lookahead; fixed-length segments only). `TABLE` matches
one value from a named set in `metadata/tables/*.json` (e.g. the ~770 German
district codes, umlauts included). A scheme may add `lengthRules` (a
disjunction of "these segments sum to at most N" rules, for regulations like
the German eight-character limit).

A pattern compiles to a set of fixed-length **expansions** — one anchored
regex per combination of concrete segment lengths. That keeps the original
guarantees (**no backtracking**/ReDoS, extraction by slicing at offsets) and
adds one: an input admitting several segmentations yields ALL of them, so the
engine can resolve them with evidence (the separators the caller wrote) or
report `AMBIGUOUS_SEGMENTATION` — never an arbitrary regex-engine winner.

## Repository layout

| Path                                | What                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `metadata/<CC>/*.yaml`              | Plate schemes, one file per scheme. Source of truth.                    |
| `metadata/tables/*.json`            | Named value tables referenced by `TABLE` segments (with their sources). |
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
- **Never guess a segmentation either.** When a compact input admits several
  splits of the same scheme (German `BAB123` = `B-AB 123` or `BA-B 123`), the
  separators the caller wrote are used as evidence; if they don't resolve it,
  return `AMBIGUOUS` with reason `AMBIGUOUS_SEGMENTATION`. Separators never
  reject an otherwise-unique match.
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
- **IT `validFrom`** (1994) is an approximation.
- **Deferred ES series** — state/military bodies still need a dedicated code
  table; don't fake them with over-permissive patterns in the meantime.
- **ES provincial serial letters are barely restricted officially.** The 1971
  text only excludes "letras que puedan dar lugar a confusión" and the
  homologated font has no `Q`/`Ñ`, so only `Q` is excluded. The
  practice-level restrictions (no vowels as second letter, etc.) are
  documented only unofficially and are NOT modelled. Per-province-code
  validity windows (`GE`→`GI` 1992, `PM`→`IB` 1997, `OR`→`OU` 1999, `SH`
  1971-76) are documented in the table but not enforced.
- **PT trailer/export digit widths come from official model drawings**, not
  article text (the law says only "número de ordem"): up to 6 digits
  (trailers) and 5 (export). A two-letter trailer service code + 4 digits is
  compact-ambiguous with the pre-1992 general series.
- **IT motorcycle format follows fig. III 4/e, not the lett. c) prose.** The
  Appendice XII letter c) text (as replaced by DPR 355/1998) still describes
  a car-like 2+3+2 layout, but the official figure in the same decree shows
  2 characters over 5, matching the issued `LL 00000` series. The moped
  base-28 character set comes from the annexed tabella III 2 (verified only
  secondarily). Trailers since 2013 share the ordinary-series structure; the
  X-lot allocation is an administrative circular, not a format rule, so it
  is not enforced. Compact 6-character inputs whose characters all fall in
  the moped set (e.g. `BB234C`) are ambiguous with machine plates.
- **NL sidecode alphabets are register-informed.** No official text
  enumerates the SC1-3 alphabet (vowels were genuine); the modern vowel ban
  (except `O` for semi-trailers) and `C`/`Q` exclusion are RDW statements.
  Reserved combinations (`SS`, `NSB`, …) and per-category first letters are
  still not modelled. `validFrom` means first issuance in ANY vehicle
  category (RDW series tables), not first car issuance. Sidecodes 4/6/7 are
  legacy-flagged for detection despite remaining current for
  trailers/motorcycles/heavy trucks.
- **ES diplomatic prefixes are width-checked only.** The RGV defines the
  mission/organization prefix assignment procedurally and no official public
  table exists, so `CD`/`CC`/`OI`/`TA` validate the DGT-documented digit
  widths (the TA serial width is an analogy-based assumption). Compact 5-digit
  `OI`/`TA` forms are genuinely ambiguous (2+3 vs 3+2) and resolve via
  separator evidence or `AMBIGUOUS_SEGMENTATION`; compact `CD`/`CC` + 4 digits
  also reads as a German `C-…` plate, so country-less detection is ambiguous
  there.
- **DE scope.** Seasonal (`Saisonkennzeichen`), alternating
  (`Wechselkennzeichen`), green, Bundeswehr and diplomatic plates are not
  modelled. Combinations offensive to "die guten Sitten" (§ 9(1) FZV) are
  refused by individual authorities with no federal list, so they validate
  here. Because separators are stripped for matching, an input like
  `B-ABC 123` is accepted as the valid resegmentation `BA-BC 123` (separators
  disambiguate between valid splits but never reject a unique one). The
  district table unions assignable codes with revoked-but-still-circulating
  ones; text alone cannot tell which regime a given plate is under.
- **BE/NL letter rules are simplified.** Belgium accepts full A-Z; the Dutch
  per-sidecode first-letter allocations and reserved-combination list are not
  modelled. Documented in the YAML.

These need grammar or scope work, not a quick patch. Discuss before changing.
