import {
  estimateJsonBytes,
  formatBytes,
  parseBytes,
  type JsonEstimate,
} from "./bytes";

export interface BasicProp {
  name: string;
  value: unknown;
}
export interface PropCheckResult {
  result: boolean;
  message: string | null;
  estimate: JsonEstimate;
}
export type PropCheckFunction = (
  prop: BasicProp,
  componentName: string,
  comparisonValue?: string | number,
) => PropCheckResult;

export function isPropLarge(
  prop: BasicProp,
  componentName: string,
  comparisonValue: string | number = "100B",
): PropCheckResult {
  const estimate = estimateJsonBytes(prop.value);
  const threshold =
    typeof comparisonValue === "string"
      ? parseBytes(comparisonValue)
      : comparisonValue;
  if (!Number.isFinite(threshold) || threshold < 0)
    throw new Error("Prop threshold must be a finite nonnegative byte count");
  const result = estimate.bytes !== null && estimate.bytes > threshold;
  return {
    result,
    estimate,
    message:
      estimate.bytes === null
        ? `${componentName}#${prop.name}: JSON estimate unavailable (${estimate.reason})`
        : result
          ? `${componentName}#${prop.name}: ${formatBytes(estimate.bytes)} JSON UTF-8 estimate`
          : null,
  };
}
