# Design note: German (DE) plate support

**Status:** IMPLEMENTED (July 2026, metadata 2026.07.1). Kept as the record of
the design and of where the implementation deviated from this plan — see the
"Implementation outcome" section at the end. Read `AGENTS.md` for the current
state of the grammar.

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

## Implementation outcome (2026-07-23)

Shipped as `DE_STANDARD`, `DE_HISTORIC` (H) and `DE_ELECTRIC` (E), with the
grammar work of phases A-C. Deviations from the plan above, and why:

- **Expansions instead of capture groups (phase A).** `compilePattern` does
  not emit variable-length capture groups; it enumerates every combination of
  concrete segment lengths into fixed-length "expansions", each an anchored
  regex with offset-based extraction. This keeps the no-backtracking guarantee
  trivially AND yields _all_ segmentations of an input, which the capture-group
  approach cannot (a regex returns one match). No compile-time adjacency
  rejection is needed — ambiguity is handled honestly at runtime.
- **Separator evidence (phase C).** Option 1 (table-driven split on the
  compact form) was implemented, plus a refinement: when several splits of the
  same scheme survive, the separators the caller wrote filter them (a split is
  contradicted if a separator falls strictly inside one of its segments). So
  `B-AB 123` resolves to Berlin, `BA-B 123` to Bamberg, and bare `BAB123`
  returns `AMBIGUOUS` with reason `AMBIGUOUS_SEGMENTATION`. Separators never
  reject a unique match (so `B-ABC 123` validates as the resegmentation
  `BA-BC 123` — consistent with the project's separator-stripping leniency).
- **FZV 2023, not FZV 2011.** The FZV of 12 Dec 2011 cited in this note was
  replaced by the FZV of 20 July 2023. Notably the district-code list is no
  longer an annex of the FZV: codes are set by the BMV per § 9(3) and the
  consolidated list is published by the KBA. The table
  (`metadata/tables/de-unterscheidungszeichen.json`) was built from the KBA
  publication (Stand 16.04.2026): 716 assignable + 55 revoked-but-still-
  circulating codes = 769 values (§ 9(3) sentence 6 keeps revoked codes valid
  until deregistration).
- **Length limits are richer than "max 8".** FZV Anlage 4: standard plates
  max 8 characters; H and E plates max 7 on a one-line plate OR an identifier
  of max 5 on a two-line plate. Modelled as disjunctive `lengthRules` — the
  layout cannot be told from text, so a combination legal on either layout is
  accepted.
- **Scope decisions** (questions at the end of the plan): E and H shipped as
  separate schemes (no OPTIONAL token needed); ambiguity behaviour =
  `AMBIGUOUS` as recommended; the full official table is validated against
  (not "any 1-3 letters"). Seasonal, Wechselkennzeichen, green, Bundeswehr and
  diplomatic plates remain out of scope, as do the (non-federal) "gute Sitten"
  letter-combination bans.
