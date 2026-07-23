/**
 * A tiny, non-recursive token grammar for plate segments.
 *
 * Every token has a FIXED length, which gives us two things for free:
 *   - a single anchored regular expression per scheme, with no backtracking
 *     (and therefore no ReDoS risk); and
 *   - deterministic extraction of each segment's value by slicing the compact
 *     string at cumulative offsets — no regex capture groups required.
 *
 * The tokens are the source of truth. Regex is a compilation target, never
 * something an author writes by hand in the metadata.
 */

const FULL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface LiteralToken {
  kind: "LITERAL";
  /** Must be uppercase A-Z / 0-9. */
  value: string;
}

interface DigitsToken {
  kind: "DIGITS";
  length: number;
}

interface CharsetToken {
  kind: "CHARSET";
  length: number;
  /** Explicit set of allowed characters, e.g. "BCDFGHJKLMNPRSTVWXYZ". */
  characters: string;
}

interface LettersToken {
  kind: "LETTERS";
  length: number;
  /** Letters removed from the full A-Z alphabet, e.g. ["I", "O", "U"]. */
  excluded?: string[];
}

export type Token = LiteralToken | DigitsToken | CharsetToken | LettersToken;

/** Fixed length in characters that a token consumes from the compact string. */
function tokenLength(token: Token): number {
  switch (token.kind) {
    case "LITERAL":
      return token.value.length;
    case "DIGITS":
    case "CHARSET":
    case "LETTERS":
      return token.length;
  }
}

/** The set of characters a non-literal token accepts (for LITERAL, its value). */
function tokenCharacters(token: Token): string {
  switch (token.kind) {
    case "LITERAL":
      return token.value;
    case "DIGITS":
      return "0123456789";
    case "CHARSET":
      return token.characters;
    case "LETTERS": {
      const excluded = new Set(token.excluded ?? []);
      return [...FULL_ALPHABET].filter((c) => !excluded.has(c)).join("");
    }
  }
}

/** Escape a string for safe use inside a regex character class. */
function escapeForClass(chars: string): string {
  return chars.replace(/[\\\]^-]/g, "\\$&");
}

/** Regex fragment (no anchors) matching exactly this token. */
function tokenRegex(token: Token): string {
  switch (token.kind) {
    case "LITERAL":
      return token.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    case "DIGITS":
      return `[0-9]{${token.length}}`;
    case "CHARSET":
    case "LETTERS":
      return `[${escapeForClass(tokenCharacters(token))}]{${tokenLength(token)}}`;
  }
}

export interface CompiledSegment {
  name: string;
  start: number;
  end: number;
}

export interface CompiledPattern {
  regex: RegExp;
  segments: CompiledSegment[];
  /** Total fixed length of the compact string this pattern accepts. */
  length: number;
}

/** A named segment: a token plus the component name it fills. */
export interface NamedToken {
  name: string;
  token: Token;
}

/**
 * Compile an ordered list of named tokens into a single anchored regex plus
 * the offsets needed to extract each segment.
 */
export function compilePattern(tokens: NamedToken[]): CompiledPattern {
  const segments: CompiledSegment[] = [];
  let offset = 0;
  let pattern = "";
  for (const { name, token } of tokens) {
    const len = tokenLength(token);
    segments.push({ name, start: offset, end: offset + len });
    pattern += tokenRegex(token);
    offset += len;
  }
  return {
    regex: new RegExp(`^${pattern}$`),
    segments,
    length: offset,
  };
}

/**
 * Extract each segment's substring from a compact string already known to
 * match the compiled pattern.
 */
export function extractComponents(
  compact: string,
  compiled: CompiledPattern,
): Record<string, string> {
  const components: Record<string, string> = {};
  for (const seg of compiled.segments) {
    components[seg.name] = compact.slice(seg.start, seg.end);
  }
  return components;
}
