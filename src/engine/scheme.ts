import type {
  RegistrationInference,
  SchemeCandidate,
  SchemeMatch,
  VehicleCategoryInference,
  VisualExpectation,
} from "../model/index.js";
import {
  compilePattern,
  extractComponents,
  type CompiledPattern,
} from "../tokens/index.js";
import { segmentToNamedToken, type PlateScheme } from "../metadata/types.js";

const compiledCache = new WeakMap<PlateScheme, CompiledPattern>();

function compiled(scheme: PlateScheme): CompiledPattern {
  let c = compiledCache.get(scheme);
  if (!c) {
    c = compilePattern(scheme.segments.map(segmentToNamedToken));
    compiledCache.set(scheme, c);
  }
  return c;
}

/** Extract components if the compact string matches the scheme, else null. */
export function matchScheme(
  scheme: PlateScheme,
  compact: string,
): Record<string, string> | null {
  const c = compiled(scheme);
  if (!c.regex.test(compact)) return null;
  return extractComponents(compact, c);
}

/** Fill a `{placeholder}` template from extracted components. */
export function applyFormat(
  template: string,
  components: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => components[name] ?? "");
}

/**
 * Whether a scheme is active on the given ISO date. ISO `YYYY-MM-DD` strings
 * compare correctly with lexical `<`/`>`. No date means "don't filter".
 */
export function isActiveOn(scheme: PlateScheme, referenceDate?: string): boolean {
  if (!referenceDate) return true;
  if (scheme.validFrom && referenceDate < scheme.validFrom) return false;
  if (scheme.validTo && referenceDate > scheme.validTo) return false;
  return true;
}

export function buildSchemeMatch(
  scheme: PlateScheme,
  components: Record<string, string>,
): SchemeMatch {
  const match: SchemeMatch = {
    id: scheme.id,
    country: scheme.country,
    name: scheme.name,
    sourceRefs: scheme.sources.map((s) => (s.section ? `${s.id} (${s.section})` : s.id)),
    components,
  };
  if (scheme.validFrom) match.validFrom = scheme.validFrom;
  if (scheme.validTo) match.validTo = scheme.validTo;
  return match;
}

export function buildCandidate(
  scheme: PlateScheme,
  components: Record<string, string>,
): SchemeCandidate {
  return {
    country: scheme.country,
    scheme: scheme.id,
    name: scheme.name,
    formatted: applyFormat(scheme.formats.national, components),
    components,
  };
}

export function buildRegistrationInference(scheme: PlateScheme): RegistrationInference {
  const type = scheme.registrationType;
  return {
    type,
    temporary:
      type === "TEMPORARY_PRIVATE" ||
      type === "TEMPORARY_COMPANY" ||
      type === "TEMPORARY_WW" ||
      type === "PROFESSIONAL_TEMPORARY",
    diplomatic:
      type === "DIPLOMATIC" ||
      type === "CONSULAR" ||
      type === "INTERNATIONAL_ORGANIZATION",
    // The text alone can never rule historical status in or out, so anything
    // not explicitly flagged historical reports `null` = "not determinable".
    historical: scheme.historical ? true : null,
  };
}

export function buildVehicleInference(scheme: PlateScheme): VehicleCategoryInference {
  const vi = scheme.vehicleInference;
  const result: VehicleCategoryInference = {
    inferenceLevel: vi.level,
    evidence: vi.evidence ?? [],
  };
  if (vi.category) result.category = vi.category;
  if (vi.possibleCategories) result.possibleCategories = vi.possibleCategories;
  return result;
}

export function buildVisual(scheme: PlateScheme): VisualExpectation | undefined {
  return scheme.visual;
}
