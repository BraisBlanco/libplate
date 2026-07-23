# Design note: German (DE) plate support

**Status:** planned / not yet implemented. This note is the entry point to
continue the work in a fresh session. Read `AGENTS.md` first for project rules.

## Goal

Add validation + parsing for German vehicle registration plates (Kfz-Kennzeichen)
following the same discipline as the other countries: declarative metadata, a
cited legal source in `docs/SOURCES.md`, conformance examples, and a green
`npm run check`.

## Why it is deferred: the architecture gaps

A German plate is `UZ` (Unterscheidungszeichen) + `EN` (Erkennungsnummer):

```
B-XY 1234      Berlin
M-A 1          München
WÜ-AB 12       Würzburg   (umlaut in the district code)
KÖLN? no       district codes are 1–3 letters, from an official table
```

- **`UZ` is 1–3 letters from an official ~350-entry table** (Anlage 1 FZV /
  KBA list), some containing umlauts (Ä, Ö, Ü).
- **`EN` is 1–2 letters followed by 1–4 digits**, plus optional suffixes:
  `E` (electric), `H` (historic), and seasonal `Saisonkennzeichen` (a month
  range like `04-10` appended).
- **The gap between `UZ` and `EN` is significant.** Without it, `BAB123` is
  genuinely ambiguous: `BA`+`B123` (Baden-Baden) vs `B`+`AB123` (Berlin) — both
  are valid districts.

The current engine cannot represent this:

1. Tokens are **fixed-length** (`src/tokens/index.ts`) — no 1–3 / 1–2 / 1–4
   variable groups.
2. Extraction is by **fixed offsets** — variable-length groups need capture
   groups instead.
3. Normalization **strips all separators** (`src/engine/normalize.ts`), which
   destroys the `UZ`/`EN` boundary.
4. The compact alphabet is **A-Z / 0-9 only** (`ALLOWED_COMPACT`) — umlauts are
   rejected as `INVALID_CHARACTERS`.
5. There is **no table/lookup token** for the district-code set.

Faking it with an over-permissive fixed pattern is explicitly against the
project rules (see `AGENTS.md` → Known limitations). Hence this plan.

## Implementation plan (phased)

### Phase A — variable-length tokens + capture-group extraction

- In `src/tokens/index.ts`, allow `min`/`max` on `DIGITS`, `LETTERS`, `CHARSET`
  (fixed length becomes `min === max`, keeping every existing scheme working).
- Switch `compilePattern` to emit one **named capture group per segment** and
  rewrite `extractComponents` to read `RegExp.exec` groups instead of slicing
  by offset. Keep the anchored, no-backtracking guarantee: only allow
  variable-length groups when adjacent groups are disambiguated by a differing
  character class or by a table token (below). Reject ambiguous adjacency at
  compile time in `scripts/build-metadata.mjs`.
- Update `MetadataSegment` + `segmentToNamedToken` in `src/metadata/types.ts`
  and the JSON Schema in `schema/plate-metadata.schema.json`.
- All existing tests must stay green (fixed-length schemes are unchanged).

### Phase B — table token + resource pipeline

- Add a `TABLE`/`CHOICE` token: matches one value from a named set (the district
  codes). Compiles to a bounded alternation `(?:AA|AB|…)` — longest-match
  ordered, no catastrophic backtracking.
- Add a `metadata/tables/` (or `resources/`) directory and teach
  `scripts/build-metadata.mjs` to load + embed referenced tables into the
  generated bundle. Version the table with a source + `sourceCheckedAt`.
- Populate the district-code table from the official source (below). ~350 codes,
  including umlaut codes.

### Phase C — umlauts + separator handling (the crux)

- Extend `ALLOWED_COMPACT` and casing to permit `Ä Ö Ü` (only where a scheme's
  alphabet allows them).
- Decide how to preserve the `UZ`/`EN` boundary. Two options:
  1. **Table-driven split on the compact form:** match the district via the
     TABLE token (longest known prefix), then `EN`. Handle the rare genuine
     ambiguity (`BAB123`) by returning `AMBIGUOUS` (multiple valid splits) —
     honest and consistent with the "never guess" rule.
  2. **Separator-significant matching:** add a per-scheme option to keep the
     primary separator in a matched form so `B-AB123` splits deterministically.
     Recommendation: start with (1); it reuses the ambiguity machinery and needs
     no new normalization mode.

### Phase D — the DE schemes

- `metadata/de/standard.yaml`: `UZ` (TABLE) + `EN` letters(1–2) + digits(1–4).
- Optional suffixes: model `E` (electric) and `H` (historic) — either as
  optional trailing tokens (needs an `OPTIONAL` token) or as separate schemes
  (`DE_HISTORIC`, `DE_ELECTRIC`). Historic `H` sets `registrationType: HISTORICAL`.
- Consider `Saisonkennzeichen` (seasonal) as a later addition.
- `vehicleInference: NOT_INFERABLE` (format does not encode category).

### Phase E — docs, sources, tests

- Move `DE-FZV` from the reference library to "currently referenced" in
  `docs/SOURCES.md`; add the district-table source.
- Add DE to the README supported matrix; remove it from "not yet modelled".
- Update `AGENTS.md` (supported list + drop the Germany deferral note; document
  the new grammar features: variable-length, TABLE, umlauts).
- Conformance examples + targeted tests (incl. the `BAB123` ambiguity case and
  an umlaut district like `WÜ`).

## Sources (verify before use)

- **`DE-FZV`** — Fahrzeug-Zulassungsverordnung (FZV), 12 Dec 2011, §§ 8–9 and
  Anlage 1 (district codes): <https://www.gesetze-im-internet.de/fzv_2011/>
- District-code list — Kraftfahrt-Bundesamt (KBA) / FZV Anlage 1. Confirm the
  authoritative, machine-readable list and record `sourceCheckedAt`.

## Scope decisions to confirm with the user

1. Which special series to include first (E / H / seasonal / diplomatic `0`-…)?
2. Behaviour for genuinely ambiguous splits — `AMBIGUOUS` (recommended) vs a
   documented preference.
3. Whether to validate district codes against the full table (accurate, ~350
   entries to maintain) or accept any 1–3 letters (over-permissive — likely no,
   per project rules).
