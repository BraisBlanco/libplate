import type {
  CountryCode,
  Evidence,
  InferenceLevel,
  RegistrationType,
  VehicleCategory,
  VisualExpectation,
} from "../model/index.js";
import type { LengthRule, NamedToken, Token } from "../tokens/index.js";

/** Length as authored in the YAML: fixed (`length`) or bounded (`min`/`max`). */
interface AuthoredLength {
  length?: number;
  minLength?: number;
  maxLength?: number;
}

/** A segment as authored in the YAML metadata (mirrors the token grammar). */
export type MetadataSegment =
  | { name: string; type: "LITERAL"; value: string }
  | ({ name: string; type: "DIGITS"; noLeadingZero?: boolean } & AuthoredLength)
  | ({ name: string; type: "CHARSET"; characters: string } & AuthoredLength)
  | ({
      name: string;
      type: "LETTERS";
      excluded?: string[];
      excludedValues?: string[];
    } & AuthoredLength)
  | { name: string; type: "TABLE"; table: string };

export interface SchemeVehicleInference {
  level: InferenceLevel;
  category?: VehicleCategory;
  possibleCategories?: VehicleCategory[];
  evidence?: Evidence[];
}

export interface SchemeSource {
  id: string;
  section?: string;
}

export interface SchemeExamples {
  valid: string[];
  invalid: string[];
}

export interface SchemeNormalization {
  uppercase: boolean;
  acceptedSeparators: string[];
}

/** Cross-segment length restrictions; see {@link LengthRule} for semantics. */
export interface SchemeLengthRules {
  /** Disjunction: a length combination is valid when at least one rule holds. */
  anyOf: LengthRule[];
}

/** A fully-resolved plate scheme, the canonical unit the engine consumes. */
export interface PlateScheme {
  schemaVersion: number;
  id: string;
  country: CountryCode;
  name: string;
  registrationType: RegistrationType;
  /**
   * Whether this is a legacy/superseded series. Legacy series are opt-in in
   * country-less detection (they inflate cross-country ambiguity). This is NOT
   * the historical-vehicle regime — that is `registrationType: "HISTORICAL"`,
   * surfaced to callers as `registration.historical`.
   */
  legacySeries: boolean;
  validFrom?: string;
  validTo?: string;
  vehicleInference: SchemeVehicleInference;
  normalization: SchemeNormalization;
  segments: MetadataSegment[];
  lengthRules?: SchemeLengthRules;
  formats: { national: string; compact: string };
  visual?: VisualExpectation;
  sources: SchemeSource[];
  examples: SchemeExamples;
}

/** The canonical metadata bundle embedded into the runtime. */
export interface MetadataBundle {
  metadataVersion: string;
  /** Named value tables referenced by TABLE segments (e.g. district codes). */
  tables: Record<string, string[]>;
  schemes: PlateScheme[];
}

/** Authored length → token length range. The build step guarantees one form. */
function toTokenLength(segment: AuthoredLength): { min: number; max: number } {
  if (segment.length !== undefined) return { min: segment.length, max: segment.length };
  return { min: segment.minLength ?? 1, max: segment.maxLength ?? 1 };
}

/** Convert an authored segment into a named grammar token. */
export function segmentToNamedToken(
  segment: MetadataSegment,
  tables: Record<string, string[]> = {},
): NamedToken {
  switch (segment.type) {
    case "LITERAL":
      return { name: segment.name, token: { kind: "LITERAL", value: segment.value } };
    case "DIGITS": {
      const token: Extract<Token, { kind: "DIGITS" }> = {
        kind: "DIGITS",
        length: toTokenLength(segment),
      };
      if (segment.noLeadingZero) token.noLeadingZero = true;
      return { name: segment.name, token };
    }
    case "CHARSET":
      return {
        name: segment.name,
        token: {
          kind: "CHARSET",
          length: toTokenLength(segment),
          characters: segment.characters,
        },
      };
    case "LETTERS": {
      const token: Extract<Token, { kind: "LETTERS" }> = {
        kind: "LETTERS",
        length: toTokenLength(segment),
      };
      if (segment.excluded) token.excluded = segment.excluded;
      if (segment.excludedValues) token.excludedValues = segment.excludedValues;
      return { name: segment.name, token };
    }
    case "TABLE": {
      const values = tables[segment.table];
      if (!values) {
        throw new Error(`Unknown table "${segment.table}" (segment "${segment.name}").`);
      }
      return { name: segment.name, token: { kind: "TABLE", values } };
    }
  }
}
