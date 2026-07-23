import type {
  CountryCode,
  Evidence,
  InferenceLevel,
  RegistrationType,
  VehicleCategory,
  VisualExpectation,
} from "../model/index.js";
import type { NamedToken, Token } from "../tokens/index.js";

/** A segment as authored in the YAML metadata (mirrors the token grammar). */
export type MetadataSegment =
  | { name: string; type: "LITERAL"; value: string }
  | { name: string; type: "DIGITS"; length: number }
  | { name: string; type: "CHARSET"; length: number; characters: string }
  | {
      name: string;
      type: "LETTERS";
      length: number;
      excluded?: string[];
      excludedValues?: string[];
    };

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
  formats: { national: string; compact: string };
  visual?: VisualExpectation;
  sources: SchemeSource[];
  examples: SchemeExamples;
}

/** The canonical metadata bundle embedded into the runtime. */
export interface MetadataBundle {
  metadataVersion: string;
  schemes: PlateScheme[];
}

/** Convert an authored segment into a named grammar token. */
export function segmentToNamedToken(segment: MetadataSegment): NamedToken {
  switch (segment.type) {
    case "LITERAL":
      return { name: segment.name, token: { kind: "LITERAL", value: segment.value } };
    case "DIGITS":
      return { name: segment.name, token: { kind: "DIGITS", length: segment.length } };
    case "CHARSET":
      return {
        name: segment.name,
        token: {
          kind: "CHARSET",
          length: segment.length,
          characters: segment.characters,
        },
      };
    case "LETTERS": {
      const token: Extract<Token, { kind: "LETTERS" }> = {
        kind: "LETTERS",
        length: segment.length,
      };
      if (segment.excluded) token.excluded = segment.excluded;
      if (segment.excludedValues) token.excludedValues = segment.excludedValues;
      return { name: segment.name, token };
    }
  }
}
