export type JsonEstimate =
  | { method: "json-utf8"; bytes: number; reason: null }
  | { method: "json-utf8"; bytes: null; reason: string };

/** JSON UTF-8 estimate for plain data. This does not measure React Flight. */
export function estimateJsonBytes(value: unknown): JsonEstimate {
  const ancestors = new WeakSet<object>();
  function validate(item: unknown): void {
    if (item === null || typeof item === "string" || typeof item === "boolean")
      return;
    if (typeof item === "number" && Number.isFinite(item)) return;
    if (typeof item !== "object" || !item)
      throw new Error("Value is not plain JSON data");
    if (ancestors.has(item))
      throw new Error("Circular data has no JSON estimate");
    if (
      !Array.isArray(item) &&
      Object.getPrototypeOf(item) !== Object.prototype &&
      Object.getPrototypeOf(item) !== null
    )
      throw new Error("Non-plain objects have no JSON estimate");
    if (Object.getOwnPropertySymbols(item).length)
      throw new Error("Symbol properties have no JSON estimate");
    ancestors.add(item);
    for (const child of Array.isArray(item) ? item : Object.values(item))
      validate(child);
    ancestors.delete(item);
  }
  try {
    validate(value);
    const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
    return { method: "json-utf8", bytes, reason: null };
  } catch {
    return {
      method: "json-utf8",
      bytes: null,
      reason:
        "Value is unsupported, circular, or could not be serialized as plain JSON",
    };
  }
}

export const estimateBytes = (value: unknown): number | null =>
  estimateJsonBytes(value).bytes;

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
