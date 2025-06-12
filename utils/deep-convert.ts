export type DeepConvert<Structure, FROM, TO> = FROM extends Structure
  ? TO
  : Structure extends Record<string, unknown>
    ? { [K in keyof Structure]: DeepConvert<Structure[K], FROM, TO> }
    : Structure extends Array<unknown>
      ? Array<DeepConvert<Structure[number], FROM, TO>>
      : Structure;

export type ApplyDeepConverts<Initial, Transformers extends [any, any][]> =
  Transformers extends [infer First, ...infer Rest]
    ? First extends [infer From, infer To]
      ? Rest extends [any, any][]
        ? ApplyDeepConverts<DeepConvert<Initial, From, To>, Rest>
        : never
      : never
    : Initial;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && !Array.isArray(v) && v !== null;
}

function isArray(v: unknown): v is Array<unknown> {
  return typeof v === 'object' && Array.isArray(v);
}

export function deepConvert<T, FROM, TO>(value: T, shouldConvert: (v: unknown) => v is FROM, converter: (value: FROM, path: unknown[]) => TO, path: unknown[] = []): DeepConvert<T, FROM, TO> {
  if (shouldConvert(value)) {
    return converter(value, path) as DeepConvert<T, FROM, TO>;
  }else if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const key in value) {
      result[key] = deepConvert(value[key], shouldConvert, converter, [...path, value, key]);
    }
    return result as DeepConvert<T, FROM, TO>;
  } else if (isArray(value)) {
    return value.map((v, index) => deepConvert(v, shouldConvert, converter, [...path, value, index])) as DeepConvert<T, FROM, TO>;
  }
  return value as DeepConvert<T, FROM, TO>;
}
