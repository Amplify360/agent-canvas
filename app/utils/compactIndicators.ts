import {
  COMPACT_CARD_INDICATOR,
  COMPACT_CARD_INDICATOR_OPTIONS,
  type CompactCardIndicator,
} from '@/types/validationConstants';

export const DEFAULT_COMPACT_CARD_INDICATORS: CompactCardIndicator[] = [
  COMPACT_CARD_INDICATOR.TOOLS,
];

const VALID_INDICATORS = new Set<string>(Object.values(COMPACT_CARD_INDICATOR));

export function normalizeCompactCardIndicators(indicators?: string[] | null): CompactCardIndicator[] {
  if (!indicators || indicators.length === 0) {
    return DEFAULT_COMPACT_CARD_INDICATORS;
  }

  const normalized: CompactCardIndicator[] = [];
  const seen = new Set<string>();

  for (const indicator of indicators) {
    if (!VALID_INDICATORS.has(indicator) || seen.has(indicator)) {
      continue;
    }
    seen.add(indicator);
    normalized.push(indicator as CompactCardIndicator);
    if (normalized.length === 2) {
      break;
    }
  }

  return normalized.length > 0 ? normalized : DEFAULT_COMPACT_CARD_INDICATORS;
}

export function getCompactCardIndicatorLabel(indicator: CompactCardIndicator): string {
  return COMPACT_CARD_INDICATOR_OPTIONS.find((option) => option.value === indicator)?.label ?? indicator;
}
