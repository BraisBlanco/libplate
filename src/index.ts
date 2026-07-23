/**
 * libplate — format validation, parsing and structured analysis of European
 * vehicle registration plates.
 *
 * IMPORTANT: this library validates known plate *formats* and extracts the
 * information encoded in them. It cannot prove that a plate has been issued,
 * is currently assigned, belongs to the observed vehicle, or has not been
 * forged. That requires authorized access to administrative registries.
 */

export {
  parse,
  validate,
  format,
  detect,
  getSupportedCountries,
  getSupportedSchemes,
  getMetadataVersion,
  getLibraryVersion,
} from "./engine/index.js";

export type * from "./model/index.js";
