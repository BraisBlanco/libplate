# libplate

Format validation, parsing and structured analysis of **European vehicle
registration plates** — conceptually a "libphonenumber for licence plates".

> **What this library does and does not do.** libplate validates known plate
> _formats_ and extracts the information encoded in them. It **cannot** prove
> that a plate has been issued, is currently assigned, belongs to the observed
> vehicle, or has not been forged. That requires authorized access to
> administrative registries.

**Status:** early but growing. Every scheme cites its legal basis in
[`docs/SOURCES.md`](docs/SOURCES.md).

### Supported plate types

**🇪🇸 Spain**

| Type                           | Example      | Notes                            |
| ------------------------------ | ------------ | -------------------------------- |
| Ordinary series                | `1234 BCD`   | Category not inferable from text |
| Trailer / semitrailer (`R`)    | `R 1234 BCD` | Deterministic category           |
| Special vehicle (`E`)          | `E 1234 BCD` | Broad category                   |
| Moped / motor cycle (`C`)      | `C 1234 BCD` | Deterministic category           |
| Historical (`H`)               | `H 1234 BCD` | Historical-vehicle regime        |
| Tourist (`T`)                  | `T 1234 BCD` | Tourist regime                   |
| Temporary — private (`P`)      | `P 1234 BCD` | Green plate                      |
| Temporary — company (`S`, `V`) | `S 1234 BCD` | `S` unregistered, `V` registered |
| Diplomatic missions (`CD`)     | `CD 12 345`  | Red plate                        |
| Consular offices (`CC`)        | `CC 12 345`  | Green plate                      |
| International orgs (`OI`)      | `OI 123 45`  | Blue plate                       |
| Technical-admin staff (`TA`)   | `TA 123 45`  | Yellow plate                     |
| Provincial series (1971-2000)  | `M-1234-AB`  | Legacy; official province table  |
| Provincial numeric (1900-1971) | `M-123456`   | Legacy; official province table  |

Spanish diplomatic-regime plates validate the documented group widths only:
no official public table of mission/organization prefixes exists. For `OI` and
`TA`, a 5-digit compact input like `OI12345` admits two splits (`OI 12 345` /
`OI 123 45`); libplate uses the separators you wrote as evidence and reports
`AMBIGUOUS` when they don't decide it.

**🇵🇹 Portugal**

| Type                          | Example      | Notes                                |
| ----------------------------- | ------------ | ------------------------------------ |
| Current general series        | `AA 00 AA`   | Since 2020-03-03                     |
| Historical — until 1992       | `AA-00-00`   | Opt-in in detection                  |
| Historical — 1992–2005        | `00-00-AA`   | Opt-in in detection                  |
| Historical — 2005–2020        | `00-AA-00`   | Opt-in in detection                  |
| Trailers / semi-trailers      | `L 808970`   | Official regional-service code table |
| Export                        | `24783 L`    | Yellow plate; customs letter L/P/A/M |
| Industrial machines (2006-20) | `08-AM-08 A` | Red plate; circulation class A-H     |
| Industrial machines (current) | `AA 08 AM B` | Red plate; circulation class A-H     |

A Portuguese trailer plate with a two-letter service code and exactly four
digits (`SE 1234`) shares its compact form with the pre-1992 general series
(`SE-12-34`); libplate resolves it with the separators you wrote or reports
`AMBIGUOUS`.

**🇫🇷 France**

| Type               | Example     | Notes                                     |
| ------------------ | ----------- | ----------------------------------------- |
| SIV current series | `AA-123-AA` | Letters `I`,`O`,`U` unused; not `SS`/`WW` |
| Provisional (`WW`) | `WW-123-AA` | Temporary regime                          |

**🇮🇹 Italy**

| Type                      | Example      | Notes                                                           |
| ------------------------- | ------------ | --------------------------------------------------------------- |
| Current ordinary series   | `AA 000 AA`  | Letters `I`,`O`,`Q`,`U` not used; also trailer rears since 2013 |
| Motorcycles               | `AA 12345`   | Shape shared with pre-2013 "Rimorchio" trailer plates           |
| Mopeds (since 2006)       | `X5FJPD`     | Six characters from a base-28 set; personal plate               |
| Agricultural machines     | `AE 123 B`   | Yellow plate                                                    |
| Operating machines        | `AE B 123`   | Yellow plate, red characters                                    |
| Escursionisti Esteri      | `EE 123 AB`  | `EE` + 3 digits + 1-2 letters                                   |
| Test plates (targa prova) | `A1 P 23B45` | Since 2002                                                      |

Since 2013 Italian trailers carry a rear plate with the ordinary-series
structure; the X-initial lots are administratively reserved for them, but that
allocation is not a format rule, so text alone cannot separate a trailer from
a car (`vehicle.inferenceLevel` stays honest about this).

**🇩🇪 Germany**

| Type           | Example     | Notes                                        |
| -------------- | ----------- | -------------------------------------------- |
| Standard       | `B-XY 1234` | District from the official KBA table         |
| Oldtimer (`H`) | `B-XY 123H` | Historical-vehicle regime; tighter length    |
| Electric (`E`) | `M-XY 123E` | Ordinary regime, electric drive; same limits |

German plates are matched against the official district-code table
(assignable codes plus revoked codes still in circulation). Because separators
are stripped for matching, a compact input like `BAB123` can admit several
readings (`B-AB 123` Berlin vs `BA-B 123` Bamberg); libplate reports
`AMBIGUOUS` with all candidates, and uses the separators you wrote as evidence
to resolve the split when present.

**🇧🇪 Belgium**

| Type            | Example     | Notes                    |
| --------------- | ----------- | ------------------------ |
| Standard series | `1-ABC-123` | Red on white; since 2010 |

**🇳🇱 Netherlands**

| Type                      | Example    | Notes                                          |
| ------------------------- | ---------- | ---------------------------------------------- |
| Sidecode 12 (since 2021)  | `X-99-XXX` | Current for tractors, light commercial, mopeds |
| Sidecode 11 (since 2015)  | `XXX-99-X` | Cars since 2024-06-04                          |
| Sidecode 10 (since 2008)  | `X-999-XX` |                                                |
| Sidecode 9 (since 2006)   | `XX-999-X` |                                                |
| Sidecode 8 (since 2009)   | `9-XXX-99` |                                                |
| Sidecodes 4-7 (1978-)     | `XX-99-XX` | Opt-in in detection; some still issued¹        |
| Sidecodes 1-3 (1951-1978) | `XX-99-99` | Opt-in in detection; vowels were genuine       |

¹ Sidecode 4 is still current for trailers, 6 for motorcycles, 7 for heavy
trucks; they stay opt-in in country-less detection because their shapes
collide with current series abroad (e.g. `XX-99-XX` ≡ the current Portuguese
`AA-00-AA`). First-issuance dates follow the official RDW series tables
(earliest category, not cars).

**Not yet modelled**: Spanish state/military bodies; French `W garage` and
diplomatic series; Portuguese diplomatic/military series and the pre-2013
moped/motorcycle series; Italian diplomatic (`CD`/`CC`), Polizia Locale `Y`
series, SMOM and pre-2002 test plates; German seasonal (`Saisonkennzeichen`),
alternating (`Wechselkennzeichen`), green, Bundeswehr and diplomatic plates;
Dutch special series (royal `AA`, `CD`, dealer/export plates).

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
- **No hand-written regex.** Patterns are expressed as tokens (`LITERAL`,
  `DIGITS`, `CHARSET`, `LETTERS`, `TABLE`), fixed-length or bounded
  variable-length, that compile to a set of fixed-length anchored regexes with
  no backtracking (no ReDoS) and deterministic segment extraction. Inputs that
  admit several segmentations are reported as ambiguous — never guessed.
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
