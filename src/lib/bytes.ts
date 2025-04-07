/**
 * Estimates the size in bytes of a given value or expression.
 *
 * @param value - The value to estimate the size of.
 * @returns The estimated size in bytes.
 */
export const estimateBytes = (value: unknown): number => {
  try {
    const serialized = JSON.stringify(value);
    const bytes = new Blob([...serialized]).size; // Good enough
    return bytes < 10 ? 0 : bytes; // Ignore very small objects
  } catch (error) {
    return 0; // If it can't serialize just return 0, we don't care. React will throw the error at runtime
  }
};

/**
 * Formats a given number of bytes into a human-readable string with the specified number of decimal places.
 *
 * @param bytes - The number of bytes to format.
 * @param decimals - The number of decimal places to include in the formatted string. Defaults to 2.
 * @returns A string representing the formatted bytes in a human-readable format (e.g., "1.23 KB").
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedValue =
    i === 0 ? bytes / k ** i : (bytes / k ** i).toFixed(decimals);

  return `${formattedValue} ${sizes[i]}`;
};

/**
 * Parses a string representing a byte size and converts it to a number of bytes.
 *
 * @param input - The input string representing the byte size (e.g., "10KB", "5 MB").
 * @returns The number of bytes as a number.
 * @throws Will throw an error if the input format is invalid or if the unit is unsupported.
 */
export const parseBytes = (input: string): number => {
  const cleanedInput = input.trim().toUpperCase();

  // Regular expression to match number and unit
  const match = cleanedInput.match(/^(\d+(?:\.\d+)?)\s*([BKMGTPEZY]B?)$/);

  if (!match) {
    throw new Error(`Invalid byte format: ${input}`);
  }

  const value = Number.parseFloat(match[1]);
  const unit = match[2];
  const multipliers: { [key: string]: number } = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  // Handle different variations of units
  const normalizedUnit = unit === "B" ? "B" : unit.replace(/B$/, "B");

  const multiplier = multipliers[normalizedUnit];

  if (multiplier === undefined) {
    throw new Error(`Unsupported unit: ${unit}`);
  }

  return Math.round(value * multiplier);
};
