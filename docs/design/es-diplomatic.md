# Design note: Spanish diplomatic series (CD / CC / OI / TA)

**Status:** planned / not yet implemented. This note is the entry point to
continue the work in a fresh session. Read `AGENTS.md` first for project
rules, and `docs/design/germany.md` → "Implementation outcome" for the grammar
features this plan relies on.

## Goal

Add validation + parsing for the four Spanish diplomatic-regime series,
following the usual discipline: declarative metadata, cited legal sources in
`docs/SOURCES.md`, conformance examples, and a green `npm run check`.

## What is known (verify against the consolidated BOE text before use)

All four series live in **Anexo XVIII of the Reglamento General de Vehículos**
(RD 2822/1998, source id `ES-RGV`, already in `docs/SOURCES.md`). Shape:
a letter prefix + two digit groups (mission/organization number + serial):

| Series | Holder                          | Plate colours            | Reported format        |
| ------ | ------------------------------- | ------------------------ | ---------------------- |
| `CD`   | Diplomatic missions (embassies) | Red, white characters    | `CD` + digits + digits |
| `CC`   | Consular offices                | Green, white characters  | `CC` + 2 + 2-3 digits  |
| `OI`   | International organizations     | Blue, white characters   | `OI` + digits + digits |
| `TA`   | Technical-administrative staff  | Yellow, black characters | `TA` + 2-3 + digits    |

Secondary references describe the first group as the country/organization
number (2, sometimes 3 digits) and the second as the vehicle serial (2 or 3
digits). **The exact digit counts per series are the main thing to pin down**
in the consolidated Anexo XVIII text — do not trust the table above without
re-reading it.

- Pre-RGV basis: Orden de 31 de mayo de 1977 (BOE-A-1977-13514) established
  CD/CC plates; cite only if the RGV text turns out to be incomplete.
- `ES-DGT-TYPES` (staged in the reference library) gives the DGT overview.

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
- **Open decision — TA:** technical-administrative staff of missions,
  consulates and OIs. `DIPLOMATIC` is probably wrong (TA staff hold lesser
  privileges); consider `SPECIAL` with a note, or extending the enum — enum
  extension is additive but touches the public contract, so justify it.
- **Open decision — mission-number table:** the country/organization numbers
  are assigned (e.g. each embassy has one), but no official public table is
  known. Recommendation: accept any digits in range and document the
  limitation, consistent with "no unofficial sources".
- `vehicleInference: NOT_INFERABLE`; `visual` per the colour column above.
- Detection interplay: check that compact forms don't collide with existing
  schemes (e.g. `CD` + digits vs nothing today; `TA1234` vs ES ordinary? —
  ordinary is digit-first, so likely safe; add detect() tests anyway).

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
