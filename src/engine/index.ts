import type {
  CountryCode,
  ParseOptions,
  PlateValidationResult,
  SchemeCandidate,
  ValidationError,
  ValidationReason,
  VersionInfo,
} from "../model/index.js";
import { METADATA } from "../generated/metadata.js";
import type { PlateScheme } from "../metadata/types.js";
import { LIBRARY_VERSION } from "../version.js";
import { hasOnlyAllowedCharacters, MAX_RAW_LENGTH, normalize } from "./normalize.js";
import {
  applyFormat,
  buildCandidate,
  buildRegistrationInference,
  buildSchemeMatch,
  buildVehicleInference,
  buildVisual,
  isActiveOn,
  matchScheme,
} from "./scheme.js";

const VERSIONS: VersionInfo = {
  library: LIBRARY_VERSION,
  metadata: METADATA.metadataVersion,
};

/** The fields every result shares, built once per call. */
type ResultBase = Pick<PlateValidationResult, "input" | "warnings" | "versions">;

/** A scheme that matched the input, with its extracted components. */
interface MatchEntry {
  scheme: PlateScheme;
  components: Record<string, string>;
}

function error(reason: ValidationReason, message: string): ValidationError {
  return { reason, message };
}

/** Schemes to consider, given the caller's options. */
function selectSchemes(opts: ParseOptions): PlateScheme[] {
  let schemes = METADATA.schemes;
  if (opts.country) {
    const country = opts.country.toUpperCase();
    schemes = schemes.filter((s) => s.country === country);
  } else if (!opts.includeHistorical) {
    // Historical schemes greatly increase cross-country ambiguity, so they are
    // opt-in when detecting without a country hint.
    schemes = schemes.filter((s) => !s.historical);
  }
  return schemes.filter((s) => isActiveOn(s, opts.referenceDate));
}

/** Input-level rejections that short-circuit before scheme matching. */
function rejectInput(base: ResultBase, opts: ParseOptions): PlateValidationResult | null {
  const { raw, compact } = base.input;
  if (raw.trim().length === 0) {
    return {
      ...base,
      status: "INVALID",
      errors: [error("EMPTY_INPUT", "Input is empty.")],
    };
  }
  if (raw.length > MAX_RAW_LENGTH) {
    return {
      ...base,
      status: "INVALID",
      errors: [error("TOO_LONG", `Input exceeds ${MAX_RAW_LENGTH} characters.`)],
    };
  }
  if (!hasOnlyAllowedCharacters(compact)) {
    return {
      ...base,
      status: "INVALID",
      errors: [
        error("INVALID_CHARACTERS", "Input contains characters outside A-Z and 0-9."),
      ],
    };
  }
  if (opts.country) {
    const country = opts.country.toUpperCase();
    if (!METADATA.schemes.some((s) => s.country === country)) {
      return {
        ...base,
        status: "UNSUPPORTED",
        country,
        errors: [error("UNSUPPORTED_COUNTRY", `Country "${country}" is not supported.`)],
      };
    }
  }
  return null;
}

function buildNoMatch(base: ResultBase, opts: ParseOptions): PlateValidationResult {
  return {
    ...base,
    status: "INVALID",
    ...(opts.country ? { country: opts.country.toUpperCase() } : {}),
    errors: [error("INVALID_STRUCTURE", "Input does not match any known plate scheme.")],
  };
}

function buildMatch(base: ResultBase, entry: MatchEntry): PlateValidationResult {
  const { scheme, components } = entry;
  const visual = buildVisual(scheme);
  return {
    ...base,
    status: "VALID",
    country: scheme.country,
    normalized: base.input.compact,
    formatted: applyFormat(scheme.formats.national, components),
    scheme: buildSchemeMatch(scheme, components),
    registration: buildRegistrationInference(scheme),
    vehicle: buildVehicleInference(scheme),
    ...(visual ? { visual } : {}),
    errors: [],
  };
}

function buildAmbiguous(base: ResultBase, matches: MatchEntry[]): PlateValidationResult {
  // More than one scheme matched: report an audited ambiguity, never guess.
  const candidates: SchemeCandidate[] = matches.map((m) =>
    buildCandidate(m.scheme, m.components),
  );
  const distinctCountries = new Set(candidates.map((c) => c.country));
  const reason: ValidationReason =
    distinctCountries.size > 1 ? "AMBIGUOUS_COUNTRY" : "AMBIGUOUS_SCHEME";
  return {
    ...base,
    status: "AMBIGUOUS",
    normalized: base.input.compact,
    candidates,
    errors: [
      error(
        reason,
        `Input matches ${candidates.length} schemes; more evidence is required to resolve it.`,
      ),
    ],
  };
}

/**
 * Parse and validate a plate. This is the primary entry point; everything else
 * is a thin convenience over it.
 */
export function parse(input: string, opts: ParseOptions = {}): PlateValidationResult {
  const base: ResultBase = { input: normalize(input), warnings: [], versions: VERSIONS };

  const rejection = rejectInput(base, opts);
  if (rejection) return rejection;

  const matches: MatchEntry[] = [];
  for (const scheme of selectSchemes(opts)) {
    const components = matchScheme(scheme, base.input.compact);
    if (components) matches.push({ scheme, components });
  }

  if (matches.length === 0) return buildNoMatch(base, opts);
  if (matches.length === 1) return buildMatch(base, matches[0]!);
  return buildAmbiguous(base, matches);
}

/**
 * Convenience boolean: whether the input is a valid plate format. `parse`
 * remains the primary API when you need the reason, scheme or inferences.
 */
export function validate(input: string, opts: ParseOptions = {}): boolean {
  return parse(input, opts).status === "VALID";
}

/** National-format string if the input is valid, otherwise `null`. */
export function format(input: string, opts: ParseOptions = {}): string | null {
  const result = parse(input, opts);
  return result.status === "VALID" ? (result.formatted ?? null) : null;
}

/** Detect candidate schemes without a country hint. */
export function detect(
  input: string,
  opts: Omit<ParseOptions, "country"> = {},
): PlateValidationResult {
  return parse(input, opts);
}

/** Country codes with at least one supported scheme. */
export function getSupportedCountries(): CountryCode[] {
  return [...new Set(METADATA.schemes.map((s) => s.country))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Supported scheme ids, optionally filtered by country. */
export function getSupportedSchemes(country?: CountryCode): string[] {
  const upper = country?.toUpperCase();
  return METADATA.schemes
    .filter((s) => (upper ? s.country === upper : true))
    .map((s) => s.id)
    .sort((a, b) => a.localeCompare(b));
}

export function getMetadataVersion(): string {
  return METADATA.metadataVersion;
}

export function getLibraryVersion(): string {
  return LIBRARY_VERSION;
}
