/**
 * Public types for libplate.
 *
 * These types are the stable contract of the library. Localized human-readable
 * messages may change; the string codes in {@link ValidationReason} and the
 * enum members below should not change without a major version bump.
 */

/** ISO 3166-1 alpha-2 country code, e.g. "ES". */
// eslint-disable-next-line sonarjs/redundant-type-aliases -- intentional domain vocabulary
export type CountryCode = string;

/** Overall outcome of a validation. */
export type ValidationStatus =
  "VALID" | "INVALID" | "AMBIGUOUS" | "POSSIBLE" | "UNSUPPORTED";

/**
 * Stable machine-readable reason codes. Intended to be exhaustive enough to
 * drive UI logic without parsing human messages.
 */
export type ValidationReason =
  | "VALID"
  | "EMPTY_INPUT"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_CHARACTERS"
  | "INVALID_LENGTH"
  | "INVALID_STRUCTURE"
  | "INVALID_PREFIX"
  | "INVALID_SEQUENCE"
  | "OUTSIDE_VALIDITY_PERIOD"
  | "AMBIGUOUS_COUNTRY"
  | "AMBIGUOUS_SCHEME"
  | "AMBIGUOUS_SEGMENTATION"
  | "UNSUPPORTED_COUNTRY"
  | "UNSUPPORTED_SCHEME"
  | "VISUAL_EVIDENCE_REQUIRED"
  | "REGISTRY_CHECK_REQUIRED";

/** Registration regime — NOT the vehicle category. */
export type RegistrationType =
  | "ORDINARY"
  | "TEMPORARY_PRIVATE"
  | "TEMPORARY_COMPANY"
  | "TEMPORARY_WW"
  | "PROFESSIONAL_TEMPORARY"
  | "DIPLOMATIC"
  | "CONSULAR"
  | "INTERNATIONAL_ORGANIZATION"
  | "DIPLOMATIC_STAFF"
  | "TOURIST"
  | "HISTORICAL"
  | "EXPORT"
  | "STATE_OR_MILITARY"
  | "SPECIAL"
  | "UNKNOWN";

/**
 * Broad vehicle categories. Deliberately wide: many schemes cannot narrow
 * further from text alone, and regulatory terminology groups categories in
 * ways that do not map to a single "car / motorbike" split.
 */
export type VehicleCategory =
  | "PASSENGER_CAR"
  | "MOTORCYCLE"
  | "MOPED_OR_MOTOR_CYCLE"
  | "TRICYCLE"
  | "QUADRICYCLE"
  | "VAN"
  | "TRUCK"
  | "BUS"
  | "TRAILER"
  | "SEMITRAILER"
  | "TRAILER_OR_SEMITRAILER"
  | "SPECIAL_VEHICLE"
  | "AGRICULTURAL_VEHICLE"
  | "INDUSTRIAL_MACHINE"
  | "UNKNOWN_MOTOR_VEHICLE"
  | "OTHER";

/** How confident we can be about an inferred vehicle category. */
export type InferenceLevel =
  | "DETERMINISTIC"
  | "CATEGORY_ONLY"
  | "VISUAL_EVIDENCE_REQUIRED"
  | "REGISTRY_REQUIRED"
  | "NOT_INFERABLE";

/** A single piece of evidence that supported an inference. */
export type Evidence =
  | { type: "PREFIX"; value: string }
  | { type: "PATTERN"; value: string }
  | { type: "COUNTRY_HINT"; value: string }
  | { type: "EU_COUNTRY_CODE"; value: string }
  | { type: "DATE_RANGE"; value: string };

export interface RegistrationInference {
  type: RegistrationType;
  temporary: boolean;
  diplomatic: boolean;
  /** `null` means "cannot be determined from text alone". */
  historical: boolean | null;
}

export interface VehicleCategoryInference {
  category?: VehicleCategory;
  possibleCategories?: VehicleCategory[];
  inferenceLevel: InferenceLevel;
  evidence: Evidence[];
}

export type PlateColor =
  "WHITE" | "BLACK" | "RED" | "BLUE" | "GREEN" | "YELLOW" | "PINK" | "ORANGE";

/**
 * Expected visual appearance for a scheme. Informational in v1: the library
 * does not yet validate observed plate appearance, it only reports what the
 * regulation prescribes.
 */
export interface VisualExpectation {
  background?: PlateColor;
  foreground?: PlateColor;
}

/** The matched scheme and the values extracted from each of its segments. */
export interface SchemeMatch {
  id: string;
  country: CountryCode;
  name: string;
  validFrom?: string;
  validTo?: string;
  /** Segment name -> extracted substring, e.g. { serial: "1234", series: "BCD" }. */
  components: Record<string, string>;
}

/** A candidate scheme when the country is not known up front. */
export interface SchemeCandidate {
  country: CountryCode;
  scheme: string;
  name: string;
  formatted: string;
  components: Record<string, string>;
}

/** The various representations of the input we keep around. */
export interface InputRepresentations {
  /** Exactly what the caller passed in. */
  raw: string;
  /** Uppercased, accepted separators and whitespace removed. Used for matching. */
  compact: string;
}

export interface ValidationError {
  reason: ValidationReason;
  message: string;
}

export interface VersionInfo {
  library: string;
  metadata: string;
}

/** The rich result returned by {@link parse}. */
export interface PlateValidationResult {
  status: ValidationStatus;
  input: InputRepresentations;
  country?: CountryCode;
  normalized?: string;
  formatted?: string;
  scheme?: SchemeMatch;
  candidates?: SchemeCandidate[];
  registration?: RegistrationInference;
  vehicle?: VehicleCategoryInference;
  visual?: VisualExpectation;
  warnings: string[];
  errors: ValidationError[];
  versions: VersionInfo;
}

/** Options accepted by the public API functions. */
export interface ParseOptions {
  /** Restrict validation to a single country, e.g. "ES". */
  country?: CountryCode;
  /**
   * Reference date (ISO YYYY-MM-DD) used to filter schemes by their validity
   * period. When omitted, schemes are matched regardless of period.
   *
   * A value that is not an ISO calendar date is ignored — filtering is skipped
   * entirely — and reported in {@link PlateValidationResult.warnings}. It is
   * never treated as a date, because comparison is lexical and a malformed
   * value would silently act as a far-future one.
   */
  referenceDate?: string;
  /**
   * Include schemes flagged as historical when detecting without a country.
   * Historical schemes greatly increase cross-country ambiguity, so they are
   * opt-in for detection. Defaults to `false`.
   */
  includeHistorical?: boolean;
}
