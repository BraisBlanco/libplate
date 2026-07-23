# Design note: Spanish diplomatic series (CD / CC / OI / TA)

**Status:** IMPLEMENTED (2026-07-23, metadata 2026.07.2). Kept as the record
of the design and the source verification. See "Implementation outcome" at the
end; `AGENTS.md` documents the current state.

## Goal

Add validation + parsing for the four Spanish diplomatic-regime series,
following the usual discipline: declarative metadata, cited legal sources in
`docs/SOURCES.md`, conformance examples, and a green `npm run check`.

## What is known — VERIFIED 2026-07-23 against the consolidated BOE text

All four series live in **Anexo XVIII, section I.B.a) "Matrícula en régimen
diplomático"** of the Reglamento General de Vehículos (RD 2822/1998, source id
`ES-RGV`). Verified via the BOE open-data API (block `i-4`, version in force
since 2021-01-02; layout/colour table in block `cuadro1`, version in force
since 2026-05-30 — the 2026 amendment did not touch the diplomatic rows).

The RGV prescribes for each series **three groups: the letter pair followed by
two digit groups** ("dos grupos de guarismos"), the first a fixed prefix per
mission/organization, the second a vehicle serial ("número de orden"). It
fixes the colours (Cuadro 1 agrees: R/AZ/V/AM backgrounds, B/N characters) but
**deliberately does not fix the digit counts**. The counts below come from the
DGT overview (`ES-DGT-TYPES`, official):

| Series | Holder                                          | Plate colours            | Format (DGT)                |
| ------ | ----------------------------------------------- | ------------------------ | --------------------------- |
| `CD`   | Diplomatic missions (embassies)                 | Red, white characters    | `CD` + 2 + 2-3 digits       |
| `CC`   | Consular offices                                | Green, white characters  | `CC` + 2 + 2-3 digits       |
| `OI`   | International organizations                     | Blue, white characters   | `OI` + 2-3 + 2-3 digits     |
| `TA`   | Technical-administrative staff of all the above | Yellow, black characters | `TA` + 2-3 + digits (see ↓) |

- DGT does not state the TA serial's digit count ("el número de orden");
  modelled as 2-3 by analogy with the other three series — documented
  assumption.
- Prefix `1` belongs to the Decanato del Cuerpo Diplomático (RGV); DGT's "dos
  cifras" implies zero-padding on the plate, which no official text confirms —
  so the digit groups do **not** set `noLeadingZero`.
- The Orden de 31 de mayo de 1977 (BOE-A-1977-13514) was checked: **derogada**
  on 1999-07-26 by RD 2822/1998, and it did not fix digit counts either. Not
  cited.

## Why this is now unblocked

The Germany work added everything these series were waiting for:

- **Variable-length digit groups** (`minLength`/`maxLength`) — needed if a
  group is 2-3 digits.
- **Adjacent variable groups are safe**: two digit groups back to back (e.g.
  `12` + `345` in compact `CD12345`) produce multiple segmentations; the
  engine already resolves them with the caller's separators or returns
  `AMBIGUOUS_SEGMENTATION`. No engine work is expected — this is metadata-only.
- `lengthRules` if a total-length cap applies.

## Sketch (adjust to the verified digit counts)

- One scheme per series (`ES_DIPLOMATIC_CD`, `ES_CONSULAR_CC`,
  `ES_INTERNATIONAL_OI`, `ES_TA`), mirroring how DE models H/E as separate
  schemes. Prefix as `LITERAL`; two `DIGITS` groups.
- `registrationType`: `DIPLOMATIC` (CD), `CONSULAR` (CC),
  `INTERNATIONAL_ORGANIZATION` (OI). These finally exercise the
  `registration.diplomatic` flag no shipped scheme sets today.
- **DECIDED — TA gets a new enum member `DIPLOMATIC_STAFF`.** The RGV places
  TA under "Matrícula en régimen diplomático", so `registration.diplomatic`
  must be `true` — which rules out `SPECIAL` (it would report `diplomatic:
false`, contradicting the source). Plain `DIPLOMATIC` would misstate the
  holder: TA staff are expressly not diplomatic agents (distinct colours,
  lesser privileges), and TA plates hang off consulates and OIs too. Adding a
  union member is additive; the contract policy in `AGENTS.md` forbids
  _renames_ without a major bump, not additions. `buildRegistrationInference`
  must include it in the `diplomatic` derivation.
- **DECIDED — mission-number table: accept any digits in range.** The prefix
  ordering is defined procedurally (alphabetical per the MAE's Cuerpo
  Diplomático list, OI/newcomers by seniority) and no official public table of
  prefix assignments exists. Validating widths only is consistent with "no
  unofficial sources"; documented as a known limitation.
- `vehicleInference: NOT_INFERABLE`; `visual` per the colour column above.
- Detection interplay (checked against the shipped tables): compact
  `CD1234`/`CC1234` (2+2 digits) also parse as German `C-D 1234`/`C-C 1234` —
  `C` is Chemnitz — so country-less detect() is `AMBIGUOUS_COUNTRY` for them.
  The 7-character forms don't collide (DE allows at most 4 digits), `O`/`T`/
  `OI`/`TA`/`CD`/`CC` are not German district codes, and everything else in
  the library is digit-first or requires trailing letters. Ambiguity within
  the scheme exists only for OI/TA (2-3 + 2-3): a 5-digit compact like
  `OI12345` splits 2+3 or 3+2 → separators as evidence, else
  `AMBIGUOUS_SEGMENTATION`. CD/CC (fixed 2-digit prefix) are always unique.

## Plan

1. Verify Anexo XVIII (consolidated BOE text of `ES-RGV`) — exact digit
   groups per series, colours, any total-length cap. Update the table above.
2. Decide the TA `registrationType` and the mission-number-table question
   (document both in this note).
3. Write the four YAML schemes + examples (valid/invalid incl. an ambiguous
   compact form like `CD12345` if groups are variable).
4. `docs/SOURCES.md`: extend the `ES-RGV` row's "Used for" and promote
   `ES-DGT-TYPES` if actually cited; add the 1977 Orden only if needed.
5. README matrix + AGENTS.md supported list; drop the "deferred ES series"
   limitation for diplomatic (state/military and provincial series remain).
6. Targeted tests (regimes: `diplomatic: true`; visuals; detect collisions);
   bump `metadataVersion`; `npm run check` green.

## Implementation outcome (2026-07-23)

Shipped as `ES_DIPLOMATIC_CD`, `ES_CONSULAR_CC`, `ES_INTERNATIONAL_OI` and
`ES_TA` (metadata 2026.07.2). As predicted, metadata-only for the grammar — no
engine changes. Deviations and notes:

- **One small contract addition**: `DIPLOMATIC_STAFF` joined the
  `RegistrationType` union (model, JSON Schema, and the `diplomatic`-flag
  derivation in `buildRegistrationInference`) per the TA decision above. These
  four schemes are the first to set `registration.diplomatic: true`.
- **Ambiguous forms live in tests, not YAML examples** (`test/regimes.test.ts`):
  the conformance suite requires valid examples to be `VALID`, and 5-digit
  compact `OI`/`TA` forms are `AMBIGUOUS` — same convention as the German
  `BAB123` case. Separator-evidence resolution and the "a unique split is
  never rejected by separators" rule (`OI 1 234` → `OI 12 34`) are covered.
- **Detection collision confirmed and tested**: compact `CD`/`CC` + 4 digits
  is also a valid German plate (`C-D 1245`, Chemnitz) → `AMBIGUOUS_COUNTRY`
  without a country hint; 5-digit and `OI`/`TA` forms detect uniquely as ES.
- **No `lengthRules` needed**: the RGV sets no total-length cap for these
  series (the group widths already bound the total).
- The 1977 Orden was not cited (derogada, and it added nothing — see the
  verification section).
