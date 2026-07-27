# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the versioning rules —
including how the separate **metadata version** moves — are spelled out in
[`docs/RELEASING.md`](docs/RELEASING.md).

## [Unreleased]

## [0.1.0] - 2026-07-27

First published release. Metadata version `2026.07.15`.

### Added

- Parsing, validation, formatting and country detection for **23 countries and
  187 schemes**: Spain, Portugal, France, Italy, Germany, Belgium, the
  Netherlands, Poland, Austria, Estonia, Romania, Bulgaria, Sweden, Finland,
  Denmark, Czechia, Slovenia, Hungary, Lithuania, Greece, Latvia, Slovakia and
  Norway.
- Public API: `parse`, `validate`, `format`, `detect`, `getSupportedCountries`,
  `getSupportedSchemes`, `getLibraryVersion`, `getMetadataVersion`.
- Declarative scheme metadata under `metadata/`, validated against
  `schema/plate-metadata.schema.json` and compiled into an embedded module — no
  YAML parser at runtime, browser-safe.
- Token-based patterns (`LITERAL`, `DIGITS`, `CHARSET`, `LETTERS`, `TABLE`) that
  compile to anchored fixed-length regexes with no backtracking, so no ReDoS.
- Explicit `AMBIGUOUS` results, with `candidates`, for inputs that match more
  than one country or admit more than one segmentation. The library never
  guesses.
- Vehicle-category inference carrying `inferenceLevel` and `evidence` on every
  result.
- A regulatory citation for every scheme, catalogued in
  [`docs/SOURCES.md`](docs/SOURCES.md) and keyed by the stable `scheme.id`.
- ESM + CJS builds with TypeScript declarations for both.

[unreleased]: https://github.com/BraisBlanco/libplate/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/BraisBlanco/libplate/releases/tag/v0.1.0
