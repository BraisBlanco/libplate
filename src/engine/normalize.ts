import type { InputRepresentations } from "../model/index.js";

/** Whitespace plus the various Unicode hyphen/dash/minus characters. */
const SEPARATORS = /[\s\-‐-―−]/g;

/** Upper bound on raw input length, applied before any other work. */
export const MAX_RAW_LENGTH = 64;

/** The character set the compact representation is allowed to contain. */
const ALLOWED_COMPACT = /^[A-Z0-9]*$/;

/**
 * Produce the representations the engine works with. The compact form is
 * uppercased with separators removed and is what schemes are matched against;
 * the raw form is preserved untouched as evidence.
 */
export function normalize(raw: string): InputRepresentations {
  // toUpperCase() (not toLocaleUpperCase) is locale-independent by design.
  const compact = raw.trim().toUpperCase().replace(SEPARATORS, "");
  return { raw, compact };
}

/** Whether the compact form contains only characters we know how to match. */
export function hasOnlyAllowedCharacters(compact: string): boolean {
  return ALLOWED_COMPACT.test(compact);
}
