# Releasing

## Two versions, deliberately

Every result carries both:

```ts
result.versions; // { library: "0.1.0", metadata: "2026.07.15" }
```

- **`library`** — the code. Semver. Lives in `package.json` and, mirrored, in
  `src/version.ts`; `test/docs.test.ts` fails if the two disagree.
- **`metadata`** — the plate corpus. A calendar stamp (`YYYY.MM.DD`) in
  `metadata/version.json`, meaning _"the regulations were last reviewed on this
  date"_. It is not semver because it does not describe an interface; it lets a
  caller who logged a verdict months ago tell whether today's library would
  still agree.

Bump the metadata version whenever a scheme is added, corrected or retired, in
the same commit as the change.

## What counts as a breaking change

The contract is **the verdict, not just the type signature.** A caller who
stored `status: "VALID"` for a plate depends on it staying valid.

| Change                                                            | Bump      |
| ----------------------------------------------------------------- | --------- |
| New country or scheme; new optional result field                  | **minor** |
| A previously `INVALID` input becomes `VALID` (coverage grew)      | **minor** |
| Widening an existing scheme so it accepts more inputs             | **minor** |
| A previously `VALID` input becomes `INVALID` or `AMBIGUOUS`       | **major** |
| Renaming a `scheme.id`, `ValidationReason`, status or enum member | **major** |
| A result changes which scheme or vehicle category it reports      | **major** |
| Narrowing a scheme after finding the regulation is stricter       | **major** |
| Fixing a bug with no verdict change; docs; sources; internal work | **patch** |

That last row in the major block is the uncomfortable one: tightening a scheme
to match the law more faithfully is a _correction_, but it still breaks callers.
Ship it as a major, and say in the changelog which inputs changed verdict.

While at `0.x`, npm treats a **minor** bump as breaking for `^` ranges, so use
minor for anything in the major rows above and patch for everything else.

## Cutting a release

1. Land the work on `main` with `npm run check` green.
2. Move the `## [Unreleased]` entries in [`../CHANGELOG.md`](../CHANGELOG.md)
   under a new version heading, and add the compare link at the bottom. If any
   input changed verdict, list it explicitly.
3. Bump both versions — `npm version <major|minor|patch>` updates
   `package.json` and creates the tag; edit `src/version.ts` to match _before_
   tagging, or `npm run check` will fail in the release workflow.
4. Push the tag:

   ```bash
   git push --follow-tags
   ```

5. `.github/workflows/release.yml` verifies the tag matches `package.json`,
   re-runs `npm run check`, builds via `prepack`, and publishes with
   [provenance](https://docs.npmjs.com/generating-provenance-statements).

### One-time npm setup

The workflow uses npm **trusted publishing**, so there is no token to rotate or
leak. After the first release exists, go to npmjs.com > the package > Settings >
Trusted publisher and register:

- Organization/user and repository: `BraisBlanco/libplate`
- Workflow filename: `release.yml`

The very first publish has to come from a laptop, because the package must exist
before a trusted publisher can be attached to it:

```bash
npm login
npm publish        # prepack builds; publishConfig sets public access
git tag v0.1.0 && git push --tags
```

That first tarball has no provenance attestation. Every tag-driven release after
it does.

Pushing the `v0.1.0` tag after a manual publish is safe: the workflow checks the
registry first and no-ops on a version that already exists, so the tag lands (the
changelog links depend on it) without a 403 for republishing.

## What ships in the tarball

`files` in `package.json` — `dist/`, `metadata/`, `schema/`, `docs/SOURCES.md`,
plus the README and LICENSE npm always includes. The raw YAML under `metadata/`
is redundant at runtime (it is compiled into `dist/`) and is shipped on purpose:
it is the auditable source of every verdict, and `docs/SOURCES.md` is the map
from `scheme.id` to the regulation behind it. Verify with:

```bash
npm pack --dry-run
```
