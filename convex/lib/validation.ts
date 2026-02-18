/**
 * Input validation helpers for Convex functions
 * Convex validators handle type checking; these handle business rules
 */

import { VALIDATION_CONSTANTS } from "../../app/types/validationConstants";
import { COMPACT_INDICATOR } from "./validators";

/**
 * Validate metric value is non-negative
 */
export function validateMetric(value: number, fieldName: string): void {
  if (value < VALIDATION_CONSTANTS.METRIC_MIN_VALUE) {
    throw new Error(`Validation: ${fieldName} must be ${VALIDATION_CONSTANTS.METRIC_MIN_VALUE} or greater`);
  }
}

/**
 * Validate metrics object if present
 */
export function validateMetrics(
  metrics?: {
    numberOfUsers?: number;
    timesUsed?: number;
    timeSaved?: number;
    roi?: number;
  }
): void {
  if (!metrics) return;
  if (metrics.numberOfUsers !== undefined) validateMetric(metrics.numberOfUsers, "numberOfUsers");
  if (metrics.timesUsed !== undefined) validateMetric(metrics.timesUsed, "timesUsed");
  if (metrics.timeSaved !== undefined) validateMetric(metrics.timeSaved, "timeSaved");
  // roi can be negative (loss), so no validation needed
}

/**
 * Validate non-empty string
 */
export function validateNonEmptyString(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`Validation: ${fieldName} cannot be empty`);
  }
}

/**
 * Validate slug format: lowercase alphanumeric with hyphens, 1-100 chars
 * Pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/
 */
export function validateSlug(slug: string): void {
  validateNonEmptyString(slug, "slug");

  if (slug !== slug.toLowerCase()) {
    throw new Error("Validation: slug must be lowercase");
  }

  if (slug.length > 100) {
    throw new Error("Validation: slug must be 100 characters or less");
  }

  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    throw new Error(
      "Validation: slug must contain only lowercase letters, numbers, and hyphens (no leading/trailing/consecutive hyphens)"
    );
  }
}

/**
 * Validate string with max length
 */
function validateStringLength(
  value: string,
  fieldName: string,
  maxLength: number
): void {
  validateNonEmptyString(value, fieldName);
  if (value.length > maxLength) {
    throw new Error(
      `Validation: ${fieldName} must be ${maxLength} characters or less`
    );
  }
}

/**
 * Validate canvas title (max chars from shared constants)
 */
export function validateTitle(title: string): void {
  validateStringLength(title, "title", VALIDATION_CONSTANTS.CANVAS_TITLE_MAX_LENGTH);
}

/**
 * Validate optional canvas description (max chars from shared constants)
 */
export function validateCanvasDescription(description: string | undefined): void {
  validateOptionalStringField(
    description,
    "description",
    VALIDATION_CONSTANTS.CANVAS_DESCRIPTION_MAX_LENGTH
  );
}

/**
 * Validate compact card indicator configuration
 */
export function validateCompactIndicators(indicators: string[] | undefined): void {
  if (indicators === undefined) return;

  if (indicators.length === 0) {
    throw new Error("Validation: compactIndicators must include at least one entry");
  }

  if (indicators.length > 2) {
    throw new Error("Validation: compactIndicators can include at most two entries");
  }

  const validIndicators = new Set<string>(Object.values(COMPACT_INDICATOR));
  const uniqueIndicators = new Set<string>();

  for (const indicator of indicators) {
    if (!validIndicators.has(indicator)) {
      throw new Error(`Validation: Invalid compact indicator '${indicator}'`);
    }
    if (uniqueIndicators.has(indicator)) {
      throw new Error(`Validation: Duplicate compact indicator '${indicator}'`);
    }
    uniqueIndicators.add(indicator);
  }
}

/**
 * Validate agent name (max chars from shared constants)
 */
export function validateAgentName(name: string): void {
  validateStringLength(name, "name", VALIDATION_CONSTANTS.AGENT_NAME_MAX_LENGTH);
}

/**
 * Validate phase name (max chars from shared constants)
 */
export function validatePhase(phase: string): void {
  validateStringLength(phase, "phase", VALIDATION_CONSTANTS.PHASE_MAX_LENGTH);
}

/**
 * Validate optional string field with max length
 */
function validateOptionalStringField(
  value: string | undefined,
  fieldName: string,
  maxLength: number
): void {
  if (!value?.trim()) return;
  if (value.length > maxLength) {
    throw new Error(
      `Validation: ${fieldName} must be ${maxLength} characters or less`
    );
  }
}

/**
 * Validate optional objective (max chars from shared constants)
 */
export function validateObjective(objective: string | undefined): void {
  validateOptionalStringField(objective, "objective", VALIDATION_CONSTANTS.AGENT_OBJECTIVE_MAX_LENGTH);
}

/**
 * Validate optional description (max chars from shared constants)
 */
export function validateDescription(description: string | undefined): void {
  validateOptionalStringField(description, "description", VALIDATION_CONSTANTS.AGENT_DESCRIPTION_MAX_LENGTH);
}

/**
 * Validate URL format (optional field)
 */
export function validateOptionalUrl(
  url: string | undefined,
  fieldName: string
): void {
  if (!url) return;
  if (url.length > VALIDATION_CONSTANTS.URL_MAX_LENGTH) {
    throw new Error(`Validation: ${fieldName} must be ${VALIDATION_CONSTANTS.URL_MAX_LENGTH} characters or less`);
  }
  // Allow "#" as a placeholder for missing URLs
  if (url === "#") return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid_protocol");
    }
  } catch {
    throw new Error(`Validation: ${fieldName} must be a valid URL`);
  }
}

/**
 * Validate all agent data fields present in a record.
 * Validates only the fields that are present, so works for both create and partial data.
 */
export function validateAgentData(data: Record<string, unknown>): void {
  if (typeof data.name === 'string') validateAgentName(data.name);
  if (typeof data.phase === 'string') validatePhase(data.phase);
  if (typeof data.objective === 'string') validateObjective(data.objective);
  if (typeof data.description === 'string') validateDescription(data.description);
  if (data.metrics && typeof data.metrics === 'object') {
    validateMetrics(data.metrics as {
      numberOfUsers?: number;
      timesUsed?: number;
      timeSaved?: number;
      roi?: number;
    });
  }
  if (typeof data.demoLink === 'string') validateOptionalUrl(data.demoLink, "demoLink");
  if (typeof data.videoLink === 'string') validateOptionalUrl(data.videoLink, "videoLink");
}
