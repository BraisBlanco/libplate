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
plates), Denmark (the national series + diplomatic, faste prøveskilte and `RF`
airport plates), Czechia (the structureless 5-8 character standard mark +
`CD`/`XX`/`XS`/`HC` + `EL` electric + historic `V` + sports `R` + test `F`),
Slovenia (the four ordinary arrangements behind an area code + `MV` historic +
`PR` test plates), Hungary (the 2022 four-letter series + the pre-2022
three-letter one + `CD` permanent and temporary + `OT` museum + `TX` taxi +
the `BA`/`HA`/`MA`/`NA`/`RA` state bodies + `I` temporary), Lithuania (a
composition per vehicle category — M/N cars, O trailers, L3-L7e motorcycles,
L1-L6e mopeds — plus `E` electromobiles, `T` taxi, `H` historic in both
positions, export, diplomatic and powerful quadricycles), Greece (cars Ι.Χ. and
Δ.Χ., motorcycles, and both category-O series — the `Ρ` public-use one and the
`Τ` + letter one introduced in 2019), Latvia (the two general-use series —
mechanical vehicles on two letters, trailers/semitrailers/mopeds on one — plus
`C`/`CC`/`CD` diplomatic, trade and `IZM` test numbers), Slovakia (the ordinary
two-letter/three-digit/two-letter series + the `Y` towed-vehicle block + `EL`/`EV`
electric + `CD`/`CC`/`ZZ`/`CH` diplomatic + `P` police and the all-digit armed
forces number + the six zvláštne series `C`/`F`/`H`/`M`/`S`/`V`), Norway (the
five-digit car/lorry series and the four-digit series for everything else + the
`EL`-family, `GA` and `HY` fuel series + `CD` + the two pre-1971 arrangements),
Ireland (the year/half-year/index-mark/sequence number in each of its three live
generations — first used from 2014, in 2013, and up to 2012 — plus the `ZV`
vintage series and the `ZZ` export registration).
See `README.md` for the full matrix.

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
npm pack --dry-run   # inspect the publishable tarball (prepack builds first)
```

Releases are tag-driven and publish from CI; the versioning rules (including how
the separate metadata version moves) are in [`docs/RELEASING.md`](docs/RELEASING.md).

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
- **DK is one composition cut into series by the tax administration.** The
  order in force is **bekendtgørelse nr. 663 af 10. juni 2025** (in force
  2025-07-01; it repealed nr. 866 af 19. juni 2023 by § 115, stk. 2, and was
  amended by nr. 1826 af 29. december 2025 — §§ 5 and 94 only). Do not cite
  866; its § 68 survives verbatim in 663, but the "1. april 1976" reference
  moved from § 72, stk. 3, nr. 4 to **stk. 4**, nr. 4. § 68, stk. 2 gives every
  registered vehicle two Latin letters + one to five digits, and stk. 3 lets
  the tax administration divide the numbers into series. **It does publish that
  division** — Motorstyrelsen's _Oversigt over nummerpladetyper i Danmark_
  (v2.1, 2026-05-28) gives a `Nummerrække` per plate type — which is what
  `DK_DIPLOMATIC` (76.000-77.999, blue), `DK_TRADE_PLATE` (10-99, red on white)
  and `DK_AIRPORT` (`RF` + 4-5 digits, red on yellow) rest on. `DK_ORDINARY`
  therefore carves those three out (the number is a `PATTERNS` list and `RF` an
  `excludedValues` entry) so the four schemes stay disjoint; ranges the
  catalogue leaves unallocated (a single digit, leading-zero forms,
  98.000-99.999) stay ordinary, because the carve-out only follows positive
  allocations. The rest of the division is by digit width and each width is
  shared by two categories (100-999 = large moped **or** tractor, 1.000-9.999 =
  trailer **or** small moped), so `DK_ORDINARY` stays `NOT_INFERABLE` and
  asserts no colours — white/yellow/"papegøjeplade" follow registration-tax
  status set outside the order. No letter table is published, so the full A-Z
  is accepted. `validFrom` is omitted throughout: § 72, stk. 4, nr. 4 and § 75
  pin the current "retningslinjer" to 1 April 1976, but the two-letter shape is
  older (the 1958 police-district pairs), so a 1976 cut-off would wrongly
  reject older plates. **Deliberately absent**: grænsenummerplader (§ 60 —
  § 68, stk. 2 does NOT exclude them, yet the catalogue draws them as five
  digits with no letters; the catalogue disclaims itself as "en grafisk
  fremstilling", so the conflict is unresolved and no scheme is asserted),
  prøvemærker (§ 78 — a sticker with a løbenummer of no published width),
  ønskenummerplader (§ 74, 2-7 free characters — the catalogue says 2-5, and
  either way the space swallows the other series), historic plates (§ 75 — the
  pre-1976 systems), the special municipal plates of § 3, stk. 4 and the third
  plate (it repeats the vehicle's own number).

- **CZ has no regulated ordinary structure, and that shapes everything else.**
  § 24 odst. 2 of vyhláška 343/2014 Sb. gives the standard mark only a character
  count — "nejméně 5 a nejvíce 8" capital Latin letters and Arabic numerals,
  always at least one letter and one digit — and § 27 odst. 3 limits letters to
  the twenty-two with a glyph in příloha č. 16 (no `G`, `O`, `Q`, `W`). The
  `1A2 3456` arrangement and the position of the kraj code letter are in **no**
  official text: § 27 odst. 3 only presupposes a kraj code, § 28 and the
  ministry's "Kódy krajů" page list the fourteen letters, and the ministry's own
  plate-type drawing fills the mark as `A00 0000`, which no issued plate matches.
  Wikipedia's `9A9 9999` is exactly the kind of source `docs/DESIGN.md` bars.
  Three consequences, all deliberate: (1) `CZ_ORDINARY` is modelled as written
  and is therefore `legacySeries`-flagged — not because it is legacy but because
  a free 5-8 character space would make most European plates AMBIGUOUS in
  country-less `detect()`; with a `country` hint it behaves normally. (2) It also
  covers the marks on request of § 25 / § 7b odst. 1 (8, 7 or 5 freely chosen
  characters, letters **or** digits), so the § 24 odst. 2 "at least one letter and
  one digit" rule is NOT enforced — enforcing it would reject real all-digit
  plates. (3) Every anchored Czech series sits inside that space, so those inputs
  are AMBIGUOUS unless the caller's separators contradict the standard 3 + rest
  grouping (`12345 CD` resolves, `123CD` does not). `test/conformance.test.ts`
  tolerates exactly this shape of ambiguity: a valid example may come back
  AMBIGUOUS if every competing candidate is a `legacySeries` scheme.
  **Deliberately absent**: the § 26 odst. 2-3 special marks for handling
  operation (kraj letter + 4-5 characters) and for the drive from the place of
  sale (kraj letter + 6 characters) — free-form spaces that contain the whole
  `EL` series, since `E` is the Pardubický letter, and would make every electric
  mark ambiguous against a non-legacy scheme; the export mark (§ 24 odst. 4 adds
  only a red validity field to a standard number); and the pre-2025 diplomatic
  arrangement (the MD catalogue draws the pair at positions 4-5, the MZV handbook
  fixes 6-7 since 2025-07-01, and the old plates must be surrendered by
  2026-12-31). `CZ_HONORARY_CONSUL` models only the 5-digit automobile shape: the
  handbook places `HC` at positions 4-5 for that one, and where it would sit on
  the 4- or 3-digit marks of § 24 odst. 3 is undocumented.
- **SI is split by where the hyphen falls, not by category.** Article 30(3)-(4)
  of the Pravilnik o registraciji enumerates nine digit/letter arrangements
  exhaustively (four digits alone is not one of them), and article 28(1) puts a
  hyphen "za prvim delom zaporedja črk ali številk". Since separator placement is
  evidence, a single `mark` token would be contradicted by the plate's own
  official spelling and would drop out of country-less detection — `MS AB-123`
  would come back German alone. Hence four ordinary schemes (`NN`+letters,
  `NNN`+letters, letters+digits, digit+letters+digit) whose boundaries match the
  hyphen; `SI_HISTORIC` and `SI_TEST` keep a single `PATTERNS` mark because their
  `MV`/`PR` literals anchor them and no other reading competes. The regulation
  formally **ceased to be valid on 2018-01-06** and continues to apply under
  article 89(3) point 8 of ZMV-1 — cite both. Not modelled: the article 30(2) ban
  on `I` next to `1`, `B` next to `8` and `G` next to `6` (adjacency across a
  segment boundary, which the grammar cannot express); the chosen part of the mark
  (article 32 — 3-6 characters, one optional hyphen, `X`/`Y`/`W` and a conditional
  `O`, a space that contains the ordinary marks); diplomatic plates (article 39
  gives the activity code, an agency-assigned country number and a vehicle number
  but **no widths** — the RO precedent, do not invent them); export plates (same
  characters, yellow face); and defence/police vehicles, which article 61(2)-(3)
  sends to separate ministerial regulations.
- **HU's opening pair is a rule enumerated, and one pair is withheld.** § 53 (6)
  of 326/2011. (XII. 28.) Korm. rendelet opens the 2022 mark with two vowels
  **or** two consonants of the Latin alphabet, minus `cs`, `gy`, `ly`, `ny`, `sz`,
  `ty`, `zs`; `metadata/tables/hu-kezdo-betupar.json` is that rule expanded (25
  vowel pairs + 434 consonant pairs), with `Y` treated as a consonant — which is
  what makes the explicit `gy`/`ly`/`ny`/`ty` exclusions meaningful. `TX` is
  withheld from the list because the taxi plate of annex 13/A point 3 takes
  exactly the remaining shape, so keeping it would make every taxi plate
  AMBIGUOUS; that narrowing is an inference from the reservation, not an explicit
  prohibition, and it is the only one applied (`CD` stays, its diplomatic plate
  being six digits). The pre-2022 three-letter series is still valid but shares
  its shape with `SE_ORDINARY`, so it is `legacySeries`-flagged. `HU_DIPLOMATIC`
  and `HU_STATE` model their two digit groups separately so `national` can place
  the official hyphen, which costs the all-zero exclusion of their stated ranges
  (`CD 000-000`, `HA 00-000` are accepted). `HU_TEMPORARY_CD` reports
  `DIPLOMATIC` — `registrationType` is one-dimensional and the holder regime is
  the more informative half, so `registration.temporary` reads false for it.
  **Deliberately absent**: individually produced plates (§ 55 — 3-6 letters + 1-4
  digits, seven characters together, a space that contains the current series);
  the 2004-era `R`/`H`/`RR`/`C`/`X` special series and the `Z`/`P`/`E`/`V`/`M`/`SP`
  temporary letters (§ 54 (7) stopped issuing them on 2022-07-01 and pre-2022
  temporary plates are valid only until expiry); four-wheeled moped plates; and
  the slow-vehicle (red), environment-friendly (light green), taxi-legacy (yellow)
  and bike-carrier (grey) plates, which repeat a number formed the same way.

- **LT is the one country where the text does the work, so don't second-guess
  it.** Point 21 of the taisyklės enumerates the composition for every vehicle
  category exhaustively (21.1 M/N, 21.2 electromobile, 21.3 O, 21.4 L1-L6e,
  21.5 L3-L7e, 21.6 historic, 21.7 taxi, 21.8 diplomatic, 21.9 export, 21.10
  chosen, 21.11 quadricycle), and 1 priedas gives the colours. No drawing,
  standard or agency statement is leaned on anywhere — which is also why
  `LT_TRAILER` is the library's only `DETERMINISTIC` towed-vehicle inference
  outside PT: 21.3 p. gives category O its own shape and 21.1 p. keeps it out of
  the ordinary series. The `Q`/`W`/`X` exclusion is regulation-level (21 p.
  restricts automatically composed numbers to the Latin letters of the
  Lithuanian alphabet), unlike the FR/SE practice-level ones; `Y` IS a
  Lithuanian letter, do not add it. Two deliberate deviations from the text:
  `H` is withheld from `LT_EXPORT_L` (21.9.2 p. restricts nothing, but 21.6.2 p.
  reserves four digits + final `H` for historic L vehicles and 21 p. demands
  unique numbers, so `LT_HISTORIC_L` would otherwise be a strict subset — the
  HU `TX` inference, same grounds), and both diplomatic schemes carry
  `legacySeries` for the CZ_ORDINARY reason (five or six bare digits are
  structureless and nothing else in the library matches them, so every such
  string would resolve as a Lithuanian diplomatic plate in country-less
  `detect`). **`validFrom` is omitted throughout and that is not laziness**: the
  rules were WHOLLY re-issued by the redaction of Nr. 1V-664 (2024-11-08), so
  the consolidated text carries no per-point amendment annotations and no
  series' introduction date can be read off it — including the electromobile
  series, which press coverage puts at 2016-07-01 and amendment Nr. 1V-415
  (2016-06-07) plausibly introduced, but which could not be confirmed because
  that order is not retrievable. **Deliberately absent**: the chosen numbers of
  21.10 p. (1-6 characters for M/N, 1-5 for L3-L7e and O, digits or digits and
  letters — a space that contains the ordinary series), and the `P` trade marks
  and cardboard border marks of the 1994 order Nr. 184, which was **repealed on
  2008-10-15** by Nr. 1V-353 — do not cite that order or model those plates; the
  modern equivalents are the 19.4 p. export type and a one-day permit that
  carries no plate. The diplomatic digit groups have no published assignment
  table (17 p. and 21.8 p. send them to a joint order of the foreign-affairs and
  interior ministers), so they are width-checked only — do not split them into a
  mission code and a category digit on the strength of unofficial descriptions.
  One live risk: the consolidated redaction used runs to 2026-09-30, so some
  provision of Nr. 1V-518 (2026-07-13) enters force on 2026-10-01 — **re-check
  point 21 after that date**.

- **GR is three letters over a number, and the moped series swallows it.** Υ.Α.
  οικ. 4700/330/2004 άρθρο 1 gives cars Ι.Χ. and Δ.Χ. three of the fourteen
  letters common to the Greek and Latin alphabets plus four digits (παρ. 2),
  motorcycles the same letters plus 001-999 (παρ. 3) and trailers the letter Ρ
  plus 1000-99999 (παρ. 4). The plate face carries GREEK capitals and libplate
  matches their Latin look-alikes (`A B E Z H I K M N O P T Y X`) — Ρ is rho, so
  it is entered as `P`, and Χ is chi, entered as `X`; Latin `R` and `C` are not
  Greek plate letters and Greek input is NOT transliterated (the BG trade-off).
  The prefecture/use allocation of the opening letters is real but unpublished:
  παρ. 5 says only that it "παραμένει ως έχει", so letters are charset-checked,
  and `GR_ORDINARY` asserts no colours because παρ. 5 of άρθρο 2 splits white
  (Ι.Χ.) from yellow (Δ.Χ.) on the same composition. **Deliberately absent, and
  do not "add" it**: the police-issued moped number of Υ.Α. 2513/2/218-ιδ άρθρο
  12 παρ. 1 is three of the SAME letters plus a number from 1 to 9999, a space
  that strictly contains both the car and the motorcycle series — hence
  `MOPED_OR_MOTOR_CYCLE` sits in both schemes' `possibleCategories` instead. Also
  absent: `ΔΟΚ` trade, diplomatic and `ΜΕ` machinery plates. Their specification
  survives in the paragraphs of Υ.Α. 19800/1982 that the 2004 decision did NOT
  repeal (άρθρο 9 repeals παρ. Α, Β, ΙΑ, ΙΓ, ΙΕ, ΙΣΤ of κεφάλαιο Ι only, and only
  as to car/trailer/motorcycle state plates); Υ.Α. 143021/2020 points at "την
  παρ. Γ του Κεφαλαίου Ι" for `ΔΟΚ`, but that text is paywalled on e-nomothesia
  and the 1982 ΦΕΚ is a scan — do not reconstruct it from secondary
  descriptions. The 2019 trailer decision is the one place with a real date:
  published 12.6.2019, in force nine months later, three for special-purpose
  category O vehicles, so `GR_TRAILER_PRIVATE` carries 2019-09-12; `GR_TRAILER`
  keeps no `validTo` because its plates stay in circulation.
- **LV's composition is in an annex, in a redaction that keeps changing.** The
  body of MK noteikumi Nr. 1080 delegates everything to **7. pielikums** (a URL
  trap: `likumi.lv/doc.php?id=222145` returns the annexes, the article-view URL
  does not), and the annex modelled here is the **MK 13.02.2024. noteikumu Nr. 97
  redaction** — the 30.05.2017 one has a narrower trade range and no military or
  electric-vehicle plates, so check the redaction of any quotation. Two letters +
  1-9999 is any mechanical vehicle; ONE letter + the same number is a trailer,
  semitrailer or moped, and letters may replace the last two digit symbols there
  (`Z-12AB`) — a whole-letter tail is refused, since the digits must still form
  "skaitļus no 1 līdz 9999". `LV_ORDINARY` is `NOT_INFERABLE` and carries no
  colours, and that is forced: four special-purpose series share its characters
  exactly and differ only visually (transit's red field, taxi yellow, off-road
  green symbols, electric-vehicle blue symbols), transit numbers go on trailers
  too (13.1. punkts), and the ordinary black-on-white lives in the paid standard
  LVS 20:2009. `CC` and `CD` are withheld from the general-use pairs on the HU
  `TX` reasoning (4.4.2. reserves `C`/`CC`/`CD`, 7. punkts forbids duplicates),
  but the single letter `C` is NOT withheld from the one-letter series and
  neither are the trade letters `A`-`E`: `C 1234` and `A 1234` come back
  AMBIGUOUS, which is right, because those plates differ by colour. One
  documented over-acceptance: the diplomatic four-symbol FLOOR of 4.4.1 cannot be
  expressed (`lengthRules` states maxima only), so `C` + two digits validates.
  **Deliberately absent**: military plates (`L`/`LA` + digits, with no digit count
  or symbol total anywhere — the RO precedent, do not invent one), individual
  plates (2-8 symbols, optionally containing a space, a space that contains every
  other series), and the transit/taxi/off-road/electric variants above. Out of
  scope by 2. punkts, not by omission: traktortehnika and its trailers, trams,
  trolleybuses, specialised tourist vehicles and special military technology.

- **SK lost its district table, and that is the point.** § 124 ods. 1 of zákon
  č. 8/2009 Z. z. gives the composition (two letters, the state emblem, three
  digits and two letters) and nothing else: **zákon č. 128/2021 Z. z. deleted the
  sentence "Prvá dvojica písmen evidenčného čísla označuje okres" with effect
  from 2023-01-01** (Čl. I bod 32; bod 31 pulled "skratky okresov" out of the
  § 123 delegation too). Do not add an okres table — it would reject every plate
  issued since, and both generations share the shape, which is also why
  `SK_ORDINARY` carries no `validFrom`. No letter is excluded either: § 124
  ods. 3 písm. e)-f) (the `CD`/`CC`/`CH`/`EE`/`SS`/`ZZ` openings, diacritics,
  lower case) governs the CHOSEN numbers of ods. 2, which are deliberately not
  modelled (two letters plus free letters/digits contains the ordinary series),
  and the príloha č. 17 specimen uses `Q`, `O`, `S` and `X`. Two withholdings are
  inferences, both on the HU `TX` grounds: `Y` is kept out of the first position
  of the closing pair (§ 35 ods. 3 of vyhláška č. 9/2009 Z. z. gives it to
  category O and R, so `SK_TRAILER` would otherwise be a subset — note ods. 4
  lets a T or C tractor take it too, hence `CATEGORY_ONLY` and not
  `DETERMINISTIC`, and ods. 3's own exception leaves L-towed O1 trailers inside
  the ordinary series), and `EL`/`EV` are kept out of the opening pair (ods. 7).
  The closing pair is two one-character segments only because `excluded` is not
  positional. **Citation trap, do not "fix" it**: § 35 ods. 7 cites "§ 123
  ods. 18 zákona", which was the electric-vehicle provision when the vyhláška was
  last amended (2024-12-01) but is the delegation clause today — the rule now
  lives in ods. 16 and covers hydrogen rather than plug-in hybrids. The six
  zvláštne series and `SK_ARMED_FORCES` are `legacySeries`-flagged for the
  CZ_ORDINARY reason, not because they are legacy: § 127 ods. 2 leaves the second
  row free ("päť číslic, písmen alebo kombinácia číslic a písmen"), so each is one
  letter over 36^5 combinations and shadows real German plates in country-less
  `detect()`, and seven bare digits match nothing else in the library.
  `SK_SPECIAL_C` and `SK_SPECIAL_M` assert no colours because § 123 ods. 3
  písm. b) lets those two be synthetic polyester while § 35 ods. 10's rule is
  written for the embossed metal plate; `SK_ELECTRIC` asserts only the background
  because ods. 6 and 10 say the characters "MÔŽU byť zelenej". **Deliberately
  absent**: the chosen numbers above, the pre-2009 `X` osobitné series (§ 41
  ods. 2 of the vyhláška stopped it), and the validity fields marked on the C, F,
  M and V plates, which are not part of the number.
- **NO has no regulated composition, so two sources carry it together.** § 2-11
  (1)-(2) of forskrift 1990-01-25-92 and § 39-1 nr. 1 of kjøretøyforskriften both
  say only that Statens vegvesen fixes the design and picks the mark. The shape
  comes from the forskrift indirectly — §§ 2-17 (1) and 2-18 (1) describe the
  1971-1982 and 1982-2002 marks as "to bokstaver og 4 eller 5 tall" and § 2-17 (2)
  says such marks are issued "fra samme serier som benyttes ved
  førstegangsregistrering ellers" — and the digit ranges come from the agency's
  Skiltserier page ("Tallseriene for biler og lastebiler er fra 10000 til 99999,
  mens for andre kjøretøy er det fra 1000 til 9999"), which is FR/SE/NL-grade
  agency evidence. That split is the whole basis of `NO_ORDINARY` vs
  `NO_ORDINARY_OTHER` and of their `CATEGORY_ONLY` inferences, so it is
  `CATEGORY_ONLY` and never `DETERMINISTIC`. The same page's **county letter
  table is deliberately NOT a value table**: it is introduced with "ofte", so the
  full A-Z is accepted even though no issued series uses `I`, `M`, `O` or `Q` —
  the FR FNI precedent. The reserved pairs it DOES state (fifteen electric, `GA`,
  `HY`, `CD`) are excluded from both general series. The three fuel schemes union
  both digit widths and therefore report `NOT_INFERABLE`; splitting each in two
  would recover the category at the cost of doubling the Norwegian scheme count,
  and fuel is not a field the model has. Only `NO_DIPLOMATIC` asserts colours
  (§ 2-11 (3) d), yellow on blue, and § 2a-2 (1) keeps personal marks off it);
  the general series assert none, because § 2-11 (3) puts the same characters on
  green for a varebil klasse 2, black for off-road/Svalbard, yellow for the
  Forsvaret and black for a rally car. The two pre-1971 schemes are
  `legacySeries` in the literal sense as well as the detection one, and their
  `HISTORICAL` regime is real: § 2-15 only lets a vehicle first registered more
  than 30 years ago carry them. Their county letters (A B C D E F G H I K L O R S
  T U V W X Y Z, § 2-16 (4)) are NOT the modern alphabet — `I` and `O` are in.
  **Deliberately absent**: prøvekjennemerker (§§ 2-19 to 2-23 prescribe colours
  and use but no composition — the RO/LV precedent), Forsvaret plates, personal
  marks (§ 2a-2 (2), two to seven characters), the 1971-2002 orders (identical in
  shape to the current series, so modelling them separately would make every
  Norwegian plate ambiguous) and the colour variants above.

- **IE is dated by the year of FIRST USE, and that is not a validity window.**
  Regulation 9 of S.I. No. 318 of 1992, as substituted by Regulation 4(a) of
  S.I. No. 452 of 2013, splits the mark by the year the vehicle was first brought
  into use **anywhere**: paragraph (1) two-digit year for ≤ 2012, (1A) year plus
  half-year numeral for 2013, (1B) the same shape for 2014 onwards. All three are
  in force and all three are issued today — a 2011 import registered this morning
  takes `11-D-…`. That is why `IE_ORDINARY_PRE_2013` carries **no `validFrom`**
  (Reg. 3 commenced Regulation 9 on 1993-01-01, but the numerals are not a date
  of issue, and `05-D-1` is a 1905 or 2005 vehicle), why `IE_ORDINARY_2013`
  carries **no `validTo`**, and why none of them is `legacySeries`. The split into
  three schemes is not cosmetic: paragraphs (1)/(1A) point at the paragraph 4
  index-mark table and (1B) at paragraph 4A, so `LK`/`TN`/`TS`/`WD` are
  unreachable behind a 14+ year and `T` unreachable behind an earlier one —
  **do not merge the tables**, and do not mark the four amalgamated codes
  historical (Revenue's Registration Districts note says they are still issued to
  pre-2014 imports). The 14+ bound on `IE_ORDINARY`'s year is enumerated in
  `PATTERNS` because paragraph (1B)'s own scope implies it statically; no upper
  bound is imposed, since whether a year has arrived is a question about the
  world. **The sequence width is libplate's own**: Reg. 9 states none, and the
  plate geometry cannot supply one — First Schedule paras. 14 and 16 cap a
  one-line plate at four digits on the strict reading of "total width of the space
  taken by each letter or figure", which real `191-D-12345` plates contradict, and
  at six on the permissive one. Six is what ships. `noLeadingZero` IS sourced
  (para. 3(b), the nought that was never assigned), but it is deliberately absent
  from `IE_ZZ_TEMPORARY`, whose width is fixed at five. The category union is a
  negative inference worth keeping: s. 130 of the Finance Act 1992 registers
  mechanically propelled vehicles only, so trailers are excluded — reg. 9(8) gives
  a trailer a **duplicate** of the towing vehicle's mark. **Deliberately absent**:
  the pre-1987 system (art. 25(3) of the 1982 Regulations — number and a 1-3 letter
  index mark in EITHER order, no digit count, over the ~200 marks of the 1958
  Index Marks Regulations, a space that shadows half of Europe); trade plates
  (art. 23(f) of the 1958 Regulations leaves them to unpublished ministerial
  direction, so the number-county-year arrangement on them has no text — the RO/LV
  precedent); and diplomatic, Defence Forces and any other special series, which
  the Regulations simply do not create. Ireland has no personalised plates: a
  reserved number must be in the normal format for the owner's own area and
  half-year, so for once nothing swallows the ordinary series.

These need grammar or scope work, not a quick patch. Discuss before changing.
