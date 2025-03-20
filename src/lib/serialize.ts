export interface Serializable {
  serialize: () => string;
}

// Only support string keys for now, don't really need arbitrary types yet
// Optional callback is for serializing complex values before applying 
// JSON.stringify, in case the value is a Map or Set
export function serializeMap<V>(map: Map<string, V>): string {
  return JSON.stringify(
    Object.fromEntries(map.entries())
  );
}

export function deserializeMap<V>(str: string): Map<string, V> {
  return new Map<string, V>(
    Object.entries(JSON.parse(str))
  );
}

export function serializeSet<T>(obj: Set<T>): string {
  return JSON.stringify(
    Array.from(obj)
  );
}

export function deserializeSet<T>(str: string): Set<T> {
  return new Set<T>(
    JSON.parse(str)
  );
} 
