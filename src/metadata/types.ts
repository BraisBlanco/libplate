import type {
  CountryCode,
  Evidence,
  InferenceLevel,
  RegistrationType,
  VehicleCategory,
  VisualExpectation,
} from "../model/index.js";
import type { NamedToken } from "../tokens/index.js";

/** A segment as authored in the YAML metadata (mirrors the token grammar). */
export type MetadataSegment =
  | { name: string; type: "LITERAL"; value: string }
  | { name: string; type: "DIGITS"; length: number }
  | { name: string; type: "CHARSET"; length: number; characters: string }
  | { name: string; type: "LETTERS"; length: number; excluded?: string[] };

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
  /** Whether this scheme denotes a historically-registered plate. */
  historical: boolean;
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
    case "LETTERS":
      return {
        name: segment.name,
        token: segment.excluded
          ? { kind: "LETTERS", length: segment.length, excluded: segment.excluded }
          : { kind: "LETTERS", length: segment.length },
      };
  }
}
