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
machines), France (SIV + `WW` provisional + `W` garage + the 2004-2015 moped
series + diplomatic `CMD`/`CD`/`C`/`K` + the FNI 1950-2009 métropole and DOM
series), Italy (ordinary — also trailer
rears since 2013 — + motorcycles, mopeds, agricultural/operating machines,
`EE`, targa prova), Germany (standard + `H` Oldtimer + `E` electric), Belgium
(standard + `O`/`Q`/`T`/`M`/`S`/`G` letter-index categories + `Z`/`Y`/`V`
commercial + `W`/`X` temporary/export + `CD` diplomatic + two pre-2010
series), Netherlands (sidecodes 1-12), Poland (ordinary car/motorcycle/powiat
plus reduced, historic, temporary, diplomatic, individual and professional),
Austria (standard + Wunschkennzeichen + diplomatic/consular + the all-digit
federal `A`, Land-government, `BP`/`FV`/`PT`/`BD`/`BH`/`JW` and `FW`
fire-brigade series), Estonia (standard A1 + reduced A3 + motorcycle/moped +
tractor + veteran + `CD`/`CMD` diplomatic + `PROOV` dealer marks), Romania
(the ordinary county/Bucharest series + provisional and `PROBE` numbers),
Bulgaria (ordinary + third plate +
transit and trader temporary numbers, each with its category-L variant),
Sweden (the three-letter series in both its digit and 2019 letter-suffix
arrangements + diplomatic plates), Finland (ordinary + the number-first
L-class/tractor mark + `CD` and `C` mission plates + export + `KOE` test
plates), Denmark (the single national series). See `README.md` for the full
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

The token grammar (`src/tokens/`) has six kinds: `LITERAL`, `DIGITS`,
`CHARSET`, `LETTERS`, `TABLE`, `PATTERNS`. `DIGITS`/`CHARSET`/`LETTERS` take a
fixed `length` or a bounded `minLength`/`maxLength` range; `DIGITS` also takes
`noLeadingZero`. `LETTERS` also takes `excluded` (per-position letters removed
from A-Z) and `excludedValues` (whole-segment blacklist, e.g. `SS`/`WW`,
compiled to a negative lookahead; each value applies to the expansion whose
length it equals, so `CD` on a 2-3 letter segment rejects the Finnish
diplomatic `CD` without touching `CDE`). `TABLE` matches
one value from a named set in `metadata/tables/*.json` (e.g. the ~770 German
district codes, umlauts included). `PATTERNS` matches one of a list of exact
positional digit/letter arrangements (`N` = digit, `L` = letter from an
optional `letters` charset, anything else literal — e.g. the Polish
`[NNNNL, NLNNN, …]` serials or the fixed `P` of `NNPNN`), with a per-scheme
`digitBlocks` rule (`NO_LEADING_ZERO`, or `NO_ZERO_BLOCK` for ranges like
0001-9999) applied to each maximal digit run. A literal digit is part of the
digit run it touches, and satisfies the rule by itself in first position —
`1NN` under `NO_LEADING_ZERO` is exactly 100-199 (this is how the French
diplomatic entity ranges are encoded); same-length arrangements
compile into one fixed-shape alternation, so a `PATTERNS` segment is a single
component with a single boundary. A scheme may add `lengthRules` (a
disjunction of "these segments sum to at most N" rules, for regulations like
the German eight-character limit).

A pattern compiles to a set of fixed-length **expansions** — one anchored
regex per combination of concrete segment lengths. That keeps the original
guarantees (**no backtracking**/ReDoS, extraction by slicing at offsets) and
adds one: an input admitting several segmentations yields ALL of them, so the
engine can resolve them with evidence (the separators the caller wrote) or
report `AMBIGUOUS_SEGMENTATION` — never an arbitrary regex-engine winner.

## Repository layout

| Path                                | What                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `metadata/<CC>/*.yaml`              | Plate schemes, one file per scheme. Source of truth.                            |
| `metadata/tables/*.json`            | Named value tables referenced by `TABLE` segments (with their sources).         |
| `metadata/version.json`             | `metadataVersion` (versioned independently of the code).                        |
| `schema/plate-metadata.schema.json` | JSON Schema every scheme is validated against.                                  |
| `scripts/build-metadata.mjs`        | Validates YAML → emits `src/generated/metadata.ts`.                             |
| `src/model/`                        | Public types (the stable contract).                                             |
| `src/tokens/`                       | Token grammar → anchored regex + extraction.                                    |
| `src/metadata/types.ts`             | Canonical scheme types + segment→token conversion.                              |
| `src/engine/`                       | Normalization and the API implementation.                                       |
| `src/index.ts`                      | Public entry point.                                                             |
| `test/`                             | Vitest suites, incl. conformance generated from each scheme's examples.         |
| `docs/SOURCES.md`                   | Registry of legal/regulatory references, keyed by source id.                    |
| `docs/DESIGN.md`                    | Evidence hierarchy, deliberate non-goals, designed-but-unbuilt, open questions. |
| `docs/design/`                      | Historical per-country design notes. An archive, not the spec.                  |

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
- **BE/NL letter rules are simplified.** Belgium accepts full A-Z in letter
  groups; the Dutch per-sidecode first-letter allocations and
  reserved-combination list are not modelled. Documented in the YAML.
- **BE special-category dates and sub-allocations are not pinned.** The
  letter-index schemes (O/Q/T/M/S/G/Z/Y/V/W/X/CD) cite the consolidated
  AM 23-07-2001 but omit `validFrom`: the introduction dates live in
  successive amendments not yet traced. Within-series allocations (M-initial
  groups = motorcycles on commercial/oldtimer plates, the temporary plates'
  second letter, excise-exempt G groups) are documented in comments only.
  The pre-2010 series omit dates too and are `legacySeries` despite remaining
  valid (plates follow the holder) — same trade-off as the NL sidecodes.
  Personalized, royal court and `A`/`E`/`P` short plates are not modelled.

- **FR SIV letter exclusions are practice, not regulation.** Annexe VII, A of
  the arrêté du 9 février 2009 prescribes only "2 lettres + 3 chiffres +
  2 lettres"; the `I`/`O`/`U` and `SS` exclusions come from the official
  service-public.fr page (SIV allocation practice). Same for the FNI series
  (`I`/`O` never issued, `U` dropped 1984 — a 1992 circulaire nobody can
  trace), so FNI accepts the full alphabet. FNI Annexe I itself is not in the
  Légifrance consolidation and was verified via a facsimile reproduction.
- **FR text-identical variants and unpublished series are not modelled.**
  Transit temporaire / importation en transit reuse the ordinary SIV number
  (white-on-red plate with a validity date — certificate mentions of art. 4,
  colours of art. 7), and collection vehicles may use black plates; `visual`
  reports the default white. Military numbers are assigned under
  defense-internal instructions with no published format. New Caledonia,
  French Polynesia and Wallis-et-Futuna run local systems with no findable
  official composition text. The diplomatic `Z`/`X` fiscal suffixes and the
  ESA `973` / Strasbourg `67` completions are not modelled; diplomatic
  entity/country codes have no public assignment table (range-checked only);
  the `K` tail accepts the 1-5 digit union without splitting a consular
  order number from its department (over-permissive for embassy serials
  officially ≥ 100). An FNI number whose series reads as a diplomatic status
  group over a department-like tail (`100 CD 20`) is genuinely ambiguous.
  The moped series' official 2-digit minimum is 11; 10 is accepted (no
  per-segment minimum value in the grammar). FNI-era transit (`TT`/`TAA-TZZ`/
  `IT`/`TTW`/`TTQ`), export (`W?L`/`W?E`) and FFECSA/DF series are not
  modelled.
- **PL sub-ranges and colour variants are not fully carved out.** The
  professional serial's final two-digit block (01-99) accepts 00 (`digitBlocks`
  is per-segment and the leading block legitimately starts at 00), and the
  per-voivodeship powiat-number ranges of Załącznik 8 are documented but not
  enforced. EV/hydrogen green backgrounds and the red-on-yellow sports
  temporary variant carry the same numbers, so `visual` reports the default
  colours. The individual-plate decency rule (§ 32 ust. 3) has no closed list.
  The three powiat codes of Dz.U. 2026 poz. 891 enter force 2026-08-04; the
  window is noted in the table but not enforced. Diplomatic digit-group
  semantics (mission codes, the de-facto `W`) are administrative practice and
  deliberately absent.
- **AT capital-city lengths and positional letter rules are not modelled.**
  Serial-length allocation differs between the Land capitals/Vienna (5-6) and
  other districts (4-5) but the issuing authority is not inferable, so
  `AT_STANDARD`/`AT_WUNSCHKENNZEICHEN` accept the 3-6 union. The ban on `O` as
  the FIRST letter of a standard letter block (KDV § 26 Abs. 6 Z 5) is
  positional and unmodelled (only `Q` is excluded outright), as is the
  variable-length Abs. 8 offensive-combination list for Wunschkennzeichen.
  Probefahrt/Überstellung/temporary/moped/historic plates share the
  standard-issue text format and differ by colour, so `AT_STANDARD` carries no
  `visual` and its serial range unions the historic/moped lengths (3-6).
  Likewise not distinct text formats (verified, don't "add" them): the red
  plates for foreign trailers (AAT) carry the towing vehicle's own number
  (KFG § 49 Abs. 3), and `Deckkennzeichen`/`Wechselkennzeichen` (§ 48
  Abs. 1/2) reuse ordinary formats. The all-digit state series (`A`, Land
  letters, `BP`/`FV`/`PT`/`BD`/`BH`/`JW`) accept **1-6 digits**: § 26 Abs. 6
  Z 2's character counts explicitly exclude the Abs. 2-5 vehicles, so the only
  bound is Anlage 5e's six Vormerkzeichen, and low numbers are real (`A 1`).
  Their `validFrom` is omitted — the compositions predate the 1989 changeover
  and no Novelle was traced. The repealed Abs. 4 prefixes (lit. b, BGBl. II
  Nr. 275/2007; lit. d, BGBl. II Nr. 376/2002) and pre-1989 black plates are
  not modelled; note the pre-1989 ordinary series had the same shape as
  `AT_LAND` (Land letter + digits), so that scheme must not be read as
  evidence about historic plates. `ND`/`GD`/`NK`/`SD`/`VK` are both district
  codes and Land+`D`/`K` diplomatic prefixes, and `BD` + digits is both the
  Bundesbusdienst series and Burgenland+`D` — genuine ambiguities that no
  separator resolves.

- **EE character counts come from the sample drawings, not the article text.**
  Määrus nr 49 fixes the FIELDS (§ 3), the colours and categories (lisa 1) and
  the letter-width limits (§ 6), but the digit/letter counts per mark type are
  legible only in the lisa 3 drawings (`053 EEN`, `17 ELH`, `CD 2345`,
  `CMD 234`, `PROOV 1203`, `M 433`, `53 HF`, `533 F`, `6269 EO`). Types that
  differ only in plate size share one scheme (A4/A6, A5/A7, A8/A11, A9/B2,
  E1/E2). The § 6 multiplicity caps for A1 (≤2 `A`, ≤2 `M`, ≤1 `W`, never all
  three) are not modelled — that would need ~80 whole-segment exclusions; the
  outright bans are (`W` on A3/B1/B2/B3, `WW` on E1/E2). **Deliberately absent,
  don't "add" them**: type A2 special-order marks (letters then digits, ≤9
  characters — that space contains the diplomatic, veteran, dealer and
  motorcycle series, so modelling it would make almost every Estonian plate
  AMBIGUOUS), A10 racing and D1/D2 transit marks (`LL` + 4 digits is exactly
  the `CD` diplomatic shape), and A12 (the President's plate carries a coat of
  arms and NO characters). A veteran mark and a letter-first moped mark
  (§ 7 lg 2) share `L NNN` and are separated only by separator evidence or the
  plate colour. `validFrom` is omitted throughout: the compositions predate the
  2011 regulation and no earlier act was traced.
- **RO digit widths are inferred from the plate's seven-character capacity.**
  HG 1391/2006 art. 23 alin. (1) gives the composition but no digit count, and
  art. 26 alin. (1) of **Ordinul MAI 181/2024** (MO 1141 bis/15.11.2024, which
  repealed Ordinul MAI 1501/2006 by its art. 53 — do not cite the old order)
  puts the widths in state standard SR 13078, which is not published free of
  charge. `RO_ORDINARY` therefore uses a `lengthRules` cap of 7 over
  indicative+number+letters, which yields 2 digits behind a two-letter county
  code and 2-3 behind Bucharest's `B`. The order numbers are modelled as 01-99
  and 100-999 (`NN` plus `1NN`…`9NN`), the second range being the series
  Bucharest opened in 2010. The indicative table stands on ISO 3166-2:RO, whose
  Romanian codes ARE the plate indicatives. `RO_PROVISIONAL` (art. 23 alin. (4))
  and `RO_PROBE` (alin. (5)) apply the same 7-character cap to indicative +
  order number, so they accept 1-6 digits behind `B` and 1-5 behind a county
  code, leading zeros included — deliberately wide, because no text bounds them
  further. The cost is borne by `detect`: a provisional number collides with
  `AT_LAND`/`AT_BUND_*`, a German district + letter + digits, an Italian
  motorcycle mark and Polish series, so it resolves only with a `country` hint.
  `RO_PROBE` is anchored by its literal and collides with nothing. Neither
  carries `visual`: art. 26 alin. (1) sends provisional/probe colours to the
  same unpublished standard, so the red-on-white "numere roşii" is real but
  undocumented officially — do not assert it. Still deferred for want of
  official widths: diplomatic `CD`/`CO`/`TC` and temporary numbers; pinning the
  diplomatic width at 4 digits would make every Spanish `CD` plate AMBIGUOUS,
  and the practice figure (6 digits, first three a mission code) has only
  wiki/blog backing. **Now modellable but not modelled**: the yellow locality
  plates — anexa nr. 6 of Ordinul 181/2024 replaced the free-text locality name
  of HG 1391/2006 art. 25 alin. (1) with county indicative + a NUMERIC locality
  code + order number, and its anexa nr. 7 is the official code list (~3,200
  localities, per-county numbering, Bucharest sectors 11-16); modelling it needs
  a paired county+locality table, and pre-2024 plates keep their old content
  until deregistration (art. 51 alin. (2)). Not modellable: MApN/MAI/SRI/SPP
  numbers (art. 30 alin. (3)-(4) — each institution's own unpublished order).
  Art. 24 alin. (3) obscene/authority-like letter combinations have no published
  list. Green plates for zero-CO2 vehicles (Ordinul comun 676/44/443/2022, since
  2022-06-27) are a colour variant of the ordinary number, not a scheme.
- **BG regional codes are charset-checked only.** Наредба № I-45 чл. 24 ал. 2
  leaves the letter codes and series in use to the National Police, and no
  official table is published — the same trade-off as the ES diplomatic
  prefixes. The twelve-letter alphabet is official (чл. 24 ал. 7) and is matched
  as the Latin look-alikes `A B C E H K M O P T X Y`; Cyrillic input is NOT
  transliterated (that would need normalization support, and the `normalized`
  contract is Latin). The by-request six-character numbers (чл. 24 ал. 6-7) are
  deliberately NOT modelled: their character space strictly contains the
  ordinary series, so every ordinary plate would come back AMBIGUOUS. Diplomatic,
  army and police series are absent from the ordinance and are not modelled. The
  five-digit category-L transit and trader numbers accept both the 2+3 and 3+2
  splits — the ordinance says "разделени", not "симетрично разделени", for them.
  EV green (чл. 23 ал. 4) and the third plate's red (ал. 3) are colour variants
  of the same characters.

- **SE alphabets are authority practice, not regulation.** 6 kap. 4 § TSFS
  2015:63 prescribes only "tre bokstäver" and the digits; that `I`, `Q`, `V`,
  `Å`, `Ä` and `Ö` are never used, and `O` never as the last character, comes
  from Transportstyrelsen's own announcement — the same evidence level as the
  French SIV exclusions. The agency's list of refused three-letter combinations
  is not published as a regulation and is not modelled. **Deliberately absent,
  don't "add" them**: saluvagnsskyltar (16-18 §§ say the designation has "sex
  tecken" plus a vehicle-kind letter `B`/`M`/`T`/`TM`/`S`/`LS`, but no text
  says WHICH six characters) and personal plates (12 kap. 9 §, 2-7 free
  characters — their space swallows every other Swedish series). Taxi (yellow),
  temporary (white on red + a validity date and a `B` for 20 § vehicles),
  provisional (yellow) and competition (orange) plates all carry a number
  formed under 6 kap. 4 § — colour variants, not schemes, which is also why
  `SE_ORDINARY` reports `NOT_INFERABLE`. The diplomatic country and category
  codes are assigned by Utrikesdepartementet with no published table, so both
  are charset-checked only (as with the ES diplomatic prefixes). `SE_ORDINARY`
  omits `validFrom` (the 1973 changeover was not traced); the letter-suffix
  scheme carries 2019-01-16, the date Transportstyrelsen issued the first one.
- **FI marks are "numbers", and two series genuinely collide.** 16 § of VNA
  162/2021 says "enintään kolminumeroinen luku" — a NUMBER — and Traficom
  states zero may neither open the digit part nor stand alone, so every
  Finnish digit segment is `noLeadingZero`. `FI_L_CLASS_TRACTOR` merges 16 § 1
  mom. 2 k. (L-class, white, 2-3 letters) with 3 k. (tractors, work machines,
  snowmobiles, yellow, 1-3 letters) into one scheme with no `visual`: the
  machinery space strictly contains the L-class one, so separate schemes would
  make every L-class mark AMBIGUOUS. The `CD` exclusion on `FI_ORDINARY` rests
  on Traficom's statement that the combination is diplomatic-only. What is NOT
  resolvable: `C` + up to four digits is both a mission tax-free mark and an
  export mark (the plates differ by colour and the export plate's red expiry
  field), and that input is reported AMBIGUOUS. **Deliberately absent**:
  transfer marks (siirtomerkki, 20 § — 1-2 letters + up to four digits, whose
  space contains both the two-letter ordinary series and the whole export
  series), customs plates (8 k. gives a letter + a "järjestysnumero" + `FIN`
  with no published width), the President's coat-of-arms plate (no characters),
  taxi plates (ajoneuvolaki 99 § requires distinguishable plates since
  2026-06-14 but no decree gives their content yet) and Åland, which keeps its
  own register (ajoneuvolaki 129-130 §) and whose marks start with `Å` —
  outside the Latin-basic `normalized` contract. Letters-first marks are not
  proof of a car: 16 § 3 mom. lets an L-class museum vehicle use that order and
  Traficom grants special marks in either order, so `FI_ORDINARY` is
  `NOT_INFERABLE`.
- **DK is one composition and a lot of colour.** § 68, stk. 2 of
  bekendtgørelse nr. 866 af 19. juni 2023 gives every registered vehicle two
  Latin letters + one to five digits; diplomatic plates (§ 76) show that same
  number on blue, and white/yellow/"papegøjeplade" follow registration-tax
  status set outside the order — so `DK_ORDINARY` asserts no colours at all.
  § 68, stk. 3 lets the tax administration cut the numbers into series by
  vehicle kind, but publishes no such division, hence `NOT_INFERABLE`. No
  letter table is published either, so the full A-Z is accepted. `validFrom` is
  omitted on purpose: § 72, stk. 3, nr. 4 and § 75 pin the current
  "retningslinjer" to 1 April 1976, but the two-letter shape is older (the 1958
  police-district pairs), so a 1976 cut-off would wrongly reject older plates.
  **Deliberately absent**: prøveskilte and prøvemærker (excluded from § 68,
  stk. 2, and their composition lives in lov om registrering af køretøjer
  §§ 7 a-7 h, which does not state one), ønskenummerplader (§ 74, 2-7 free
  characters) and historic plates (§ 75 — the pre-1976 systems).

These need grammar or scope work, not a quick patch. Discuss before changing.
