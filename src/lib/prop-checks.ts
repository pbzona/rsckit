import { estimateBytes, formatBytes, parseBytes } from './bytes';

export type BasicProp = {
  name: string;
  value: any;
};

// For checking whether a prop meets a certain condition
// () => true; the condition is met, etc.
export type PropCheckFunction = (
  prop: BasicProp,
  componentName: string,
  comparisonValue?: unknown
) => boolean | Promise<boolean>;

// Return the result and message to return for further processing
export type PropCheckResult = {
  result: boolean;
  message: string;
};

// Utility functions - ONLY EXPORT NAMED FUNCTIONS!!! (might need Function.name in the future)
// Check if a prop's value is larger than the optional comparison value, default 100 bytes
export function isPropLarge(
  prop: BasicProp,
  componentName: string,
  comparisonValue: string | number = "100B"
) {
  const sizeInBytes = estimateBytes(prop.value);
  const maxSize = typeof comparisonValue === "string" ? parseBytes(comparisonValue) : comparisonValue;
  const result = sizeInBytes > maxSize;

  return {
    result,
    message: result ? `${componentName}#${prop.name}: ${formatBytes(sizeInBytes)}` : null
  };
};
