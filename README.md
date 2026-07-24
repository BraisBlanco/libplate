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

| Type                        | Example       | Notes                                       |
| --------------------------- | ------------- | ------------------------------------------- |
| SIV current series          | `AA-123-AA`   | Letters `I`,`O`,`U` unused; not `SS`/`WW`   |
| Provisional (`WW`)          | `WW-123-AA`   | Temporary regime; pink plate since 2026     |
| W garage (professionals)    | `W-123-AB`    | Annual professional plate; pink since 2026  |
| Mopeds (2004-2015)          | `AB 123 C`    | Closed series, still circulating            |
| FNI métropole (1950-2009)   | `5723 HB 62`  | Legacy; official department table           |
| FNI DOM (1950-2009)         | `182 ABE 974` | Legacy; 3-digit DOM codes                   |
| Diplomatic (`CMD`/`CD`)     | `5 CD 1234`   | Green plate; embassies, delegations, `500`  |
| International orgs (`CD`)   | `401 CD 5`    | Entity codes 400-499, 600, 700              |
| Consular (`C`)              | `105 C 1.75`  | Department of the post after a dot          |
| Staff / functionaries (`K`) | `105 K 100`   | Embassy, consular and organization variants |

The SIV letter exclusions are allocation practice documented by
service-public.fr — Annexe VII of the arrêté du 9 février 2009 prescribes only
the 2+3+2 composition. An FNI number whose series spells a diplomatic status
group over a department-like serial (`100 CD 20`) is a genuine text ambiguity
and is reported as `AMBIGUOUS`. Transit temporaire / import plates reuse the
ordinary SIV number on a red plate, so they are not a separate scheme.

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

| Type                           | Example     | Notes                                      |
| ------------------------------ | ----------- | ------------------------------------------ |
| Standard series                | `1-ABC-123` | Red on white; since 2010                   |
| Oldtimer (`O`)                 | `O-ABC-123` | Historical-vehicle regime                  |
| Trailers (`Q`)                 | `Q-ABC-123` | Deterministic category                     |
| Taxis / hire with driver (`T`) | `T-XAB-123` | Group starts `X` (taxi) or `L` (hire)      |
| Motorcycles (`M`)              | `M-ABC-123` | Deterministic category                     |
| Mopeds / light quads (`S`)     | `S-AAB-123` | Class letter `A`/`B`/`P`/`U`               |
| Agricultural (`G`)             | `G-ABC-123` | White on red                               |
| Commercial (`Z`/`Y`/`V`)       | `Z-ABC-123` | Dealer / test / professional; green plates |
| Temporary short-term (`W`)     | `WA-25-ABC` | White on red; digits = expiry year         |
| Export (`X`)                   | `XA-25-ABC` | White on red; digits = expiry year         |
| Diplomatic (`CD`)              | `CD-AB-123` | Red on white                               |
| Old series (1973-2008)         | `ABC-123`   | Opt-in in detection; still in circulation  |
| Old series (2008-2010)         | `123-ABC`   | Opt-in in detection; still in circulation  |

Belgian plates follow the **holder**, not the vehicle, so the pre-2010 series
remain fully valid in circulation. They still stay opt-in in country-less
detection because their compact shapes collide abroad (`ABC123` also reads as
a German `A-BC 123`). Compact current-series inputs can collide too
(`MABC123` is the Belgian motorcycle `M-ABC-123` or the German `MA-BC 123`);
as always, the separators you wrote decide it or the result is `AMBIGUOUS`.

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

**🇵🇱 Poland**

| Type                          | Example     | Notes                                         |
| ----------------------------- | ----------- | --------------------------------------------- |
| Ordinary — cars (2-letter)    | `WA 12345`  | 5-char serial; official discriminant table    |
| Ordinary — motorcycles/mopeds | `WA 1234`   | 4-char serial; also tractors and L6e/L7e      |
| Ordinary — powiat (3-letter)  | `KRA A123`  | Car and motorcycle serials share arrangements |
| Reduced-size                  | `W 123`     | Voivodeship letter only; since 2018-07-01     |
| Historic (zabytkowe)          | `WA 123`    | Yellow plate; historical-vehicle regime       |
| Temporary (tymczasowe)        | `W0 1234`   | Red on white; sports variant red on yellow    |
| Diplomatic                    | `W 123456`  | White on blue; only type without the EU band  |
| Individual (vanity)           | `W0 TIGER`  | 3-5 chars, at most last two digits            |
| Professional                  | `W01 23P45` | Green on white; fixed `P` marker; since 2019  |

Polish serials are validated against the exact digit/letter arrangements of
§ 30 of the 2024 regulation (e.g. `NNNN` never follows a two-letter powiat
discriminant), the 20-letter authority alphabet (no `B`/`D`/`I`/`O`/`Z`), and
the full Załącznik 13 prefix table (689 prefixes, including the 2025/2026
additions). EV/hydrogen vehicles carry the same numbers black-on-green — a
colour change text cannot detect.

**🇦🇹 Austria**

| Type                    | Example    | Notes                                                   |
| ----------------------- | ---------- | ------------------------------------------------------- |
| Standard issue          | `KI 234AB` | Digits then letters; district from KDV Anlage 5d        |
| Wunschkennzeichen       | `W ABC123` | Letters then digits (mirror of the standard issue)      |
| Diplomatic / consular   | `WD 123AB` | Land letter + `D`/`K`; no coat of arms                  |
| Federal officeholders   | `A 1`      | Letter `A` + digits only; Bundeswappen (§ 26 Abs. 2)    |
| Land governments        | `N 4321`   | Land letter + digits only (§ 26 Abs. 3)                 |
| State / military series | `BH 45678` | `BP`, `FV`, `PT`, `BD`, `BH`, `JW` + digits (Abs. 4)    |
| Fire brigade            | `FW 45KI`  | `FW` + 2-3 digits + the district's Anlage 5d code (¶ i) |

The Austrian district table unions the current Anlage 5d codes with those
retired by district mergers (`JU`, `KF`, `MZ`, `HB`, `FF`, `RA`, `FB`, `WU`)
that stay on circulating vehicles. Probefahrt (blue), Überstellung (green),
temporary (blue) and moped (red) plates share the standard text format and
differ only in colour, so `AT_STANDARD` carries no visual expectation; the red
plates for foreign trailers carry the towing vehicle's own number (KFG § 49
Abs. 3), and `Deckkennzeichen`/`Wechselkennzeichen` reuse ordinary formats. The
all-digit series have no prescribed digit count — § 26 Abs. 6 Z 2 excludes them
— so they accept 1-6 digits, the ordinary plate's capacity per Anlage 5e. Three
honest ambiguities: an all-digit diplomatic serial written compactly
(`WD12345`) also reads as the Wunschkennzeichen `W-D12345` (the separators you
write resolve it, as they do for `BP12345` = `B-P12345`), `ND`/`GD`/`NK`/`SD`/
`VK` are both district codes and Land+`D`/`K` diplomatic prefixes, and `BD` +
digits is both the Bundesbusdienst series and Burgenland+`D` — unresolvable
however it is written.

**Not yet modelled**: Spanish state/military bodies; French `W garage` and
diplomatic series; Portuguese diplomatic/military series and the pre-2013
moped/motorcycle series; Italian diplomatic (`CD`/`CC`), Polizia Locale `Y`
series, SMOM and pre-2002 test plates; German seasonal (`Saisonkennzeichen`),
alternating (`Wechselkennzeichen`), green, Bundeswehr and diplomatic plates;
Dutch special series (royal `AA`, `CD`, dealer/export plates); Belgian
personalized plates (free text, up to 8 characters), the royal court and
`A`/`E`/`P` short national series, and the pre-1973 series; Polish pre-2000
black plates and military/service series; Austrian pre-1989 black plates.

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
  catalogued in [`docs/SOURCES.md`](docs/SOURCES.md); the stable `scheme.id`
  in a result is the key to look them up (the API itself carries no legal
  citations — that is documentation, not validation output).

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
