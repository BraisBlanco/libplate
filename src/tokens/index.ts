/**
 * A tiny, non-recursive token grammar for plate segments.
 *
 * Tokens are fixed-length or bounded variable-length (an explicit min/max
 * range, or an explicit list of positional arrangements). A pattern compiles
 * to a set of fixed-length "expansions" — one per combination of concrete
 * segment lengths — and each expansion is a single anchored regular
 * expression with no quantifier backtracking (no ReDoS) and deterministic
 * extraction by slicing at cumulative offsets.
 *
 * Compiling to expansions instead of variable-length capture groups keeps two
 * guarantees the engine is built on:
 *   - matching stays linear: every expansion is a fixed shape; and
 *   - a compact string that admits several segmentations (e.g. the German
 *     "BAB123" = B|AB|123 or BA|B|123) yields ALL of them, so the engine can
 *     report an honest ambiguity instead of an arbitrary regex-engine winner.
 *
 * The tokens are the source of truth. Regex is a compilation target, never
 * something an author writes by hand in the metadata.
 */

const FULL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Bounded variable length. Fixed length is expressed as a plain number. */
interface LengthRange {
  min: number;
  max: number;
}

/** A token's length: fixed, or a bounded range. */
type TokenLength = number | LengthRange;

interface LiteralToken {
  kind: "LITERAL";
  /** Must be uppercase A-Z / 0-9. */
  value: string;
}

interface DigitsToken {
  kind: "DIGITS";
  length: TokenLength;
  /** Reject a leading `0` (e.g. German Erkennungsnummern run 1-9999). */
  noLeadingZero?: boolean;
}

interface CharsetToken {
  kind: "CHARSET";
  length: TokenLength;
  /** Explicit set of allowed characters, e.g. "BCDFGHJKLMNPRSTVWXYZ". */
  characters: string;
}

interface LettersToken {
  kind: "LETTERS";
  length: TokenLength;
  /** Letters removed from the full A-Z alphabet, e.g. ["I", "O", "U"]. */
  excluded?: string[];
  /**
   * Whole-segment values this token must NOT equal, e.g. ["SS", "WW"] for the
   * French SIV. Each value must be a length the token can take, and applies to
   * the expansion of exactly that length — so ["CD"] on a 2-3 letter token
   * rejects the Finnish diplomatic "CD" without touching "CDE". Compiled to a
   * negative lookahead, so per-character rules (`excluded`) still apply.
   */
  excludedValues?: string[];
}

interface TableToken {
  kind: "TABLE";
  /**
   * The segment must equal one of these values (e.g. the German district
   * codes). Values may differ in length; each expansion pins one length, so
   * the compiled alternation is a fixed-width choice with no backtracking.
   */
  values: string[];
}

/** Constraint applied to each maximal run of `N` positions in a pattern. */
export type DigitBlockRule = "FREE" | "NO_LEADING_ZERO" | "NO_ZERO_BLOCK";

interface PatternsToken {
  kind: "PATTERNS";
  /**
   * Positional digit/letter arrangements, e.g. ["NNNNL", "NLNNN"]. In a
   * pattern `N` is a digit, `L` a letter from `letters`, and any other
   * character matches itself literally (e.g. the fixed `P` of Polish
   * professional plates). Patterns of the same length compile into one
   * fixed-shape alternation, so extraction by slicing still holds.
   */
  patterns: string[];
  /** Characters the `L` positions accept (defaults to the full A-Z alphabet). */
  letters?: string;
  /**
   * `NO_LEADING_ZERO` forbids `0` as the first digit of each digit run;
   * `NO_ZERO_BLOCK` forbids all-zero runs but allows leading zeros (Polish
   * serial ranges like 0001-9999). Default: `FREE`.
   */
  digitBlocks?: DigitBlockRule;
}

export type Token =
  LiteralToken | DigitsToken | CharsetToken | LettersToken | TableToken | PatternsToken;

/**
 * A cross-segment length restriction: the summed lengths of the named
 * segments must not exceed `max`. A list of rules is a disjunction — an
 * expansion is kept when AT LEAST ONE rule holds (e.g. the German Anlage 4
 * allows "total ≤ 7" OR "identifier ≤ 5" for H/E plates).
 */
export interface LengthRule {
  segments: string[];
  max: number;
}

/**
 * Upper bound on expansions per pattern. Generous for real schemes (the
 * German standard plate needs 24) while catching runaway metadata early.
 */
const MAX_EXPANSIONS = 64;

/** The concrete lengths a token can take, ascending, without duplicates. */
function tokenLengths(token: Token): number[] {
  switch (token.kind) {
    case "LITERAL":
      return [token.value.length];
    case "TABLE":
      return [...new Set(token.values.map((v) => v.length))].sort((a, b) => a - b);
    case "PATTERNS":
      return [...new Set(token.patterns.map((p) => p.length))].sort((a, b) => a - b);
    case "DIGITS":
    case "CHARSET":
    case "LETTERS": {
      const len = token.length;
      if (typeof len === "number") return [len];
      const lengths: number[] = [];
      for (let n = len.min; n <= len.max; n += 1) lengths.push(n);
      return lengths;
    }
  }
}

/** The set of characters a class-based token accepts. */
function tokenCharacters(token: CharsetToken | LettersToken): string {
  if (token.kind === "CHARSET") return token.characters;
  const excluded = new Set(token.excluded ?? []);
  return [...FULL_ALPHABET].filter((c) => !excluded.has(c)).join("");
}

/** Escape a string for safe use inside a regex character class. */
function escapeForClass(chars: string): string {
  return chars.replace(/[\\\]^-]/g, "\\$&");
}

/** Escape a literal string for safe use in a regex (outside a character class). */
function escapeLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Regex fragment for a run of `count` digits under a digit-block rule. */
function digitRunRegex(count: number, rule: DigitBlockRule): string {
  if (count === 1) return rule === "FREE" ? "[0-9]" : "[1-9]";
  switch (rule) {
    case "FREE":
      return `[0-9]{${count}}`;
    case "NO_LEADING_ZERO":
      return `[1-9][0-9]{${count - 1}}`;
    case "NO_ZERO_BLOCK":
      // Leading zeros are fine (Polish ranges run 0001-9999); only the
      // all-zero run is excluded. The lookahead is bounded — no backtracking.
      return `(?!0{${count}})[0-9]{${count}}`;
  }
}

/** Whether a pattern position is part of a digit run (`N` or a digit literal). */
function isDigitPosition(ch: string): boolean {
  return ch === "N" || (ch >= "0" && ch <= "9");
}

/**
 * Regex fragment for one maximal digit run that may mix `N` positions with
 * digit literals (e.g. the `1NN` of the French diplomatic country codes
 * 100-199). The digit-block rule sees the run as a whole: a literal first
 * digit satisfies (or violates) `NO_LEADING_ZERO` by itself, so only an `N`
 * in first position gets tightened to `[1-9]`.
 */
function mixedDigitRunRegex(run: string, rule: DigitBlockRule): string {
  if (!/\d/.test(run)) return digitRunRegex(run.length, rule);
  let out = "";
  for (let i = 0; i < run.length; i += 1) {
    const ch = run[i]!;
    if (ch !== "N") out += ch;
    else out += i === 0 && rule === "NO_LEADING_ZERO" ? "[1-9]" : "[0-9]";
  }
  // NO_ZERO_BLOCK only needs the lookahead when the literals alone don't
  // already rule the all-zero run out.
  if (rule === "NO_ZERO_BLOCK" && !/[1-9]/.test(run)) {
    out = `(?!0{${run.length}})${out}`;
  }
  return out;
}

/** Regex fragment (no anchors, fixed shape) for one positional pattern. */
function positionalPatternRegex(pattern: string, token: PatternsToken): string {
  const letterClass = `[${escapeForClass(token.letters ?? FULL_ALPHABET)}]`;
  const rule = token.digitBlocks ?? "FREE";
  let out = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (isDigitPosition(ch)) {
      let run = 0;
      while (i + run < pattern.length && isDigitPosition(pattern[i + run]!)) run += 1;
      out += mixedDigitRunRegex(pattern.slice(i, i + run), rule);
      i += run;
    } else if (ch === "L") {
      let run = 0;
      while (pattern[i + run] === "L") run += 1;
      out += run === 1 ? letterClass : `${letterClass}{${run}}`;
      i += run;
    } else {
      out += escapeLiteral(ch);
      i += 1;
    }
  }
  return out;
}

/**
 * Regex fragment for a character-class token (CHARSET/LETTERS) at one concrete
 * length, including the negative lookahead for whole-segment exclusions. Only
 * values of THIS expansion's length can equal the segment, so the lookahead
 * always lines up with the characters the class then consumes.
 */
function classTokenRegexAt(token: CharsetToken | LettersToken, length: number): string {
  const charClass = `[${escapeForClass(tokenCharacters(token))}]{${length}}`;
  if (token.kind === "CHARSET" || !token.excludedValues?.length) return charClass;
  const values = token.excludedValues.filter((v) => v.length === length);
  if (values.length === 0) return charClass;
  return `(?!(?:${values.map(escapeLiteral).join("|")}))${charClass}`;
}

/** Regex fragment (no anchors) matching this token at one concrete length. */
function tokenRegexAt(token: Token, length: number): string {
  switch (token.kind) {
    case "LITERAL":
      return escapeLiteral(token.value);
    case "TABLE": {
      const values = token.values.filter((v) => v.length === length);
      return `(?:${values.map(escapeLiteral).join("|")})`;
    }
    case "PATTERNS": {
      const patterns = token.patterns.filter((p) => p.length === length);
      return `(?:${patterns.map((p) => positionalPatternRegex(p, token)).join("|")})`;
    }
    case "DIGITS": {
      if (!token.noLeadingZero) return `[0-9]{${length}}`;
      return length === 1 ? "[1-9]" : `[1-9][0-9]{${length - 1}}`;
    }
    case "CHARSET":
    case "LETTERS":
      return classTokenRegexAt(token, length);
  }
}

interface CompiledSegment {
  name: string;
  start: number;
  end: number;
}

/** One fixed-length shape of a pattern: an anchored regex plus offsets. */
export interface CompiledExpansion {
  regex: RegExp;
  segments: CompiledSegment[];
  /** Total fixed length of the compact string this expansion accepts. */
  length: number;
}

export interface CompiledPattern {
  expansions: CompiledExpansion[];
  /** Shortest / longest compact string any expansion accepts. */
  minLength: number;
  maxLength: number;
}

/** A named segment: a token plus the component name it fills. */
export interface NamedToken {
  name: string;
  token: Token;
}

/** Whether at least one rule holds (or no rules were declared at all). */
function satisfiesLengthRules(
  lengths: Map<string, number>,
  rules: LengthRule[],
): boolean {
  if (rules.length === 0) return true;
  return rules.some((rule) => {
    const total = rule.segments.reduce((sum, name) => sum + (lengths.get(name) ?? 0), 0);
    return total <= rule.max;
  });
}

/** All combinations of per-token lengths, in stable order. */
function enumerateLengthCombos(tokens: NamedToken[]): number[][] {
  let combos: number[][] = [[]];
  for (const { token } of tokens) {
    const lengths = tokenLengths(token);
    combos = combos.flatMap((combo) => lengths.map((len) => [...combo, len]));
    if (combos.length > MAX_EXPANSIONS) {
      throw new Error(
        `Pattern expands to more than ${MAX_EXPANSIONS} fixed-length shapes.`,
      );
    }
  }
  return combos;
}

function buildExpansion(tokens: NamedToken[], combo: number[]): CompiledExpansion {
  const segments: CompiledSegment[] = [];
  let offset = 0;
  let pattern = "";
  tokens.forEach(({ name, token }, i) => {
    const len = combo[i]!;
    segments.push({ name, start: offset, end: offset + len });
    pattern += tokenRegexAt(token, len);
    offset += len;
  });
  return { regex: new RegExp(`^${pattern}$`), segments, length: offset };
}

/**
 * Compile an ordered list of named tokens into the set of fixed-length
 * expansions it admits. `lengthRules` prunes length combinations at compile
 * time (see {@link LengthRule}).
 */
export function compilePattern(
  tokens: NamedToken[],
  lengthRules: LengthRule[] = [],
): CompiledPattern {
  const expansions = enumerateLengthCombos(tokens)
    .filter((combo) => {
      const byName = new Map(tokens.map(({ name }, i) => [name, combo[i]!]));
      return satisfiesLengthRules(byName, lengthRules);
    })
    .map((combo) => buildExpansion(tokens, combo));
  if (expansions.length === 0) {
    throw new Error("Pattern admits no length combination under its length rules.");
  }
  const lengths = expansions.map((e) => e.length);
  return {
    expansions,
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
  };
}

/**
 * Extract each segment's substring from a compact string already known to
 * match the given expansion.
 */
export function extractComponents(
  compact: string,
  expansion: CompiledExpansion,
): Record<string, string> {
  const components: Record<string, string> = {};
  for (const seg of expansion.segments) {
    components[seg.name] = compact.slice(seg.start, seg.end);
  }
  return components;
}

/**
 * Every segmentation of `compact` the pattern admits. More than one entry
 * means the input is genuinely ambiguous at the token level; the engine
 * decides what to do with that (extra evidence, or an AMBIGUOUS result).
 */
export function matchAll(
  compact: string,
  compiled: CompiledPattern,
): Record<string, string>[] {
  if (compact.length < compiled.minLength || compact.length > compiled.maxLength) {
    return [];
  }
  return compiled.expansions
    .filter((e) => e.length === compact.length && e.regex.test(compact))
    .map((e) => extractComponents(compact, e));
}
