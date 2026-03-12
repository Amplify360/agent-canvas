import type { FlowStep } from './types';

export function linesToText(lines: string[]) {
  return lines.join('\n');
}

export function textToLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeOrderedFlowSteps(steps: FlowStep[]) {
  return [...steps]
    .sort((left, right) => left.order - right.order)
    .map((step, index) => ({
      ...step,
      order: index + 1,
      parallelGroup: normalizeOptionalString(step.parallelGroup ?? ''),
      groupLabel: normalizeOptionalString(step.groupLabel ?? ''),
    }));
}
