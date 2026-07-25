# Design notes

`AGENTS.md` describes how the library works **today** and is the spec to build
against. This file records the reasoning behind it: how evidence is ranked, what
the library deliberately refuses to do, what is designed but unbuilt, and what
is still undecided.

Distilled from the pre-implementation functional analysis of July 2026, which
was removed from the tree once the library it describes existed. To read it:

```bash
git log --all --oneline -- analisis-validador-matriculas-europeas.md
git show <commit>^:analisis-validador-matriculas-europeas.md
```

---

## Evidence hierarchy

When several readings of an input survive, they are resolved by evidence, never
by preference or ordering. Strongest to weakest:

| Rank | Evidence                         | State                                            |
| ---- | -------------------------------- | ------------------------------------------------ |
| 1    | Country supplied by the caller   | Implemented (`country` option)                   |
| 2    | National code in the EU band     | Not implemented (`EU_COUNTRY_CODE` variant only) |
| 3    | Lookup in an authorized registry | Out of scope by design                           |
| 4    | Regulated visual elements        | Not implemented (`visual` is output-only)        |
| 5    | Known time period                | Implemented (`referenceDate` option)             |
| 6    | The textual scheme itself        | Implemented                                      |
| 7    | Where the vehicle was observed   | Deliberately unused                              |

Rank 7 is a weak hint and is not accepted as input: vehicles circulate
internationally, so the country of observation says little about the country of
registration — precisely the case a logistics user hits most often.

**Separator placement** is a later addition the analysis did not foresee, and it
sits at rank 6: within a matched scheme, where the caller wrote separators
filters the surviving segmentations (a split is contradicted when a separator
falls strictly inside one of its segments). It never rejects an otherwise-unique
match. This is what makes `B-AB 123` Berlin and `BA-B 123` Bamberg while bare
`BAB123` stays `AMBIGUOUS`.

Three `Evidence` variants — `COUNTRY_HINT`, `EU_COUNTRY_CODE`, `DATE_RANGE` —
are declared in the public union but not yet emitted by any scheme; only
`PREFIX` and `PATTERN` are produced. They are reserved for ranks 1, 2 and 5.

---

## Deliberate non-goals

Each of these is a decision, not an omission. Reversing one needs an argument,
not a patch.

- **No single regex per country.** Schemes are token grammars compiled to
  fixed-length anchored expansions.
- **No boolean-first API.** `isValid(string): boolean` as the primary entry
  point throws away the reason, the scheme and the ambiguity. `parse` is
  primary; `validate` is a convenience over it.
- **Never pick the first matching country.** Multiple matches mean
  `AMBIGUOUS` + `candidates`.
- **Colour is not part of the text.** Background and foreground are what the
  regulation prescribes, never something inferred from or checked against the
  number.
- **An ordinary series never implies "car".** Most national series are shared
  across categories; reporting `PASSENGER_CAR` from text alone would be false.
- **Valid format is not existence.** No result may be read as "this plate was
  issued"; that needs an authorized registry.
- **No unofficial tables.** No blogs, photographs or enthusiast listings, no
  matter how complete they look. Every table traces to an official publication.
- **No uncalibrated probabilities.** Qualitative states (`inferenceLevel`,
  `AMBIGUOUS`) over invented confidence scores.
- **Never destroy the original input.** `input.raw` survives; `input.compact`
  is derived for matching.
- **Registry integrations stay out of the base library.** They are a different
  trust, privacy and latency model.

---

## Designed but not built

### OCR tolerance

Plates reach this library from ANPR and OCR pipelines, where a confusion set is
predictable: `O`↔`0`, `I`↔`1`, `B`↔`8`, `S`↔`5`, `Z`↔`2`, `G`↔`6`.

The rule if this is added: **never substitute silently.** A silent fix turns a
misread into a confident wrong answer. The intended shape is `status: POSSIBLE`,
a warning, and explicit correction candidates carrying the position and the
substitution made, leaving the choice to the caller. Whether that becomes a
strict/tolerant mode switch is still open (see below).

### Observed-plate input

`visual` is output-only today: what the regulation prescribes, never compared
with what a camera saw. If visual validation is added, the intended input shape
is an observed-plate object (background, foreground, EU country code, number of
lines, territorial identifier, expiry text, historical badge, dimensions), and
the result must be three-valued — `null` meaning **not checked**, not
"incorrect". Absence of visual data must never invalidate a textually valid
number.

---

## Settled since the analysis

Recorded so the pre-implementation design is not accidentally re-derived:

- **TypeScript only.** The analysis assumed parallel Java and TS runtimes with a
  separate compiler package, a canonical IR artifact and Maven distribution. The
  library shipped as a single TS package; `scripts/build-metadata.mjs` compiles
  YAML straight into an embedded module.
- **Five-value `ValidationStatus`**, not the proposed
  `POSSIBLE`/`VALID_FORMAT`/`PLAUSIBLE`/`ISSUED` ladder.
- **No `sourceRefs` in the API.** Legal citations are documentation
  (`docs/SOURCES.md`), reachable through the stable `scheme.id`; they are not
  validation output.
- **Two input representations** (`raw`, `compact`), not four.
- **Segmentation ambiguity is first-class.** `AMBIGUOUS_SEGMENTATION` and
  separator evidence came out of the German work and were not in the analysis.

---

## Open questions

1. Text only, or eventually the physical geometry of the plate?
2. How far to go on personalized plates in jurisdictions allowing near-free
   text (Belgian personalized up to 8 characters)?
3. Overseas territories: modelled inside the parent country (as French DOM are
   today) or as separate regions?
4. Military and state series in the core package, or an optional module?
5. How do urgent metadata corrections ship? `metadataVersion` is already
   independent of the library version, but there is no separate release channel.
6. Where an official table of diplomatic missions exists at all, is it shipped
   or distributed separately?
7. Strict and tolerant modes for OCR input, or a single behaviour?
8. Combinations that are formally possible but administratively reserved:
   accept (format is legal) or reject (never issued)?
9. A language-independent specification, so community ports could share the
   metadata and the conformance cases?
