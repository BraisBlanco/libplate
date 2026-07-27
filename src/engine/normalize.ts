import type { InputRepresentations } from "../model/index.js";

/**
 * Whitespace, the various Unicode hyphen/dash/minus characters, and the dot
 * (French consular/K plates write the department after one, e.g. "105 C 1.75").
 */
const SEPARATORS = /[\s.\-‐-―−]/;

const SEPARATORS_ALL = new RegExp(SEPARATORS.source, "g");

/** Upper bound on raw input length, applied before any other work. */
export const MAX_RAW_LENGTH = 64;

/**
 * The character set the compact representation is allowed to contain.
 * Ä/Ö/Ü appear in German district codes; schemes whose alphabets exclude
 * umlauts simply never match them.
 */
const ALLOWED_COMPACT = /^[A-Z0-9ÄÖÜ]*$/;

/**
 * Produce the representations the engine works with. The compact form is
 * uppercased with separators removed and is what schemes are matched against;
 * the raw form is preserved untouched as evidence.
 */
export function normalize(raw: string): InputRepresentations {
  // toUpperCase() (not toLocaleUpperCase) is locale-independent by design.
  // No trim() is needed: `\s` is part of SEPARATORS, so the global replace
  // already removes leading and trailing whitespace along with the rest.
  const compact = raw.toUpperCase().replace(SEPARATORS_ALL, "");
  return { raw, compact };
}

/** Whether the compact form contains only characters we know how to match. */
export function hasOnlyAllowedCharacters(compact: string): boolean {
  return ALLOWED_COMPACT.test(compact);
}

/**
 * The compact-string boundaries the caller marked with separators: index `i`
 * is present when a separator sits between compact characters `i-1` and `i`
 * (leading/trailing separators are ignored). Normalization strips separators
 * before matching, but where the caller placed them is evidence — the engine
 * uses it to resolve segmentation ambiguity (e.g. "B-AB 123" vs "BA-B 123").
 */
export function separatorBoundaries(raw: string): Set<number> {
  const boundaries = new Set<number>();
  let compactIndex = 0;
  let pendingSeparator = false;
  // Leading separators are ignored by the `compactIndex > 0` guard below and
  // trailing ones by there being no following character, so no trim() either.
  for (const char of raw) {
    if (SEPARATORS.test(char)) {
      pendingSeparator = true;
      continue;
    }
    if (pendingSeparator && compactIndex > 0) boundaries.add(compactIndex);
    pendingSeparator = false;
    // Some characters expand when uppercased (ß → SS); keep indices aligned
    // with the compact form, which is built from the uppercased string.
    compactIndex += char.toUpperCase().length;
  }
  return boundaries;
}
