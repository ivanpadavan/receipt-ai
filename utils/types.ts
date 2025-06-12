export type AllStringKeysDeep<T> = T extends object
  ? {
    [K in keyof T]: K extends string
      ? K |
      (T[K] extends readonly (infer U)[] ? AllStringKeysDeep<U> :
        T[K] extends (infer U)[] ? AllStringKeysDeep<U> :
          AllStringKeysDeep<T[K]>)
      : never
  }[keyof T]
  : never;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/*
type From = [{a: string}, {b: number}];
type Append<T> = T & {add: () => void };
type MappedAsTuple = Pick<{ [K in keyof From]: Append<From[K]> }, keyof From & `${number}`>
type MappedAsUnion = { [K in keyof From]: Append<From[K]> }[keyof From & `${number}`];
 */
